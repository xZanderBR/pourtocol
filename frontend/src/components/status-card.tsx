import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusIndicator } from "@/components/status-indicator";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@/types/api";

interface StatusCardProps {
  status: SystemStatus;
}



function StatusRow({
  label,
  value,
  indicator,
  valueClassName,
}: {
  label: string;
  value: string;
  indicator?: "online" | "offline" | "busy";
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-foreground">{label}</span>
      <span className={cn("flex items-center gap-2 text-sm text-muted-foreground tabular-nums", valueClassName)}>
        {indicator && <StatusIndicator status={indicator} />}
        {value}
      </span>
    </div>
  );
}

export function StatusCard({ status }: StatusCardProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const espState = status.esp_status.state;
  const isPouring = espState === "pouring" || status.is_pouring;

  const machineStateLabel = espState.toUpperCase();
  const machineIndicator = isPouring ? "busy" : espState === "idle" ? "online" : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          System Status
        </CardTitle>
        <div className="flex items-center gap-2 tabular-nums">
          <span className="text-[0.85rem] font-bold tracking-tight text-white dark:text-primary">
            {time.toLocaleTimeString("en-US", {
              hour12: true,
              timeZone: "America/Los_Angeles"
            })}
          </span>
          <span className="text-[0.55rem] font-bold uppercase tracking-tight opacity-40">
            PST
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-0 rounded-lg bg-muted/30 px-4">
        <StatusRow
          label="Connectivity"
          value={status.esp_online ? "Online" : "Offline"}
          indicator={status.esp_online ? "online" : "offline"}
          valueClassName={!status.esp_online ? "text-destructive font-medium" : undefined}
        />
        <Separator className="opacity-10" />
        <StatusRow
          label="Glass Sensor"
          value={status.esp_status.glass_present ? "Detected" : "Empty"}
          indicator={status.esp_status.glass_present ? "online" : "offline"}
        />
        <Separator className="opacity-10" />
        <StatusRow
          label="Machine State"
          value={machineStateLabel}
          indicator={machineIndicator}
          valueClassName={isPouring ? "text-primary font-bold animate-pulse" : undefined}
        />
      </CardContent>
    </Card >
  );
}
