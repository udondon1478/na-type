"use client";

import { BALANCE } from "@/lib/fuda/balance";
import type { RunState } from "@/types/fuda";

const ROUND_LABELS = ["序戦", "破戦", "急戦"] as const;

interface FudaMenuProps {
  level: number;
  onLevelChange: (level: number) => void;
  wordPoolSize: number;
  /** 途中セーブがあれば渡す（「続きから」を表示） */
  savedRun: RunState | null;
  onStart: () => void;
  onContinue: () => void;
}

/** 開始に必要な最低語数（手札1周分は欲しい） */
export const MIN_POOL_SIZE = BALANCE.hand.size;

export function FudaMenu({
  level,
  onLevelChange,
  wordPoolSize,
  savedRun,
  onStart,
  onContinue,
}: FudaMenuProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] md:min-h-[480px] rounded-lg border border-border bg-background/60 gap-6 px-4 py-8">
      <div className="text-center space-y-2">
        <p className="text-3xl font-bold font-mono tracking-widest">言霊札</p>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          単語札を打ち切って点を稼ぎ、幕ごとに上がるノルマを越えろ。
          札の最初のかなを打つと入力開始。濁点・シフト・チョードなどの
          「属性」と「役」を狙えばスコアは爆発する。
          全8幕、3勝負目のボスはルールを歪めてくる。
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

      {wordPoolSize < MIN_POOL_SIZE && (
        <p className="text-xs text-red-400">
          この範囲は語数が足りません（{MIN_POOL_SIZE}語以上必要）
        </p>
      )}

      <div className="flex items-center gap-3">
        {savedRun && (
          <button
            onClick={onContinue}
            className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            続きから（幕{savedRun.ante} {ROUND_LABELS[savedRun.roundIndex]}）
            <kbd className="ml-2 text-xs opacity-60">Space</kbd>
          </button>
        )}
        <button
          onClick={onStart}
          disabled={wordPoolSize < MIN_POOL_SIZE}
          className={
            savedRun
              ? "px-6 py-2.5 rounded-md border border-border text-sm font-bold hover:bg-accent transition-colors disabled:opacity-50"
              : "px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          }
        >
          {savedRun ? "新しくランを開始" : "ランを開始"}
          {!savedRun && <kbd className="ml-2 text-xs opacity-60">Space</kbd>}
        </button>
      </div>
    </div>
  );
}
