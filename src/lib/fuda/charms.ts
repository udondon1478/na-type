/**
 * お守り（ジョーカー）の定義と抽選プール
 *
 * 各お守りは「データ + 型付きイベントフック」で表現する。フックは reducer/scoring から
 * slot 順に呼ばれ、Activation（増分と演出ラベル）を返す。お守りを増やす作業は
 * CHARM_DEFS に1エントリ追加するだけで完結する。
 * スケーリング系の状態は CharmInstance.counter（単一数値）に限定し、意味は def が解釈する。
 */

import { BALANCE } from "./balance";
import * as rng from "./rng";
import type { CharmDef, CharmId, CharmRarity, RunState } from "@/types/fuda";

/** 属性チップ加算系お守りの共通ファクトリ */
function attrChipCharm(
  id: CharmId,
  name: string,
  icon: string,
  attr: "seion" | "dakuten" | "handakuten" | "kogaki" | "shifted" | "combo",
  attrLabel: string,
  chips: number
): CharmDef {
  return {
    id,
    name,
    icon,
    rarity: "common",
    price: 4,
    describe: () => `${attrLabel}かなを打つたび +${chips}チップ`,
    onUnitScored: (ctx) =>
      ctx.unit?.attr === attr ? { chips, label: `+${chips}` } : null,
  };
}

export const CHARM_DEFS: Record<CharmId, CharmDef> = {
  // ── 並 ──
  dakutenObi: attrChipCharm("dakutenObi", "濁点の帯", "💧", "dakuten", "濁点", 15),
  seionObi: attrChipCharm("seionObi", "静音の帯", "🕊️", "seion", "清音", 8),
  kazeObi: attrChipCharm("kazeObi", "風の帯", "🍃", "shifted", "シフト", 12),
  sokuonObi: {
    id: "sokuonObi",
    name: "促音の帯",
    icon: "💠",
    rarity: "common",
    price: 4,
    describe: () => "「っ」を打つたび +18チップ",
    onUnitScored: (ctx) =>
      ctx.unit?.unit.includes("っ") ? { chips: 18, label: "+18" } : null,
  },
  homuraObi: attrChipCharm("homuraObi", "焔の帯", "🔥", "combo", "チョード", 25),
  tameTokkuri: {
    id: "tameTokkuri",
    name: "貯め徳利",
    icon: "🍶",
    rarity: "common",
    price: 4,
    describe: () => `利子の上限 +${5}文`,
    // 効果は経済計算側（interestCapBonus）で参照する
  },
  nagaiki: {
    id: "nagaiki",
    name: "長息",
    icon: "🌬️",
    rarity: "common",
    price: 4,
    describe: () => "手数 +2",
    modifyRoundConfig: (config) => ({ ...config, hands: config.hands + 2 }),
  },
  yokenNoMe: {
    id: "yokenNoMe",
    name: "予見の眼",
    icon: "👁️",
    rarity: "common",
    price: 4,
    describe: () => "引き直し +2",
    modifyRoundConfig: (config) => ({
      ...config,
      discards: config.discards + 2,
    }),
  },

  // ── 稀 ──
  renju: {
    id: "renju",
    counterResetsPerRound: true,
    name: "連珠",
    icon: "📿",
    rarity: "rare",
    price: 6,
    describe: (counter) =>
      `語を打ち切るたび倍率 +0.2（この勝負中、現在 +${(counter * 0.2).toFixed(1)}）`,
    onWordScored: (ctx) =>
      ctx.self.counter > 0
        ? {
            multAdd: ctx.self.counter * 0.2,
            counterDelta: 1,
            label: `+${(ctx.self.counter * 0.2).toFixed(1)}`,
          }
        : { counterDelta: 1, label: "連珠" },
    // counter は勝負開始時に 0 リセット（engine 側）
  },
  nigorizake: {
    id: "nigorizake",
    name: "濁り酒",
    icon: "🥃",
    rarity: "rare",
    price: 7,
    describe: (counter) =>
      `濁点かなを打つたび熟成 +1。全打鍵に熟成×0.5チップ（現在 +${Math.floor(counter * 0.5)}）`,
    onUnitScored: (ctx) => {
      const bonus = Math.floor(ctx.self.counter * 0.5);
      const isDakuten = ctx.unit?.attr === "dakuten";
      if (bonus <= 0 && !isDakuten) return null;
      return {
        chips: bonus,
        counterDelta: isDakuten ? 1 : 0,
        label: bonus > 0 ? `+${bonus}` : "熟成",
      };
    },
  },
  shinsokuNoSuzu: {
    id: "shinsokuNoSuzu",
    name: "神速の鈴",
    icon: "🔔",
    rarity: "rare",
    price: 7,
    describe: () => "早業が成立した語は倍率 ×1.5",
    onWordScored: (ctx) =>
      ctx.yakuHits?.includes("hayawaza")
        ? { multTimes: 1.5, label: "×1.5" }
        : null,
  },
  yamabiko: {
    id: "yamabiko",
    name: "山彦",
    icon: "⛰️",
    rarity: "rare",
    price: 6,
    describe: () => "直前の語と同じ役が成立したら倍率 +2",
    onWordScored: (ctx) =>
      ctx.yakuHits?.some((y) => ctx.run.lastYakuIds.includes(y))
        ? { multAdd: 2, label: "+2" }
        : null,
  },
  tanto: {
    id: "tanto",
    name: "短刀",
    icon: "🗡️",
    rarity: "rare",
    price: 6,
    describe: () => "3かな以下の語は倍率 ×2",
    onWordScored: (ctx) =>
      ctx.card && [...ctx.card.word].length <= 3
        ? { multTimes: 2, label: "×2" }
        : null,
  },
  nagamaki: {
    id: "nagamaki",
    name: "長巻",
    icon: "🏹",
    rarity: "rare",
    price: 6,
    describe: () => "7かな以上の語はチップ ×2",
    onWordScored: (ctx) =>
      ctx.card && [...ctx.card.word].length >= 7
        ? { chipsTimes: 2, label: "チップ×2" }
        : null,
  },
  sukimakaze: {
    id: "sukimakaze",
    counterResetsPerRound: true,
    name: "隙間風",
    icon: "🌀",
    rarity: "rare",
    price: 6,
    describe: (counter) =>
      `引き直しするたび倍率 +0.5（この勝負中、現在 +${(counter * 0.5).toFixed(1)}）`,
    onDiscard: () => ({ counterDelta: 1, label: "+0.5" }),
    onWordScored: (ctx) =>
      ctx.self.counter > 0
        ? {
            multAdd: ctx.self.counter * 0.5,
            label: `+${(ctx.self.counter * 0.5).toFixed(1)}`,
          }
        : null,
  },
  soroban: {
    id: "soroban",
    name: "商人の算盤",
    icon: "🧮",
    rarity: "rare",
    price: 6,
    describe: () => "ショップの商品 -2文",
    // 効果はショップ価格計算側で参照する
  },
  glassOmamori: {
    id: "glassOmamori",
    name: "ガラスの御守",
    icon: "🫙",
    rarity: "rare",
    price: 8,
    describe: () => "倍率 ×2.5。ただしミスした瞬間に割れて消滅する",
    onWordScored: () => ({ multTimes: 2.5, label: "×2.5" }),
    onMiss: () => ({ break: true, label: "割れた！" }),
  },
  keikofuda: {
    id: "keikofuda",
    counterResetsPerRound: true,
    name: "稽古札",
    icon: "🎫",
    rarity: "rare",
    price: 6,
    describe: () => "語を打ち切るたび +1文（1勝負3文まで）",
    onWordScored: (ctx) =>
      ctx.self.counter < 3
        ? { money: 1, counterDelta: 1, label: "+1文" }
        : null,
    // counter は勝負開始時に 0 リセット（engine 側）
  },

  // ── 伝説 ──
  ryuNoHoko: {
    id: "ryuNoHoko",
    counterResetsPerRound: true,
    name: "龍の咆哮",
    icon: "🐉",
    rarity: "legendary",
    price: 10,
    unlock: "wordScore3000",
    describe: (counter) =>
      `チョード確定のたび倍率 +0.3（この勝負中、現在 +${(counter * 0.3).toFixed(1)}）`,
    onUnitScored: (ctx) =>
      ctx.unit?.attr === "combo" ? { counterDelta: 1, label: "咆哮" } : null,
    onWordScored: (ctx) =>
      ctx.self.counter > 0
        ? {
            multAdd: ctx.self.counter * 0.3,
            label: `+${(ctx.self.counter * 0.3).toFixed(1)}`,
          }
        : null,
  },
  kotodamaNoUtsuwa: {
    id: "kotodamaNoUtsuwa",
    name: "言霊の器",
    icon: "⚱️",
    rarity: "legendary",
    price: 10,
    unlock: "mushin5",
    describe: () => "無心の必要連続数 -2。無心成立中はチップ +30",
    // 必要連続数の変更は yaku.mushinRequired が参照する
    onWordScored: (ctx) =>
      ctx.yakuHits?.includes("mushin") ? { chips: 30, label: "+30" } : null,
  },
};

