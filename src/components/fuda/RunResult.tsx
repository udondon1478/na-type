"use client";

import type { AchievementDef } from "@/lib/fuda/unlocks";
import { YAKU_DEFS } from "@/lib/fuda/yaku";
import { ROUND_LABELS } from "@/lib/fuda/constants";
import type { RunState, YakuId } from "@/types/fuda";

interface RunResultProps {
  run: RunState;
  /** このランで新規解放された実績 */
  newUnlocks: AchievementDef[];
  onRetry: () => void;
  onBackToMenu: () => void;
}

export function RunResult({
  run,
  newUnlocks,
  onRetry,
  onBackToMenu,
}: RunResultProps) {
  const cleared = run.phase === "runClear";
  const stats = run.stats;
  const accuracy =
    stats.kanaTyped + stats.missCount > 0
      ? (stats.kanaTyped / (stats.kanaTyped + stats.missCount)) * 100
      : 100;
  const topYaku = (Object.entries(stats.yakuCounts) as [YakuId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] md:min-h-[480px] rounded-lg border border-border bg-background/60 gap-6 px-4 py-8">
      <div className="text-center space-y-2">
        <p
          className={
            cleared
              ? "text-3xl font-bold font-mono tracking-widest text-emerald-400"
              : "text-3xl font-bold font-mono tracking-widest text-red-400"
          }
        >
          {cleared ? "全幕制覇！" : "討ち死に……"}
        </p>
        <p className="text-sm text-muted-foreground font-mono">
          到達: 幕 {run.ante} {ROUND_LABELS[run.roundIndex]}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 font-mono text-center">
        <div>
          <p className="text-xs text-muted-foreground">打ち切った語</p>
          <p className="text-lg font-bold tabular-nums">{stats.wordsCompleted}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">打鍵かな</p>
          <p className="text-lg font-bold tabular-nums">{stats.kanaTyped}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">正確率</p>
          <p className="text-lg font-bold tabular-nums">{accuracy.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">最高単語スコア</p>
          <p className="text-lg font-bold tabular-nums text-amber-400">
            {stats.bestWordScore.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">最長ノーミス連続</p>
          <p className="text-lg font-bold tabular-nums">
            {stats.maxNoMissStreak}語
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">所持文銭</p>
          <p className="text-lg font-bold tabular-nums text-amber-400">
            {run.money}文
          </p>
        </div>
      </div>

      {topYaku.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1.5">よく出た役</p>
          <div className="flex gap-2 justify-center flex-wrap font-mono text-sm">
            {topYaku.map(([id, count]) => (
              <span
                key={id}
                className="rounded border border-border bg-card px-2 py-0.5"
              >
                {YAKU_DEFS[id].name} ×{count}
              </span>
            ))}
          </div>
        </div>
      )}

      {newUnlocks.length > 0 && (
        <div className="text-center space-y-1.5">
          <p className="text-xs font-bold text-amber-400 animate-pulse">
            ✨ 実績解放！
          </p>
          <div className="flex gap-2 justify-center flex-wrap text-sm">
            {newUnlocks.map((def) => (
              <span
                key={def.id}
                title={def.description}
                className="rounded border border-amber-400/50 bg-amber-400/10 px-2.5 py-1"
              >
                <span className="font-bold">{def.name}</span>
                {def.rewardCharm && (
                  <span className="text-xs text-muted-foreground ml-1.5">
                    お守り解放
                  </span>
                )}
                {def.rewardSchool && (
                  <span className="text-xs text-muted-foreground ml-1.5">
                    流派解放
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          もう一度
          <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
        </button>
        <button
          onClick={onBackToMenu}
          className="px-6 py-2.5 rounded-md border border-border text-sm font-bold hover:bg-accent transition-colors"
        >
          メニューへ
          <kbd className="ml-2 text-xs opacity-60">Esc</kbd>
        </button>
      </div>
    </div>
  );
}
