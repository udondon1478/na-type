"use client";

import { cn } from "@/lib/utils";
import { ATTR_META } from "./attrMeta";
import type { WordCardData } from "@/types/fuda";

interface WordCardProps {
  card: WordCardData;
  /** 手札内の位置（0始まり）。数字キーのガイド表示に使う */
  index: number;
  isActive: boolean;
  /** isActive のときの確定済み文字数 */
  charProgress: number;
  selected: boolean;
  /** 霞ボス: 次に打つかな以外を伏せ字にする */
  masked: boolean;
  /** 入力中の他の札がある（打てない状態） */
  dimmed: boolean;
}

export function WordCard({
  card,
  index,
  isActive,
  charProgress,
  selected,
  masked,
  dimmed,
}: WordCardProps) {
  const chars = [...card.word];

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card px-3 py-2.5 transition-all select-none",
        isActive
          ? "border-primary shadow-[0_0_12px_rgba(255,255,255,0.15)] -translate-y-1"
          : "border-border",
        selected && !isActive && "border-amber-400/70 -translate-y-1",
        dimmed && "opacity-40"
      )}
    >
      <span className="absolute top-1 left-1.5 text-[10px] font-mono text-muted-foreground/60">
        {index + 1}
      </span>

      <p className="text-center font-mono text-lg tracking-wide leading-relaxed pt-1">
        {chars.map((char, i) => {
          // 霞: 確定済みと「次に打つ1文字」以外は伏せ字（未入力の札は先頭のみ見える）
          const visible = !masked || i < charProgress || i === charProgress;
          const shown = visible ? char : "●";
          return (
            <span
              key={i}
              className={cn(
                isActive && i < charProgress && "text-primary",
                isActive && i === charProgress && "underline underline-offset-4",
                !visible && "text-muted-foreground/50"
              )}
            >
              {shown}
            </span>
          );
        })}
      </p>

      <div className="flex items-center justify-center gap-1 mt-1.5">
        {card.attrs.map((attr, i) => (
          <span
            key={i}
            title={ATTR_META[attr].label}
            className={cn("h-1.5 w-1.5 rounded-full", ATTR_META[attr].dot)}
          />
        ))}
        <span className="ml-1 text-[10px] font-mono text-muted-foreground">
          {chars.length}
        </span>
      </div>
    </div>
  );
}