/** 貯め徳利による利子上限ボーナス */
export function interestCapBonus(run: RunState): number {
  return run.charms.filter((c) => c.id === "tameTokkuri").length * 5;
}

/** ショップ価格（算盤・段位を適用）。M2 のショップ実装から使う */
export function effectivePrice(
  basePrice: number,
  run: RunState,
  priceMult: number
): number {
  const discount = run.charms.some((c) => c.id === "soroban") ? 2 : 0;
  return Math.max(1, Math.round(basePrice * priceMult) - discount);
}

/**
 * ショップ抽選プールを構築する。
 * 所持済み（同一IDは1つまで）と未アンロックを除き、レアリティ重みで抽選する。
 */
export function rollCharmOffers(
  state: number,
  run: RunState,
  unlocked: ReadonlySet<CharmId>,
  count: number
): [CharmId[], number] {
  const owned = new Set(run.charms.map((c) => c.id));
  const pool = Object.values(CHARM_DEFS).filter(
    (def) =>
      !owned.has(def.id) && (def.unlock === undefined || unlocked.has(def.id))
  );
  const weights: Record<CharmRarity, number> = BALANCE.rarity;

  const offers: CharmId[] = [];
  let s = state;
  const remaining = [...pool];
  while (offers.length < count && remaining.length > 0) {
    const total = remaining.reduce((sum, d) => sum + weights[d.rarity], 0);
    const [rollRaw, ns] = rng.next(s);
    s = ns;
    let roll = rollRaw * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= weights[remaining[i].rarity];
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    offers.push(remaining[idx].id);
    remaining.splice(idx, 1);
  }
  return [offers, s];
}
