import type { UpgradeDef, UpgradeId } from "@/types/game";

/**
 * 言霊ディフェンスの強化（レリック）定義
 *
 * ウェーブクリアごとに3つ提示され、1つを選んで取得する。
 * 数値効果は effects.ts 側（スタック数から導出）に集約する。
 */
export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  shukuchi: {
    id: "shukuchi",
    name: "縮地",
    icon: "🐢",
    description: "敵の降下速度が12%遅くなる（重ねがけ可）",
    maxStacks: 4,
  },
  ofuda: {
    id: "ofuda",
    name: "回復の御札",
    icon: "🩹",
    description: "HPを2回復する（即時効果）",
  },
  renkeki: {
    id: "renkeki",
    name: "連撃の心得",
    icon: "⚡",
    description: "コンボによるスコア倍率の伸びが50%上がる",
    maxStacks: 3,
  },
  kekkai: {
    id: "kekkai",
    name: "結界強化",
    icon: "⛩️",
    description: "各ウェーブで1回、敵の到達によるダメージを無効化",
    maxStacks: 2,
  },
  tokiyomi: {
    id: "tokiyomi",
    name: "時詠み",
    icon: "⏳",
    description: "ノーミスで単語を撃破すると敵全体が0.8秒停止（+0.4秒/重ねがけ）",
    maxStacks: 3,
  },
  kotodama: {
    id: "kotodama",
    name: "言霊爆ぜ",
    icon: "💥",
    description: "連続正解ゲージが満ちると最前の敵が消滅（重ねがけで必要数減）",
    maxStacks: 3,
  },
  jouka: {
    id: "jouka",
    name: "浄化の風",
    icon: "🍃",
    description: "ウェーブ開始時にHPが1回復する",
    maxStacks: 2,
  },
  mikiri: {
    id: "mikiri",
    name: "見切り",
    icon: "👁️",
    description: "ミスしてもコンボがリセットされず半減で済む",
    maxStacks: 1,
  },
};

/** 取得済みスタックを考慮して、提示可能な強化から count 個をランダムに選ぶ */
export function rollUpgradeOptions(
  stacks: Partial<Record<UpgradeId, number>>,
  count: number
): UpgradeId[] {
  const available = (Object.values(UPGRADE_DEFS) as UpgradeDef[])
    .filter((d) => {
      const current = stacks[d.id] ?? 0;
      return d.maxStacks === undefined || current < d.maxStacks;
    })
    .map((d) => d.id);

  // Fisher-Yates で count 個を選出
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count);
}

/** スタック数から実効値を導出するヘルパー群 */
export const effects = {
  /** 敵速度に掛ける係数（縮地） */
  slowFactor(stacks: Partial<Record<UpgradeId, number>>): number {
    return Math.pow(0.88, stacks.shukuchi ?? 0);
  },
  /** コンボ1あたりのスコア倍率増分（連撃の心得） */
  comboRate(stacks: Partial<Record<UpgradeId, number>>): number {
    return 0.05 * (1 + 0.5 * (stacks.renkeki ?? 0));
  },
  /** ノーミス撃破時の敵停止時間（時詠み）。0なら発動しない */
  freezeMs(stacks: Partial<Record<UpgradeId, number>>): number {
    const n = stacks.tokiyomi ?? 0;
    return n === 0 ? 0 : 800 + 400 * (n - 1);
  },
  /** 言霊爆ぜの発動に必要な連続正解数。null なら未取得 */
  bombThreshold(stacks: Partial<Record<UpgradeId, number>>): number | null {
    const n = stacks.kotodama ?? 0;
    return n === 0 ? null : Math.max(20 - 4 * n, 8);
  },
  /** ウェーブ開始時のHP回復量（浄化の風） */
  waveHeal(stacks: Partial<Record<UpgradeId, number>>): number {
    return stacks.jouka ?? 0;
  },
  /** ウェーブごとの結界チャージ数（結界強化） */
  shieldCharges(stacks: Partial<Record<UpgradeId, number>>): number {
    return stacks.kekkai ?? 0;
  },
  /** 見切りを取得しているか */
  hasMikiri(stacks: Partial<Record<UpgradeId, number>>): boolean {
    return (stacks.mikiri ?? 0) > 0;
  },
};
