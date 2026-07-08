"use client";

import type { RunState } from "@/types/fuda";

interface RoundResultProps {
  run: RunState;
  onConfirm: () => void;
}

export function RoundResult({ run, onConfirm }: RoundResultProps) {
  const round = run.round;
  if (!round) return null;
  const won = round.scored >= round.quota;
  const reward = run.roundReward;

  return (
    <div className="flex flex-col items-center justify-center h-[380px] md:h-[440px] rounded-lg border border-border bg-background/60 gap-6 px-4">
      <p
        className={
          won
            ? "text-3xl font-bold font-mono tracking-widest text-emerald-400"
            : "text-3xl font-bold font-mono tracking-widest text-red-400"
        }
      >
        {won ? "勝負あり！" : "ノルマ未達……"}
      </p>

      <p className="font-mono text-sm text-muted-foreground">
        <span className="text-foreground font-bold text-lg tabular-nums">
          {round.scored.toLocaleString()}
        </span>{" "}
        / {round.quota.toLocaleString()}
      </p>

      {won && reward && (
        <div className="w-full max-w-xs space-y-1.5 font-mono text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>基本報酬</span>
            <span className="text-amber-400 tabular-nums">+{reward.base}文</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>残り手数ボーナス</span>
            <span className="text-amber-400 tabular-nums">
              +{reward.remainingHands}文
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>利子</span>
            <span className="text-amber-400 tabular-nums">
              +{reward.interest}文
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-bold">
            <span>計</span>
            <span className="text-amber-400 tabular-nums">
              +{reward.total}文
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onConfirm}
        className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
      >
        {won ? "次へ" : "結果へ"}
        <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
      </button>
    </div>
  );
}
