"use client";

import { cn } from "@/lib/utils";
import { stakeMod } from "@/lib/fuda/balance";
import { bossForRound } from "@/lib/fuda/engine";
import type { RunState } from "@/types/fuda";

const ROUND_LABELS = ["序戦", "破戦", "急戦"] as const;

interface FudaHudProps {
  run: RunState;
}

export function FudaHud({ run }: FudaHudProps) {
  const round = run.round;
  const boss = bossForRound(run);
  const progress =
    round && round.quota > 0
      ? Math.min(100, (round.scored / round.quota) * 100)
      : 0;
  const reached = round !== null && round.scored >= round.quota;

  return (
    <div className="space-y-1.5 font-mono text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            幕 <span className="text-foreground font-bold">{run.ante}</span>
            <span className="text-xs text-muted-foreground/60">/8</span>
          </span>
          {run.stake > 1 && (
            <span
              className="text-xs text-violet-400"
              title={stakeMod(run.stake).description}
            >
              {stakeMod(run.stake).name}
            </span>
          )}
          <span
            className={cn(
              "font-bold",
              run.roundIndex === 2 ? "text-rose-400" : "text-foreground"
            )}
          >
            {ROUND_LABELS[run.roundIndex]}
          </span>
          {boss && (
            <span
              className="text-xs text-rose-400 border border-rose-400/40 rounded px-1.5 py-0.5"
              title={boss.description}
            >
              {boss.icon} {boss.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {round && (
            <>
              <span className="text-muted-foreground">
                手数{" "}
                <span className="text-foreground font-bold tabular-nums">
                  {round.handsLeft}
                </span>
              </span>
              <span className="text-muted-foreground">
                引直{" "}
                <span className="text-foreground font-bold tabular-nums">
                  {round.discardsLeft}
                </span>
              </span>
            </>
          )}
          <span className="text-amber-400">
            {run.money}
            <span className="text-xs ml-0.5">文</span>
          </span>
        </div>
      </div>

      {round && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-[width] duration-300",
                reached ? "bg-emerald-400" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="tabular-nums text-xs text-muted-foreground shrink-0">
            <span
              className={cn(
                "font-bold text-sm",
                reached ? "text-emerald-400" : "text-foreground"
              )}
            >
              {round.scored.toLocaleString()}
            </span>{" "}
            / {round.quota.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
