/**
 * ボス（急戦）ルールの定義と抽選
 *
 * 各幕の急戦（3勝負目）にはルール改変が1つ適用される。
 * 宣言的なフラグ + 少数のフックで表現し、reducer/scoring/UI が参照する。
 */

import { BALANCE } from "./balance";
import * as rng from "./rng";
import type { BossDef, BossId } from "@/types/fuda";

export const BOSS_DEFS: Record<BossId, BossDef> = {
  oozeki: {
    id: "oozeki",
    name: "大関",
    icon: "🏔️",
    description: "ノルマがさらに ×1.5",
    modifyRoundConfig: (config) => ({
      ...config,
      quota: Math.round(config.quota * 1.5),
    }),
  },
  seionFuji: {
    id: "seionFuji",
    name: "清音封じ",
    icon: "🤐",
    description: "清音かなのチップが 0 になる",
    modifyUnitChips: (attr, chips) => (attr === "seion" ? 0 : chips),
  },
  kokugen: {
    id: "kokugen",
    name: "刻限",
    icon: "⏳",
    description: `${Math.round(BALANCE.timing.bossTimeLimitMs / 1000)}秒以内にノルマを達成せよ`,
    modifyRoundConfig: (config) => ({
      ...config,
      timeLimitMs: BALANCE.timing.bossTimeLimitMs,
    }),
  },
  ippatsu: {
    id: "ippatsu",
    name: "一発勝負",
    icon: "🎯",
    description: "引き直しができない",
    modifyRoundConfig: (config) => ({ ...config, discards: 0 }),
  },
  kasumi: {
    id: "kasumi",
    name: "霞",
    icon: "🌫️",
    description: "手札の単語が次に打つかな以外伏せ字になる",
    flags: { maskHand: true },
  },
  dokugiri: {
    id: "dokugiri",
    name: "毒霧",
    icon: "☠️",
    description: "ミスするたび入力中の語のチップが半減する",
    flags: { halveChipsOnMiss: true },
  },
  jubaku: {
    id: "jubaku",
    name: "呪縛",
    icon: "⛓️",
    description: "お守り1枠がランダムに封印される",
    flags: { sealCharm: true },
  },
};

/**
 * 幕のボスを抽選する。直近に出たボスを避けて偏りを減らす。
 */
export function rollBoss(
  state: number,
  recentBosses: readonly BossId[]
): [BossId, number] {
  const all = Object.keys(BOSS_DEFS) as BossId[];
  const fresh = all.filter((id) => !recentBosses.includes(id));
  const pool = fresh.length > 0 ? fresh : all;
  const [picked, s] = rng.pick(state, pool);
  // pool は常に非空なので picked が null になることはない
  return [picked ?? "oozeki", s];
}
