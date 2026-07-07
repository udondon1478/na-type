"use client";

import { UPGRADE_DEFS } from "@/lib/game/upgrades";
import type { UpgradeId } from "@/types/game";

interface UpgradeChoiceProps {
  options: UpgradeId[];
  stacks: Partial<Record<UpgradeId, number>>;
  clearedWave: number;
  onPick: (id: UpgradeId) => void;
}

/** ウェーブクリア後の強化選択画面（数字キー 1-3 でも選択可能） */
export function UpgradeChoice({
  options,
  stacks,
  clearedWave,
  onPick,
}: UpgradeChoiceProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[420px] md:h-[480px] rounded-lg border border-border bg-background/60 gap-6 px-4">
      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-primary">
          WAVE {clearedWave} クリア！
        </p>
        <p className="text-sm text-muted-foreground">強化を1つ選んでください</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 w-full max-w-2xl">
        {options.map((id, i) => {
          const def = UPGRADE_DEFS[id];
          const current = stacks[id] ?? 0;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/70 hover:bg-primary/5 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{def.icon}</span>
                <kbd className="px-1.5 py-0.5 rounded border border-border text-xs text-muted-foreground">
                  {i + 1}
                </kbd>
              </div>
              <div className="font-bold text-sm">
                {def.name}
                {current > 0 && (
                  <span className="ml-1.5 text-xs text-primary font-mono">
                    Lv.{current} → {current + 1}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {def.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
