import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LeaderboardEntry } from "@/types/api";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const RANK_STYLES: Record<number, { label: string; className: string }> = {
  1: { label: "🥇", className: "text-yellow-400 font-bold" },
  2: { label: "🥈", className: "text-slate-300 font-bold" },
  3: { label: "🥉", className: "text-amber-600 font-bold" },
};

function RankCell({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank];
  if (style) {
    return <span className={`text-base leading-none ${style.className}`}>{style.label}</span>;
  }
  return (
    <span className="w-5 text-center text-xs font-medium text-muted-foreground">{rank}</span>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex w-7 items-center justify-center">
        <RankCell rank={rank} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.user_token}</p>
        <p className="text-xs text-muted-foreground">
          {entry.pour_count} {entry.pour_count === 1 ? "pour" : "pours"}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-primary">
          {entry.total_ml}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">ml</span>
        </p>
      </div>
    </div>
  );
}

export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" />
          Leaderboard
        </CardTitle>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No pours yet — be first!
          </p>
        ) : (
          <ScrollArea className="max-h-72 overflow-hidden">
            <div className="space-y-0">
              {entries.map((entry, i) => (
                <div key={entry.user_token}>
                  <LeaderboardRow entry={entry} rank={i + 1} />
                  {i < entries.length - 1 && <Separator className="opacity-10" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
