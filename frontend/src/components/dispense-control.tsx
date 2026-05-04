import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { registerUser } from "@/lib/api";
import { MAX_DISPENSE_ML, VOLUME_PRESETS } from "@/lib/constants";
import type { DispenseState } from "@/hooks/use-dispense";
import type { SystemStatus } from "@/types/api";
import { GlassWater } from "lucide-react";

interface DispenseControlProps {
  status: SystemStatus;
  dispenseState: DispenseState;
  errorMessage: string | null;
  onDispense: (amountMl: number, userToken: string) => void;
  onAliasSaved?: () => void;
  onAliasError?: (message: string) => void;
}

export function DispenseControl({
  status,
  dispenseState,
  errorMessage,
  onDispense,
  onAliasSaved,
  onAliasError,
}: DispenseControlProps) {
  const [selectedPreset, setSelectedPreset] = useState(1); // Default to 30ml
  const [customMl, setCustomMl] = useState("");
  const [userToken, setUserToken] = useState("");
  const [unmappedUid, setUnmappedUid] = useState<string | null>(null);
  const [savingAlias, setSavingAlias] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  // React to a new NFC tap: fill input with friendly name if known,
  // otherwise blank the input and surface the register-alias banner.
  const prevNfcUid = useRef<string | undefined>(undefined);
  useEffect(() => {
    const uid = status.esp_status.nfc_uid;
    const name = status.esp_status.nfc_name;
    if (uid && uid !== prevNfcUid.current) {
      if (name) {
        setUserToken(name);
        setUnmappedUid(null);
      } else {
        setUserToken("");
        setUnmappedUid(uid);
        // Focus the input so the user can type a name immediately
        requestAnimationFrame(() => tokenRef.current?.focus());
      }
    }
    prevNfcUid.current = uid;
  }, [status.esp_status.nfc_uid, status.esp_status.nfc_name]);

  const handleSaveAlias = useCallback(async () => {
    const name = userToken.trim();
    if (!unmappedUid || !name) return;
    setSavingAlias(true);
    try {
      await registerUser(unmappedUid, name);
      setUnmappedUid(null);
      onAliasSaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save alias";
      onAliasError?.(message);
    } finally {
      setSavingAlias(false);
    }
  }, [unmappedUid, userToken, onAliasSaved, onAliasError]);

  const activeAmount = customMl ? parseInt(customMl, 10) || 0 : VOLUME_PRESETS[selectedPreset].ml;
  const isOverLimit = activeAmount > MAX_DISPENSE_ML;

  const isPouring = status.esp_status.state === "pouring";
  const isReady =
    status.esp_online &&
    status.esp_status.glass_present &&
    status.esp_status.state === "idle" &&
    activeAmount > 0 &&
    !isOverLimit &&
    dispenseState === "idle";

  const handlePresetClick = useCallback((index: number) => {
    setSelectedPreset(index);
    setCustomMl("");
  }, []);

  const handleCustomChange = useCallback((value: string) => {
    setCustomMl(value);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!isReady) return;
      const token = userToken.trim() || "Guest";
      onDispense(activeAmount, token);
      setUserToken("");
    },
    [isReady, activeAmount, userToken, onDispense],
  );

  // Button label logic
  function getButtonLabel(): string {
    if (dispenseState === "requesting") return "REQUESTING...";
    if (dispenseState === "error") return errorMessage ? `ERROR: ${errorMessage}` : "ERROR";
    if (!status.esp_online) return "SYSTEM OFFLINE";
    if (isPouring) return "DISPENSING...";
    if (!status.esp_status.glass_present) return "PLACE GLASS";
    if (isOverLimit) return "EXCESS VOLUME";
    return "DISPENSE BEVERAGE";
  }

  const isErrorButton = dispenseState === "error" || !status.esp_online || isOverLimit;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dispense Control
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User Token Input */}
          <div className="space-y-2">
            <Input
              ref={tokenRef}
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              placeholder={unmappedUid ? "Enter a name for this tag…" : "Tap NFC tag or enter a name"}
              autoComplete="off"
            />

            {/* Register-alias banner: shown when an unrecognized NFC tag is on the reader */}
            {unmappedUid && (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs">
                <p className="mb-2 text-muted-foreground">
                  New tag <span className="font-mono text-foreground">{unmappedUid}</span> — name it above to remember it next time.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveAlias}
                    disabled={savingAlias || !userToken.trim()}
                  >
                    {savingAlias ? "Saving…" : "Save alias"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setUnmappedUid(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Volume Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Volume Selection</Label>

            {/* Segmented Control */}
            <div className="relative flex rounded-lg bg-muted p-1">
              {/* Sliding highlight */}
              <div
                className={cn(
                  "absolute top-1 left-1 h-[calc(100%-0.5rem)] rounded-md bg-primary shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.1)]",
                  customMl && "opacity-40",
                )}
                style={{
                  width: `calc(${100 / VOLUME_PRESETS.length}% - 0.25rem)`,
                  transform: `translateX(${selectedPreset * 100}%)`,
                }}
              />

              {VOLUME_PRESETS.map((preset, i) => (
                <button
                  key={preset.ml}
                  type="button"
                  onClick={() => handlePresetClick(i)}
                  className={cn(
                    "relative z-10 flex flex-1 flex-col items-center rounded-md py-2 text-sm font-medium transition-colors",
                    selectedPreset === i && !customMl
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                  <span className="text-[0.65rem] font-normal opacity-70">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Volume Input */}
            <div className="relative flex items-center rounded-lg bg-muted shadow-inner">
              <Input
                type="number"
                inputMode="numeric"
                value={customMl}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Custom Volume"
                className="border-0 bg-transparent pr-12 shadow-none focus-visible:ring-0"
                min={1}
                max={MAX_DISPENSE_ML}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/70">
                ML
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isReady}
            size="lg"
            className={cn(
              "w-full text-sm font-bold uppercase tracking-wider transition-all duration-300",
              isErrorButton && "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
              !status.esp_online && "opacity-60 grayscale cursor-not-allowed",
              (isPouring || dispenseState === "requesting") && "animate-pulse shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] bg-primary border border-primary/50 text-primary-foreground",
            )}
          >
            <GlassWater className={cn("mr-2 size-4", isPouring && "animate-bounce")} />
            {getButtonLabel()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
