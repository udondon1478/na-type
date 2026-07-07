"use client";

import { UPGRADE_DEFS, effects } from "@/lib/game/upgrades";
import { cn } from "@/lib/utils";
import type { GameSnapshot, UpgradeId } from "@/types/game";

interface GameHudProps {
  snapshot: GameSnapshot;
}

export function GameHud({ snapshot }: GameHudProps) {
  const comboMultiplier = 1 + snapshot.combo * effects.comboRate(snapshot.stacks);
  const bombThreshold = effects.bombThreshold(snapshot.stacks);
  const acquired = Object.entries(snapshot.stacks) as [UpgradeId, number][];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 font-mono text-sm">
        {/* HP */}
        <div className="flex items-center gap-0.5 text-base" aria-label={`HP ${snapshot.hp}/${snapshot.maxHp}`}>
          {Array.from({ length: snapshot.maxHp }, (_, i) => (
            <span
              key={i}
              className={cn(
                "leading-none",
                i < snapshot.hp ? "text-red-400" : "text-muted-foreground/20"
              )}
            >
              ❤
            </span>
          ))}
          {snapshot.shieldCharges > 0 && (
            <span className="ml-2 text-xs text-primary">
              ⛩️×{snapshot.shieldCharges}
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          <span className="text-muted-foreground">
            WAVE <span className="text-foreground font-bold">{snapshot.wave}</span>
          </span>
          <span className="text-muted-foreground">
            SCORE{" "}
            <span className="text-foreground font-bold tabular-nums">
              {snapshot.score.toLocaleString()}
            </span>
          </span>
          <span
            className={cn(
              "min-w-[9rem] text-right",
              snapshot.combo >= 10 ? "text-primary" : "text-muted-foreground"
            )}
          >
            {snapshot.combo > 0 ? (
              <>
                <span className="font-bold tabular-nums">{snapshot.combo}</span> COMBO
                <span className="text-xs ml-1">×{comboMultiplier.toFixed(2)}</span>
              </>
            ) : (
              <span className="opacity-40">- COMBO</span>
            )}
          </span>
        </div>
      </div>

      {/* 取得済み強化と言霊爆ぜゲージ */}
      {(acquired.length > 0 || bombThreshold !== null) && (
        <div className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {acquired.map(([id, stacks]) => (
              <span
                key={id}
                title={`${UPGRADE_DEFS[id].name}: ${UPGRADE_DEFS[id].description}`}
                className="rounded border border-border bg-card px-1.5 py-0.5 font-mono"
              >
                {UPGRADE_DEFS[id].icon}
                {stacks > 1 && <span className="ml-0.5">×{stacks}</span>}
              </span>
            ))}
          </div>
          {bombThreshold !== null && (
            <div className="flex items-center gap-1.5 font-mono text-muted-foreground shrink-0">
              💥
              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-[width]"
                  style={{
                    width: `${Math.min(100, (snapshot.bombGauge / bombThreshold) * 100)}%`,
                  }}
                />
              </div>
              <span className="tabular-nums">
                {snapshot.bombGauge}/{bombThreshold}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
