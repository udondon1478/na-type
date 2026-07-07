/**
 * かな文字から、それを入力するために押すべき物理キーを逆引きする
 *
 * 薙刀式のマッピングデータを使い、各かなに対応するキー組み合わせを返す。
 * 同じかなに複数の入力方法がある場合は、最もシンプルなもの（キー数が少ないもの）を返す。
 */

import { naginataMappings } from "@/data/naginata/layout";

interface KeyGuide {
  keys: string[];
  inputType: string;
}

// かな → キーガイドのマップを構築
const kanaGuideMap = new Map<string, KeyGuide>();

// シンプルさ順にソート（single > shifted > dakuten = handakuten > combo）
const priorityOrder: Record<string, number> = {
  single: 0,
  shifted: 1,
  dakuten: 2,
  handakuten: 2,
  kogaki: 3,
  combo: 4,
};

// マッピングを優先度順にソート
const sorted = [...naginataMappings].sort((a, b) => {
  const pa = priorityOrder[a.inputType] ?? 99;
  const pb = priorityOrder[b.inputType] ?? 99;
  if (pa !== pb) return pa - pb;
  return a.keys.length - b.keys.length;
});

for (const m of sorted) {
  if (!kanaGuideMap.has(m.kana)) {
    kanaGuideMap.set(m.kana, {
      keys: m.keys,
      inputType: m.inputType,
    });
  }
}

/**
 * かな文字に対応する物理キーを返す
 *
 * shifted かな（例: の＝Space+J）はスペースとの同時押しが必要なため、
 * ガイド表示が実際の運指と一致するよう先頭に "spacebar" を含める。
 * @returns Karabinerキーコードの配列、見つからない場合は空配列
 */
export function getKeysForKana(kana: string): string[] {
  const guide = kanaGuideMap.get(kana);
  if (!guide) return [];
  if (guide.inputType === "shifted" && !guide.keys.includes("spacebar")) {
    return ["spacebar", ...guide.keys];
  }
  return guide.keys;
}

/**
 * かな文字の入力タイプを返す
 */
export function getInputTypeForKana(kana: string): string | null {
  return kanaGuideMap.get(kana)?.inputType ?? null;
}
