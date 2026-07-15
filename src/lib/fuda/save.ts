/**
 * ラン途中セーブ（チェックポイント）とメタ進行の直列化・復元
 *
 * チェックポイントは roundIntro / shop の境界のみ（round の途中状態や
 * chord 判定・タイマーを直列化しない）。デッキは {uid, word} だけを保存し、
 * 復元時に buildCard で units/attrs を再導出する（配列データ再生成に追従するため）。
 * 壊れたデータは null を返して「続きから」を非表示にする（例外は投げない）。
 */

import { CHARM_DEFS } from "./charms";
import { OFUDA_DEFS } from "./items";
import { buildCard } from "./segment";
import { YAKU_DEFS } from "./yaku";
import type {
  CharmId,
  FudaMeta,
  FudaSave,
  OfudaId,
  RunState,
} from "@/types/fuda";

export function defaultMeta(): FudaMeta {
  return {
    soundEnabled: true,
    stakeUnlocked: 1,
    unlockedCharms: [],
    unlockedSchools: ["kata"],
    achievements: {},
    stats: {
      totalRuns: 0,
      wins: 0,
      bestAnte: 0,
      winsByStake: {},
      totalKana: 0,
    },
  };
}

export function defaultSave(): FudaSave {
  return { version: 1, meta: defaultMeta(), currentRun: null };
}

/** localStorage から読んだ生データを FudaSave に正規化する（破損は既定値で埋める） */
export function normalizeSave(raw: unknown): FudaSave {
  if (typeof raw !== "object" || raw === null) return defaultSave();
  const obj = raw as Partial<FudaSave>;
  if (obj.version !== 1) return defaultSave();

  // meta は浅いマージだと壊れた配列・オブジェクトがそのまま残るため、
  // 型が合わないフィールドは既定値へ個別にフォールバックする。
  const def = defaultMeta();
  const src = (typeof obj.meta === "object" && obj.meta !== null
    ? obj.meta
    : {}) as Record<string, unknown>;

  const meta: FudaMeta = {
    soundEnabled:
      typeof src.soundEnabled === "boolean" ? src.soundEnabled : def.soundEnabled,
    stakeUnlocked: isNumber(src.stakeUnlocked)
      ? src.stakeUnlocked
      : def.stakeUnlocked,
    unlockedCharms: isStringArray(src.unlockedCharms)
      ? (src.unlockedCharms as FudaMeta["unlockedCharms"])
      : def.unlockedCharms,
    unlockedSchools: isStringArray(src.unlockedSchools)
      ? (src.unlockedSchools as FudaMeta["unlockedSchools"])
      : def.unlockedSchools,
    achievements: isPlainObject(src.achievements)
      ? (src.achievements as FudaMeta["achievements"])
      : def.achievements,
    stats: {
      ...def.stats,
      ...(isPlainObject(src.stats) ? src.stats : {}),
    },
  };

  return { version: 1, meta, currentRun: obj.currentRun ?? null };
}

/** チェックポイントとして保存する形（fx と派生データを落とす） */
export function serializeRun(run: RunState): unknown {
  return {
    ...run,
    round: null,
    fxQueue: [],
    fxSeq: 0,
    deck: run.deck.map((c) => ({ uid: c.uid, word: c.word })),
  };
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** ショップのチェックポイントが未知IDを含まないか検証する（改名・削除跨ぎでの参照落ち対策） */
function shopOffersValid(shop: unknown): boolean {
  if (!isPlainObject(shop)) return false;
  if (
    Array.isArray(shop.charmOffers) &&
    !shop.charmOffers.every(
      (o) => isPlainObject(o) && typeof o.charmId === "string" && o.charmId in CHARM_DEFS
    )
  ) {
    return false;
  }
  const ofudaOffer = shop.ofudaOffer;
  if (
    ofudaOffer != null &&
    !(isPlainObject(ofudaOffer) && typeof ofudaOffer.ofudaId === "string" && ofudaOffer.ofudaId in OFUDA_DEFS)
  ) {
    return false;
  }
  const scrollOffer = shop.scrollOffer;
  if (
    scrollOffer != null &&
    !(isPlainObject(scrollOffer) && typeof scrollOffer.yakuId === "string" && scrollOffer.yakuId in YAKU_DEFS)
  ) {
    return false;
  }
  return true;
}

/**
 * チェックポイントを RunState に復元する。構造が壊れていれば null。
 */
export function deserializeRun(raw: unknown): RunState | null {
  try {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;

    if (r.phase !== "roundIntro" && r.phase !== "shop") return null;
    if (
      !isNumber(r.seed) ||
      !isNumber(r.rngState) ||
      !isNumber(r.stake) ||
      !isNumber(r.lessonLevel) ||
      !isNumber(r.ante) ||
      !isNumber(r.money) ||
      !isNumber(r.nextCardUid) ||
      !isNumber(r.noMissStreak)
    ) {
      return null;
    }
    if (r.roundIndex !== 0 && r.roundIndex !== 1 && r.roundIndex !== 2) {
      return null;
    }
    if (!isStringArray(r.wordPool) || !Array.isArray(r.deck)) return null;
    // ショップのチェックポイントは各オファーの参照先まで検証する。
    // 未知 ID を含むと ShopScreen が CHARM_DEFS[...] 等の undefined 参照で落ちるため、
    // 復元を諦めて null を返す（このファイルの「壊れたデータは null」方針に合わせる）。
    if (r.phase === "shop" && !shopOffersValid(r.shop)) {
      return null;
    }

    // デッキ: {uid, word} から派生データを再構築（不正エントリがあれば破棄）
    const deck = [];
    for (const entry of r.deck) {
      if (typeof entry !== "object" || entry === null) return null;
      const e = entry as Record<string, unknown>;
      if (!isNumber(e.uid) || typeof e.word !== "string" || e.word.length === 0) {
        return null;
      }
      deck.push(buildCard(e.uid, e.word));
    }
    if (deck.length === 0) return null;

    // お守り: 未知の ID（将来の削除・改名）は黙って落とす
    const charms = Array.isArray(r.charms)
      ? r.charms.flatMap((c) => {
          if (typeof c !== "object" || c === null) return [];
          const e = c as Record<string, unknown>;
          if (typeof e.id !== "string" || !(e.id in CHARM_DEFS)) return [];
          return [{ id: e.id as CharmId, counter: isNumber(e.counter) ? e.counter : 0 }];
        })
      : [];

    // 御札: 未知の ID は落とす（お守りと同じ方針）
    const ofudas = Array.isArray(r.ofudas)
      ? r.ofudas.filter(
          (o): o is OfudaId => typeof o === "string" && o in OFUDA_DEFS
        )
      : [];

    return {
      ...(raw as RunState),
      deck,
      charms,
      ofudas,
      round: null,
      fxQueue: [],
      fxSeq: 0,
    };
  } catch {
    return null;
  }
}
