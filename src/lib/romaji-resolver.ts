import { naginataMappings } from "@/data/naginata/layout";

/**
 * ローマ字シーケンス → かな の逆引きマップ
 * layout.tsの romajiSequence データから構築
 * 例: "a" → "あ", "ki" → "き", "to" → "と"
 */

const INPUT_TYPE_PRIORITY: Record<string, number> = {
  single: 0,
  shifted: 1,
  dakuten: 2,
  handakuten: 2,
  kogaki: 3,
  combo: 4,
};

const romajiToKanaMap = new Map<string, string>();
const priorityMap = new Map<string, number>();
const romajiPrefixes = new Set<string>();

for (const mapping of naginataMappings) {
  if (mapping.romajiSequence.length === 0) continue;

  const romaji = mapping.romajiSequence.join("");
  const priority = INPUT_TYPE_PRIORITY[mapping.inputType] ?? 99;
  const existingPriority = priorityMap.get(romaji) ?? Infinity;

  if (priority < existingPriority) {
    romajiToKanaMap.set(romaji, mapping.kana);
    priorityMap.set(romaji, priority);
  }

  // 全てのプレフィックスを登録（例: "ki" → "k", "ki"）
  for (let i = 1; i < romaji.length; i++) {
    romajiPrefixes.add(romaji.slice(0, i));
  }
}

/** ローマ字文字列からかなを解決する */
export function resolveRomajiToKana(romajiSeq: string): string | null {
  return romajiToKanaMap.get(romajiSeq) ?? null;
}

/** 文字列がローマ字シーケンスの有効なプレフィックスか（未完成の途中状態） */
export function isRomajiPrefix(partial: string): boolean {
  return romajiPrefixes.has(partial);
}
