"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { bossForRound } from "@/lib/fuda/engine";
import { ScoringDisplay } from "./ScoringDisplay";
import { WordCard } from "./WordCard";
import type { RunState } from "@/types/fuda";

/** 刻限ボスの残り時間表示（純粋に表示だけ。締切の判定は useFudaGame のタイマー） */
function Deadline({ deadlineAt }: { deadlineAt: number }) {
  const [leftMs, setLeftMs] = useState(() =>
    Math.max(0, deadlineAt - performance.now())
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setLeftMs(Math.max(0, deadlineAt - performance.now()));
    }, 100);
    return () => clearInterval(timer);
  }, [deadlineAt]);

  return (
    <p
      className={cn(
        "text-center font-mono font-bold",
        leftMs < 10_000 ? "text-red-400 animate-pulse" : "text-amber-300"
      )}
    >
      ⏳ {(leftMs / 1000).toFixed(1)}s
    </p>
  );
}

interface RoundBoardProps {
  run: RunState;
}

export function RoundBoard({ run }: RoundBoardProps) {
  const round = run.round;
  if (!round) return null;

  const boss = bossForRound(run);
  const masked = boss?.flags?.maskHand ?? false;
  const active = round.active;

  return (
    <div className="space-y-3">
      {round.deadlineAt !== null && <Deadline deadlineAt={round.deadlineAt} />}

      <ScoringDisplay run={run} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {round.hand.map((uid, index) => {
          const card = run.deck.find((c) => c.uid === uid);
          if (!card) return null;
          const isActive = active?.cardUid === uid;
          return (
            <WordCard
              key={uid}
              card={card}
              index={index}
              isActive={isActive}
              charProgress={isActive ? (active?.charProgress ?? 0) : 0}
              selected={round.selected.includes(index)}
              masked={masked}
              dimmed={active !== null && !isActive}
            />
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        <kbd className="px-1 py-0.5 rounded border border-border">1</kbd>〜
        <kbd className="px-1 py-0.5 rounded border border-border">8</kbd> 札を選択
        <kbd className="px-1 py-0.5 rounded border border-border">Backspace</kbd>{" "}
        選択札を引き直し
        <kbd className="px-1 py-0.5 rounded border border-border">Esc</kbd>{" "}
        {round.active ? "入力を放棄" : "中断"}
      </p>
    </div>
  );
}
