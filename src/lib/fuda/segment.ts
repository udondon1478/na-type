/**
 * 単語の入力単位セグメンテーションと属性分類
 *
 * 薙刀式では「しゃ」「ぎゅ」のような拗音が1チョード（combo）で入力できるため、
 * 単語を「入力単位」の列に分割してから属性（KanaAttr）を割り当てる。
 * IME モードはこの正準セグメンテーションで採点し（チョード可能単位はチョード扱い＝
 * 疑わしきは加点）、physical モードは実際の確定単位が優先される。
 */

import { naginataMappings } from "@/data/naginata/layout";
import { getInputTypeForKana } from "@/lib/kana-to-keys";
import type { KanaAttr, WordCardData } from "@/types/fuda";

/** かな出力のみ対象（resolve-chord-to-kana と同じ基準）。漢字・記号・機能ラベルを除外 */
function isKanaOutput(kana: string): boolean {
  return /^[ぁ-ゖァ-ヺー]+$/.test(kana);
}

// 2文字以上のかな出力（拗音チョード等）の集合と最大長を初期化時に構築
const multiCharUnits = new Set<string>();
let maxUnitLenInternal = 1;
for (const m of naginataMappings) {
  if (!isKanaOutput(m.kana)) continue;
  const len = [...m.kana].length;
  if (len >= 2) {
    multiCharUnits.add(m.kana);
    maxUnitLenInternal = Math.max(maxUnitLenInternal, len);
  }
}

/** 配列上で認識される入力単位の最大文字数（テスト用に公開） */
export const maxUnitLen = maxUnitLenInternal;

/** InputType（薙刀式）→ KanaAttr（言霊札のスート）への写像 */
export function toKanaAttr(inputType: string | null): KanaAttr {
  switch (inputType) {
    case "shifted":
      return "shifted";
    case "dakuten":
      return "dakuten";
    case "handakuten":
      return "handakuten";
    case "kogaki":
      return "kogaki";
    case "combo":
      return "combo";
    default:
      // single および未知（「ー」等のマッピング欠落）は清音として扱う
      return "seion";
  }
}

/** 入力単位の正準属性。2文字以上はチョード（combo）、1文字は配列の入力タイプに従う */
export function classifyUnit(unit: string): KanaAttr {
  if ([...unit].length >= 2) return "combo";
  return toKanaAttr(getInputTypeForKana(unit));
}

/**
 * 単語を入力単位の列に分割する（貪欲最長一致）。
 * 例: "きしゃ" → ["き", "しゃ"]（しゃ が combo マッピングに存在する場合）
 */
export function segmentWord(word: string): string[] {
  const chars = [...word];
  const units: string[] = [];
  let i = 0;
  while (i < chars.length) {
    let matched: string | null = null;
    // 最長一致: maxUnitLen 文字から2文字まで試す
    for (let len = Math.min(maxUnitLenInternal, chars.length - i); len >= 2; len--) {
      const candidate = chars.slice(i, i + len).join("");
      if (multiCharUnits.has(candidate)) {
        matched = candidate;
        break;
      }
    }
    if (matched) {
      units.push(matched);
      i += [...matched].length;
    } else {
      units.push(chars[i]);
      i += 1;
    }
  }
  return units;
}

/** 単語の属性プロファイル（ショップの単語パック表示・役の事前見積もりに使う） */
export function wordAttrProfile(word: string): Record<KanaAttr, number> {
  const profile: Record<KanaAttr, number> = {
    seion: 0,
    dakuten: 0,
    handakuten: 0,
    kogaki: 0,
    shifted: 0,
    combo: 0,
  };
  for (const unit of segmentWord(word)) {
    profile[classifyUnit(unit)]++;
  }
  return profile;
}

/** 単語からカードを構築する（セグメンテーションをキャッシュ） */
export function buildCard(uid: number, word: string): WordCardData {
  const units = segmentWord(word);
  return { uid, word, units, attrs: units.map(classifyUnit) };
}

/**
 * 単位列の累積終端オフセット（文字インデックス）を返す。
 * 例: ["き", "しゃ"] → [1, 3]。charProgress がこの値に達した時点でその単位が確定する。
 */
export function unitEndOffsets(units: string[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const u of units) {
    acc += [...u].length;
    offsets.push(acc);
  }
  return offsets;
}
