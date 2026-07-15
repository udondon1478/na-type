"use client";

import { cn } from "@/lib/utils";
import { BALANCE } from "@/lib/fuda/balance";
import { CHARM_DEFS } from "@/lib/fuda/charms";
import type { RunState } from "@/types/fuda";

interface CharmShelfProps {
  run: RunState;
  /** ショップ画面でのみ渡す（売却ボタンを出す） */
  onSell?: (slot: number) => void;
}

/**
 * 所持お守りの棚（5枠）。発動した瞬間は fx（charmProc）に反応して光る。
 */
export function CharmShelf({ run, onSell }: CharmShelfProps) {
  const sealedIndex = run.round?.sealedCharmIndex ?? null;

  // slot ごとの最新 proc seq（key に使い、変わるたびに発光アニメが再生される）
  const procSeqBySlot = new Map<number, number>();
  for (const fx of run.fxQueue) {
    if (fx.kind === "charmProc") procSeqBySlot.set(fx.charmIndex, fx.seq);
  }

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: BALANCE.hand.charmSlots }, (_, slot) => {
        const charm = run.charms[slot];
        if (!charm) {
          return (
            <div
              key={`empty-${slot}`}
              className="h-9 w-9 rounded border border-dashed border-border/60"
              title="空きお守り枠"
            />
          );
        }
        const def = CHARM_DEFS[charm.id];
        const sealed = slot === sealedIndex;
        return (
          <div
            key={slot}
            title={`${def.name}: ${def.describe(charm.counter)}${sealed ? "（封印中）" : ""}`}
            className={cn(
              "relative h-9 rounded border border-border bg-card px-1.5 flex items-center gap-1 font-mono text-sm",
              sealed && "opacity-40 grayscale"
            )}
          >
            <span key={procSeqBySlot.get(slot) ?? -1} className="fuda-charm-proc text-base">
              {def.icon}
            </span>
            {charm.counter > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {charm.counter}
              </span>
            )}
            {sealed && (
              <span className="absolute -top-1.5 -right-1.5 text-xs">⛓️</span>
            )}
            {onSell && (
              <button
                onClick={() => onSell(slot)}
                className="ml-0.5 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                title={`売却 +${Math.max(1, Math.floor(def.price * BALANCE.economy.sellRatio))}文`}
              >
                売
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
