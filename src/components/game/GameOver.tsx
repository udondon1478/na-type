"use client";

import { calculateAccuracy } from "@/lib/input-engine";
import type { GameSnapshot } from "@/types/game";

interface GameOverProps {
  snapshot: GameSnapshot;
  onRetry: () => void;
  onBackToMenu: () => void;
}

export function GameOver({ snapshot, onRetry, onBackToMenu }: GameOverProps) {
  const accuracy = calculateAccuracy(
    snapshot.kanaTyped,
    snapshot.kanaTyped + snapshot.missCount
  );

  return (
    <div className="flex flex-col items-center justify-center h-[420px] md:h-[480px] rounded-lg border border-border bg-background/60 gap-6 px-4">
      <div className="text-center space-y-1">
        <p className="text-2xl font-bold text-destructive">結界崩壊…</p>
        {snapshot.isNewRecord && (
          <p className="text-sm font-bold text-amber-400 animate-pulse">
            🏆 自己ベスト更新！
          </p>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground font-mono">SCORE</p>
        <p className="text-4xl font-bold font-mono tabular-nums">
          {snapshot.score.toLocaleString()}
        </p>
      </div>

      <div className="flex gap-6 text-sm font-mono text-center">
        <div>
          <p className="text-muted-foreground text-xs">WAVE</p>
          <p className="text-lg font-bold">{snapshot.wave}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">かな入力数</p>
          <p className="text-lg font-bold">{snapshot.kanaTyped}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">最大コンボ</p>
          <p className="text-lg font-bold">{snapshot.maxCombo}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">正確率</p>
          <p className="text-lg font-bold">{accuracy}%</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          もう一度
          <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
        </button>
        <button
          onClick={onBackToMenu}
          className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          メニューへ
          <kbd className="ml-2 text-xs opacity-60">Esc</kbd>
        </button>
      </div>
    </div>
  );
}
