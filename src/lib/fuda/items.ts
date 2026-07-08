/**
 * 御札（使い切りアイテム）と単語パックの定義
 *
 * 御札は最大2枠まで所持でき、ショップ画面で使用する。
 * 祓串・写経はデッキの語を選ぶ操作（shop.pendingAction）に遷移し、
 * それ以外は即時に効果を適用する。
 */

import { BALANCE } from "./balance";
import { CHARM_DEFS } from "./charms";
import * as rng from "./rng";
import { buildCard } from "./segment";
import { YAKU_DEFS } from "./yaku";
import type { OfudaDef, OfudaId, RunState, YakuId } from "@/types/fuda";

export const OFUDA_DEFS: Record<OfudaId, OfudaDef> = {
  haraegushi: {
    id: "haraegushi",
    name: "祓串",
    icon: "🪄",
    description: "デッキから単語札を1枚選んで取り除く",
    canUse: (run) => run.shop !== null && run.deck.length > 1,
    apply: (run) =>
      run.shop
        ? { ...run, shop: { ...run.shop, pendingAction: "remove" } }
        : run,
  },
  shakyo: {
    id: "shakyo",
    name: "写経",
    icon: "📜",
    description: "デッキの単語札を1枚選んで複製する",
    canUse: (run) => run.shop !== null && run.deck.length > 0,
    apply: (run) =>
      run.shop ? { ...run, shop: { ...run.shop, pendingAction: "copy" } } : run,
  },
  oikaze: {
    id: "oikaze",
    name: "追い風",
    icon: "🍃",
    description: "次の勝負のノルマ -25%",
    canUse: (run) => run.pendingQuotaMult === 1,
    apply: (run) => ({ ...run, pendingQuotaMult: 0.75 }),
  },
  senjafuda: {
    id: "senjafuda",
    name: "千社札",
    icon: "🏮",
    description: "ランダムな稀お守りを1つ授かる（空き枠が必要）",
    canUse: (run) => {
      if (run.charms.length >= BALANCE.hand.charmSlots) return false;
      return charmCandidates(run).length > 0;
    },
    apply: (run) => {
      const pool = charmCandidates(run);
      const [picked, s] = rng.pick(run.rngState, pool);
      if (picked === null) return run;
      return {
        ...run,
        rngState: s,
        charms: [...run.charms, { id: picked, counter: 0 }],
      };
    },
  },
  ryogae: {
    id: "ryogae",
    name: "両替",
    icon: "🪙",
    description: "+5文",
    canUse: () => true,
    apply: (run) => ({ ...run, money: run.money + 5 }),
  },
  kaigen: {
    id: "kaigen",
    name: "開眼",
    icon: "👁️‍🗨️",
    description: "ランダムな役のレベルが1上がる",
    canUse: () => true,
    apply: (run) => {
      const ids = Object.keys(YAKU_DEFS) as YakuId[];
      const [picked, s] = rng.pick(run.rngState, ids);
      if (picked === null) return run;
      return {
        ...run,
        rngState: s,
        yakuLevels: {
          ...run.yakuLevels,
          [picked]: (run.yakuLevels[picked] ?? 1) + 1,
        },
      };
    },
  },
};

/** 千社札の抽選候補（未所持・アンロック済みの稀お守り） */
function charmCandidates(run: RunState) {
  const owned = new Set(run.charms.map((c) => c.id));
  const unlocked = new Set(run.unlockedCharms);
  return Object.values(CHARM_DEFS)
    .filter(
      (def) =>
        def.rarity === "rare" &&
        !owned.has(def.id) &&
        (def.unlock === undefined || unlocked.has(def.id))
    )
    .map((def) => def.id);
}

/**
 * 単語パックの中身を抽選する（デッキ外の語を優先しつつ3語）。
 */
export function rollPackWords(run: RunState): [string[], number] {
  const inDeck = new Set(run.deck.map((c) => c.word));
  const fresh = run.wordPool.filter((w) => !inDeck.has(w));
  const source = fresh.length >= 3 ? fresh : run.wordPool;
  const [shuffled, s] = rng.shuffle(run.rngState, source);
  return [shuffled.slice(0, 3), s];
}

/** パックから選んだ語をデッキに加える */
export function addWordToDeck(run: RunState, word: string): RunState {
  return {
    ...run,
    deck: [...run.deck, buildCard(run.nextCardUid, word)],
    nextCardUid: run.nextCardUid + 1,
  };
}
