/**
 * 役（やく）の定義と成立判定
 *
 * 単語完成時に全役をチェックし、成立した役すべてが chips/mult に加算寄与する
 * （Balatro の単一ハンド選択と違い、複数役の同時成立がデッキ構築の狙い目になる）。
 * 判定は play.unitResults（実際に確定した入力単位）に基づく:
 * physical モードは実測、IME モードは正準セグメンテーションの結果が入る。
 */

import { BALANCE } from "./balance";
import type {
  ActiveWordPlay,
  RunState,
  WordCardData,
  YakuDef,
  YakuId,
} from "@/types/fuda";

/** 属性の出現数を数える */
function countAttr(play: ActiveWordPlay, attr: string): number {
  return play.unitResults.filter((u) => u.attr === attr).length;
}

/** かな数（文字数） */
function kanaLen(card: WordCardData): number {
  return [...card.word].length;
}

/** 無心に必要な連続語数（言霊の器で -2） */
export function mushinRequired(run: RunState): number {
  const hasUtsuwa = run.charms.some((c) => c.id === "kotodamaNoUtsuwa");
  return Math.max(2, BALANCE.yaku.mushinStreak - (hasUtsuwa ? 2 : 0));
}

export const YAKU_DEFS: Record<YakuId, YakuDef> = {
  choka: {
    id: "choka",
    name: "長歌",
    description: "6かな以上の語",
    check: (card) => kanaLen(card) >= 6,
    base: { chips: 0, mult: 2 },
    perLevel: { chips: 10, mult: 1 },
  },
  hayate: {
    id: "hayate",
    name: "疾風",
    description: "全単位をチョードで確定（2単位以上）",
    check: (_card, play) =>
      play.unitResults.length >= 2 &&
      play.unitResults.every((u) => u.attr === "combo"),
    base: { chips: 0, mult: 3 },
    perLevel: { chips: 10, mult: 1.5 },
  },
  dakuryu: {
    id: "dakuryu",
    name: "濁流",
    description: "濁点かな3つ以上",
    check: (_card, play) => countAttr(play, "dakuten") >= 3,
    base: { chips: 0, mult: 2 },
    perLevel: { chips: 10, mult: 1 },
  },
  haon: {
    id: "haon",
    name: "破音",
    description: "半濁点かなを含む",
    check: (_card, play) => countAttr(play, "handakuten") >= 1,
    base: { chips: 0, mult: 1.5 },
    perLevel: { chips: 5, mult: 0.5 },
  },
  kouta: {
    id: "kouta",
    name: "小唄",
    description: "小書きかな2つ以上",
    check: (_card, play) => countAttr(play, "kogaki") >= 2,
    base: { chips: 0, mult: 1.5 },
    perLevel: { chips: 5, mult: 0.5 },
  },
  ukifune: {
    id: "ukifune",
    name: "浮舟",
    description: "シフトかな4つ以上",
    check: (_card, play) => countAttr(play, "shifted") >= 4,
    base: { chips: 0, mult: 2 },
    perLevel: { chips: 10, mult: 1 },
  },
  hayawaza: {
    id: "hayawaza",
    name: "早業",
    description: `平均打鍵間隔 ${BALANCE.yaku.hayawazaAvgMs}ms 未満（${BALANCE.yaku.hayawazaMinKana}かな以上）`,
    check: (card, play) => {
      if (kanaLen(card) < BALANCE.yaku.hayawazaMinKana) return false;
      const rest = play.unitResults.slice(1);
      if (rest.length === 0) return false;
      const avg = rest.reduce((sum, u) => sum + u.intervalMs, 0) / rest.length;
      return avg < BALANCE.yaku.hayawazaAvgMs;
    },
    base: { chips: 0, mult: 2 },
    perLevel: { chips: 10, mult: 1 },
  },
  mushin: {
    id: "mushin",
    name: "無心",
    description: `ノーミス${BALANCE.yaku.mushinStreak}語連続中`,
    check: (_card, play, run) =>
      play.missCount === 0 && run.noMissStreak + 1 >= mushinRequired(run),
    base: { chips: 0, mult: 1 },
    perLevel: { chips: 5, mult: 0.5 },
  },
  hitomoji: {
    id: "hitomoji",
    name: "一文字",
    description: "1〜2かなの短い語",
    check: (card) => kanaLen(card) <= 2,
    base: { chips: 30, mult: 0 },
    perLevel: { chips: 15, mult: 0 },
  },
};

export interface YakuHit {
  def: YakuDef;
  level: number;
  chips: number;
  mult: number;
}

/** 成立した全役を評価する（レベル込みの実効値付き） */
export function evaluateYaku(
  card: WordCardData,
  play: ActiveWordPlay,
  run: RunState
): YakuHit[] {
  const hits: YakuHit[] = [];
  for (const def of Object.values(YAKU_DEFS)) {
    if (!def.check(card, play, run)) continue;
    const level = run.yakuLevels[def.id] ?? 1;
    hits.push({
      def,
      level,
      chips: def.base.chips + def.perLevel.chips * (level - 1),
      mult: def.base.mult + def.perLevel.mult * (level - 1),
    });
  }
  return hits;
}
