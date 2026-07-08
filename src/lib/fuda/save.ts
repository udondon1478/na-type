/**
 * ラン途中セーブ（チェックポイント）とメタ進行の直列化・復元
 *
 * チェックポイントは roundIntro / shop の境界のみ（round の途中状態や
 * chord 判定・タイマーを直列化しない）。デッキは {uid, word} だけを保存し、
 * 復元時に buildCard で units/attrs を再導出する（配列データ再生成に追従するため）。
 * 壊れたデータは null を返して「続きから」を非表示にする（例外は投げない）。
 */

import { CHARM_DEFS } from "./charms";
import { buildCard } from "./segment";
import type {
  CharmId,
  FudaMeta,
  FudaSave,
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
  const meta = { ...defaultMeta(), ...(obj.meta ?? {}) };
  meta.stats = { ...defaultMeta().stats, ...(obj.meta?.stats ?? {}) };
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
    if (r.phase === "shop" && (typeof r.shop !== "object" || r.shop === null)) {
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

    return {
      ...(raw as RunState),
      deck,
      charms,
      round: null,
      fxQueue: [],
      fxSeq: 0,
    };
  } catch {
    return null;
  }
}
