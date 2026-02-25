import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LogEntry } from "@/types/api";

interface ActivityLogProps {
  logs: LogEntry[];
}

function formatLogTime(timestamp: number): string {
  // Backend stores ISO datetime strings that get parsed as epoch seconds
  const date = new Date(
    typeof timestamp === "number" ? timestamp * 1000 : timestamp,
  );
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const statusVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  started: "default",
  completed: "default",
  failed: "destructive",
};

function LogRow({ log }: { log: LogEntry }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{log.user_token}</span>
        <span className="text-xs text-muted-foreground">
          {formatLogTime(log.timestamp)} &middot; {log.amount_ml}ml
        </span>
      </div>
      <Badge variant={statusVariant[log.status] ?? "secondary"} className="text-[0.65rem] uppercase">
        {log.status}
      </Badge>
    </div>
  );
}

export function ActivityLog({ logs }: ActivityLogProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity Log
        </CardTitle>
      </CardHeader>

      <CardContent>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent activity
          </p>
        ) : (
          <ScrollArea className="max-h-60 overflow-hidden">
            <div className="space-y-0">
              {logs.map((log, i) => (
                <div key={`${log.timestamp}-${log.user_token}-${i}`}>
                  <LogRow log={log} />
                  {i < logs.length - 1 && <Separator className="opacity-10" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
