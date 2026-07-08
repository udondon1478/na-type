"use client";

import { cn } from "@/lib/utils";
import type { Enemy } from "@/types/game";

interface GameFieldProps {
  enemies: Enemy[];
  lockedId: number | null;
  /** 時詠み（敵停止）の残りミリ秒 */
  freezeRemainingMs: number;
  paused: boolean;
}

/** 敵の見た目（IDから決定的に選ぶ） */
const ENEMY_ICONS = ["👻", "👹", "🌀", "💀", "🔥", "🦂"];

function EnemyChip({ enemy, locked }: { enemy: Enemy; locked: boolean }) {
  const danger = enemy.y > 72;
  const typedText = enemy.word.slice(0, enemy.typed);
  const restText = enemy.word.slice(enemy.typed);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 select-none"
      style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
    >
      <span className={cn("text-xl leading-none", danger && "animate-pulse")}>
        {ENEMY_ICONS[enemy.id % ENEMY_ICONS.length]}
      </span>
      <span
        className={cn(
          "rounded-md border bg-card/90 px-2 py-0.5 font-mono text-lg tracking-wide whitespace-nowrap",
          locked
            ? "border-primary shadow-[0_0_12px] shadow-primary/40"
            : danger
              ? "border-destructive"
              : "border-border"
        )}
      >
        <span className="text-primary">{typedText}</span>
        <span className={danger ? "text-destructive" : "text-foreground"}>
          {restText}
        </span>
      </span>
    </div>
  );
}

export function GameField({
  enemies,
  lockedId,
  freezeRemainingMs,
  paused,
}: GameFieldProps) {
  const frozen = freezeRemainingMs > 0;

  return (
    <div className="relative h-[420px] md:h-[480px] overflow-hidden rounded-lg border border-border bg-background/60">
      {/* 敵は上（y=0）から結界（y=100）へ降下する */}
      {enemies.map((enemy) => (
        <EnemyChip key={enemy.id} enemy={enemy} locked={enemy.id === lockedId} />
      ))}

      {/* 結界ライン */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-primary/15 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/70 pointer-events-none" />
      <div className="absolute bottom-1 right-2 text-xs text-primary/60 font-mono select-none pointer-events-none">
        ⛩️ 結界
      </div>

      {/* 時詠み発動中の演出 */}
      {frozen && !paused && (
        <div className="absolute inset-0 bg-sky-400/10 flex items-start justify-center pt-3 pointer-events-none">
          <span className="text-xs font-mono text-sky-300">
            ⏳ 時詠み {(freezeRemainingMs / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* ポーズ中オーバーレイ */}
      {paused && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-bold">一時停止中</p>
          <p className="text-sm text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded border border-border text-xs">Esc</kbd>{" "}
            で再開
          </p>
        </div>
      )}
    </div>
  );
}
