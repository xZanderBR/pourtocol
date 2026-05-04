import { useCallback } from "react";
import { Toaster, toast } from "sonner";
import { GlassWater, ScrollText, Trophy } from "lucide-react";

import { StatusCard } from "@/components/status-card";
import { DispenseControl } from "@/components/dispense-control";
import { ActivityLog } from "@/components/activity-log";
import { Leaderboard } from "@/components/leaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStatus } from "@/hooks/use-status";
import { useLogs } from "@/hooks/use-logs";
import { useDispense } from "@/hooks/use-dispense";
import { useLeaderboard } from "@/hooks/use-leaderboard";

export default function App() {
  const { status, refresh: refreshStatus } = useStatus();
  const { logs, refresh: refreshLogs } = useLogs(status.esp_online);
  const { entries, refresh: refreshLeaderboard } = useLeaderboard();

  const handleSuccess = useCallback(() => {
    toast.success("Dispense started");
    refreshStatus();
    refreshLogs();
    refreshLeaderboard();
  }, [refreshStatus, refreshLogs, refreshLeaderboard]);

  const handleError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const { dispenseState, errorMessage, dispense } = useDispense({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[80vh] w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/15 via-primary/5 to-transparent" />
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 py-8 pb-12">
        {/* Header */}
        <header className="flex flex-col items-center justify-center text-center drop-shadow-sm">
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] dark:text-primary">
            Pourtocol
          </h1>
          <p className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">
            Liquid Dispenser
          </p>
        </header>

        {/* Status */}
        <StatusCard status={status} />

        {/* Tabbed content */}
        <Tabs defaultValue="pour">
          <TabsList>
            <TabsTrigger value="pour">
              <GlassWater className="h-4 w-4" />
              Pour
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="log">
              <ScrollText className="h-4 w-4" />
              Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pour">
            <DispenseControl
              status={status}
              dispenseState={dispenseState}
              errorMessage={errorMessage}
              onDispense={dispense}
            />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard entries={entries} />
          </TabsContent>

          <TabsContent value="log">
            <ActivityLog logs={logs} />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}
