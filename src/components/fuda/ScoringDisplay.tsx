"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CHARM_DEFS } from "@/lib/fuda/charms";
import {
  playCharm,
  playGlassBreak,
  playMiss,
  playUnit,
  playWordScore,
  playYaku,
} from "@/lib/fuda/sfx";
import { ATTR_META } from "./attrMeta";
import type { FxEvent, RunState } from "@/types/fuda";

/** 直近の演出イベントだけを描画する（それ以前は CSS アニメーションで消えている） */
const VISIBLE_FX = 8;

interface ScoringDisplayProps {
  run: RunState;
}

function fxView(fx: FxEvent): { text: string; className: string } | null {
  switch (fx.kind) {
    case "unitChip":
      return {
        text: `+${fx.chips}`,
        className: ATTR_META[fx.attr].text,
      };
    case "charmProc":
      return {
        text: `${CHARM_DEFS[fx.charmId].icon}${fx.label}`,
        className: "text-sky-300",
      };
    case "charmBreak":
      return {
        text: `${CHARM_DEFS[fx.charmId].icon}💔`,
        className: "text-red-400 font-bold",
      };
    case "yaku":
      return {
        text: `役「${fx.name}」${fx.mult > 0 ? ` ×${fx.mult}` : ""}${fx.chips > 0 ? ` +${fx.chips}` : ""}`,
        className: "text-rose-300 font-bold",
      };
    case "wordScore":
      return {
        text: `${fx.total.toLocaleString()}点`,
        className: "text-emerald-300 font-bold text-lg",
      };
    case "miss":
      return { text: "ミス", className: "text-red-400" };
    default:
      return null;
  }
}

export function ScoringDisplay({ run }: ScoringDisplayProps) {
  const round = run.round;
  const active = round?.active ?? null;
  const card = active
    ? run.deck.find((c) => c.uid === active.cardUid) ?? null
    : null;

  const pops = run.fxQueue.slice(-VISIBLE_FX);

  // 効果音: 新しい fx をカーソル以降だけ再生する（連続正解はピッチが上がる）
  const soundCursorRef = useRef(0);
  const streakRef = useRef(0);
  useEffect(() => {
    const queue = run.fxQueue;
    if (queue.length === 0) return;
    const fresh = queue.filter((fx) => fx.seq > soundCursorRef.current);
    if (fresh.length === 0) return;
    soundCursorRef.current = queue[queue.length - 1].seq;
    fresh.forEach((fx, i) => {
      const delay = Math.min(i * 0.06, 0.42);
      switch (fx.kind) {
        case "unitChip":
          streakRef.current += 1;
          playUnit(fx.attr, streakRef.current, delay);
          break;
        case "miss":
          streakRef.current = 0;
          playMiss(delay);
          break;
        case "yaku":
          playYaku(delay);
          break;
        case "charmProc":
          playCharm(delay);
          break;
        case "charmBreak":
          playGlassBreak(delay);
          break;
        case "wordScore":
          playWordScore(delay);
          break;
      }
    });
  }, [run.fxQueue]);

  return (
    <div className="rounded-lg border border-border bg-background/60 px-4 py-3 min-h-[7.5rem] flex flex-col justify-between">
      {/* 入力中の単語 */}
      <div className="text-center">
        {card && active ? (
          <p className="font-mono text-3xl tracking-[0.2em]">
            {[...card.word].map((char, i) => (
              <span
                key={i}
                className={cn(
                  i < active.charProgress
                    ? "text-primary"
                    : i === active.charProgress
                      ? "text-foreground underline underline-offset-8"
                      : "text-muted-foreground/60"
                )}
              >
                {char}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground pt-2.5">
            打ちたい札の最初のかなを打つと入力開始
          </p>
        )}
      </div>

      {/* チップと演出ポップ */}
      <div className="flex items-end justify-between gap-4">
        <p className="font-mono text-amber-300">
          <span className="text-xs text-muted-foreground mr-1.5">チップ</span>
          <span className="text-2xl font-bold tabular-nums">
            {active?.chipsSoFar ?? 0}
          </span>
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end font-mono text-sm min-h-[1.5rem]">
          {pops.map((fx) => {
            const view = fxView(fx);
            if (!view) return null;
            return (
              <span key={fx.seq} className={cn("fuda-pop", view.className)}>
                {view.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
