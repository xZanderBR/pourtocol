import { useCallback, useState } from "react";

import { sendDispense } from "@/lib/api";
import { FEEDBACK_DURATION_MS } from "@/lib/constants";

export type DispenseState = "idle" | "requesting" | "error";

interface UseDispenseOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

/**
 *  idle → requesting → idle    (pouring is reflected via ESP status, not local state)
 *  idle → requesting → error → idle
 */
export function useDispense({ onSuccess, onError }: UseDispenseOptions = {}) {
  const [dispenseState, setDispenseState] = useState<DispenseState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dispense = useCallback(
    async (amountMl: number, userToken: string) => {
      setDispenseState("requesting");
      setErrorMessage(null);

      try {
        const result = await sendDispense({
          amount_ml: amountMl,
          user_token: userToken,
        });

        if (result.success) {
          setDispenseState("idle");
          onSuccess?.();
        } else {
          throw new Error(result.reason ?? "Dispense failed");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDispenseState("error");
        setErrorMessage(message);
        onError?.(message);

        setTimeout(() => {
          setDispenseState("idle");
          setErrorMessage(null);
        }, FEEDBACK_DURATION_MS);
      }
    },
    [onSuccess, onError],
  );

  return { dispenseState, errorMessage, dispense } as const;
}
