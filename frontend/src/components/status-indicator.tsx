import { cn } from "@/lib/utils";

type IndicatorStatus = "online" | "offline" | "busy";

interface StatusIndicatorProps {
  status: IndicatorStatus;
  className?: string;
}

const statusStyles: Record<IndicatorStatus, string> = {
  online: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
  busy: "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]",
  offline: "bg-muted-foreground/40",
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-200",
        statusStyles[status],
        className,
      )}
      aria-label={status}
    />
  );
}
