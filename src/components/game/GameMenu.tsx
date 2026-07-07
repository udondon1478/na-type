"use client";

import type { GameRecord } from "@/types/game";

interface GameMenuProps {
  level: number;
  onLevelChange: (level: number) => void;
  record?: GameRecord;
  wordPoolSize: number;
  onStart: () => void;
}

export function GameMenu({
  level,
  onLevelChange,
  record,
  wordPoolSize,
  onStart,
}: GameMenuProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[420px] md:h-[480px] rounded-lg border border-border bg-background/60 gap-6 px-4">
      <div className="text-center space-y-2">
        <p className="text-3xl font-bold font-mono tracking-widest">
          言霊ディフェンス
        </p>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          降ってくる言霊の単語を打ち切って撃破せよ。
          最初のかなで狙う敵が決まる。結界を破られるとHPが減り、0で終了。
          ウェーブを越えるたびに強化を選べる。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">単語の範囲:</label>
        <select
          value={level}
          onChange={(e) => onLevelChange(parseInt(e.target.value, 10))}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              レッスン {n} まで
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{wordPoolSize}語</span>
      </div>

      {record && (
        <div className="flex gap-6 text-sm font-mono text-center">
          <div>
            <p className="text-muted-foreground text-xs">ハイスコア</p>
            <p className="text-lg font-bold text-amber-400 tabular-nums">
              {record.highScore.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">最高ウェーブ</p>
            <p className="text-lg font-bold">{record.bestWave}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">プレイ回数</p>
            <p className="text-lg font-bold">{record.totalRuns}</p>
          </div>
        </div>
      )}

      <button
        onClick={onStart}
        disabled={wordPoolSize === 0}
        className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        ゲーム開始
        <kbd className="ml-2 text-xs opacity-60">Space</kbd>
      </button>
    </div>
  );
}
