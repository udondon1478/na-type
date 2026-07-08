"use client";

import { cn } from "@/lib/utils";
import { BALANCE } from "@/lib/fuda/balance";
import { bossForRound, roundConfigFor } from "@/lib/fuda/engine";
import type { RunState } from "@/types/fuda";

const ROUND_LABELS = ["序戦", "破戦", "急戦"] as const;

interface RoundIntroProps {
  run: RunState;
  onBegin: () => void;
}

export function RoundIntro({ run, onBegin }: RoundIntroProps) {
  const config = roundConfigFor(run);
  const boss = bossForRound(run);
  const isBossRound = run.roundIndex === 2;

  return (
    <div className="flex flex-col items-center justify-center h-[380px] md:h-[440px] rounded-lg border border-border bg-background/60 gap-6 px-4">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground font-mono">幕 {run.ante} / 8</p>
        <p
          className={cn(
            "text-3xl font-bold font-mono tracking-widest",
            isBossRound ? "text-rose-400" : "text-foreground"
          )}
        >
          {ROUND_LABELS[run.roundIndex]}
        </p>
      </div>

      {boss && (
        <div className="text-center rounded-lg border border-rose-400/40 bg-rose-400/5 px-5 py-3 max-w-sm">
          <p className="font-bold text-rose-400">
            {boss.icon} {boss.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{boss.description}</p>
        </div>
      )}

      <div className="text-center space-y-1 font-mono">
        <p className="text-xs text-muted-foreground">ノルマ</p>
        <p className="text-4xl font-bold tabular-nums">
          {config.quota.toLocaleString()}
        </p>
      </div>

      <div className="flex gap-6 text-sm font-mono text-center text-muted-foreground">
        <div>
          <p className="text-xs">手数</p>
          <p className="text-lg font-bold text-foreground">{config.hands}</p>
        </div>
        <div>
          <p className="text-xs">引き直し</p>
          <p className="text-lg font-bold text-foreground">{config.discards}</p>
        </div>
        <div>
          <p className="text-xs">クリア報酬</p>
          <p className="text-lg font-bold text-amber-400">
            {BALANCE.economy.roundReward[run.roundIndex]}文〜
          </p>
        </div>
      </div>

      <button
        onClick={onBegin}
        className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
      >
        勝負開始
        <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
      </button>
    </div>
  );
}
