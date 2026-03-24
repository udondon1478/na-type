/**
 * Karabiner-Elements JSON から薙刀式のかな↔キーマッピングを抽出するスクリプト
 *
 * 使い方: npx tsx scripts/parse-karabiner.ts
 * 出力: src/data/naginata/layout.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface KarabinerManipulator {
  type: string;
  description?: string;
  from: {
    key_code?: string;
    simultaneous?: Array<{ key_code: string }>;
    simultaneous_options?: unknown;
    modifiers?: unknown;
  };
  to?: Array<{
    key_code?: string;
    set_variable?: { name: string; value: number };
    modifiers?: string[];
    repeat?: boolean;
    select_input_source?: unknown;
  }>;
  to_after_key_up?: unknown[];
  to_if_alone?: unknown[];
  to_delayed_action?: unknown;
  conditions?: Array<{
    type: string;
    name?: string;
    value?: number;
    input_sources?: unknown[];
    keyboard_types?: string[];
  }>;
  parameters?: unknown;
}

interface KarabinerRule {
  description: string;
  manipulators: KarabinerManipulator[];
}

interface KarabinerProfile {
  name: string;
  complex_modifications?: {
    rules: KarabinerRule[];
  };
}

interface KarabinerConfig {
  profiles: KarabinerProfile[];
}

interface ParsedMapping {
  kana: string;
  inputType: "single" | "shifted" | "dakuten" | "handakuten" | "kogaki" | "combo";
  keys: string[];
  romajiSequence: string[];
  description: string;
}

/** Karabiner key_code を KeyboardEvent.code に変換（将来の拡張用） */
const _KARABINER_TO_EVENT_CODE: Record<string, string> = {
  a: "KeyA", b: "KeyB", c: "KeyC", d: "KeyD", e: "KeyE",
  f: "KeyF", g: "KeyG", h: "KeyH", i: "KeyI", j: "KeyJ",
  k: "KeyK", l: "KeyL", m: "KeyM", n: "KeyN", o: "KeyO",
  p: "KeyP", q: "KeyQ", r: "KeyR", s: "KeyS", t: "KeyT",
  u: "KeyU", v: "KeyV", w: "KeyW", x: "KeyX", y: "KeyY",
  z: "KeyZ",
  "1": "Digit1", "2": "Digit2", "3": "Digit3", "4": "Digit4", "5": "Digit5",
  "6": "Digit6", "7": "Digit7", "8": "Digit8", "9": "Digit9", "0": "Digit0",
  spacebar: "Space",
  return_or_enter: "Enter",
  tab: "Tab",
  delete_or_backspace: "Backspace",
  semicolon: "Semicolon",
  quote: "Quote",
  comma: "Comma",
  period: "Period",
  slash: "Slash",
  open_bracket: "BracketLeft",
  close_bracket: "BracketRight",
  hyphen: "Minus",
  equal_sign: "Equal",
  grave_accent_and_tilde: "Backquote",
  backslash: "Backslash",
};

/** ローマ字シーケンスからかなを推定 */
const ROMAJI_TO_KANA: Record<string, string> = {
  "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お",
  "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ",
  "sa": "さ", "si": "し", "su": "す", "se": "せ", "so": "そ",
  "ta": "た", "ti": "ち", "tu": "つ", "te": "て", "to": "と",
  "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の",
  "ha": "は", "hi": "ひ", "hu": "ふ", "he": "へ", "ho": "ほ",
  "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も",
  "ya": "や", "yu": "ゆ", "yo": "よ",
  "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ",
  "wa": "わ", "wo": "を", "nn": "ん",
  "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
  "za": "ざ", "zi": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
  "da": "だ", "di": "ぢ", "du": "づ", "de": "で", "do": "ど",
  "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ",
  "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",
  "kya": "きゃ", "kyu": "きゅ", "kyo": "きょ",
  "sya": "しゃ", "syu": "しゅ", "syo": "しょ",
  "tya": "ちゃ", "tyu": "ちゅ", "tyo": "ちょ",
  "nya": "にゃ", "nyu": "にゅ", "nyo": "にょ",
  "hya": "ひゃ", "hyu": "ひゅ", "hyo": "ひょ",
  "mya": "みゃ", "myu": "みゅ", "myo": "みょ",
  "rya": "りゃ", "ryu": "りゅ", "ryo": "りょ",
  "gya": "ぎゃ", "gyu": "ぎゅ", "gyo": "ぎょ",
  "zya": "じゃ", "zyu": "じゅ", "zyo": "じょ",
  "ja": "じゃ", "ju": "じゅ", "jo": "じょ",
  "dya": "ぢゃ", "dyu": "ぢゅ", "dyo": "ぢょ",
  "bya": "びゃ", "byu": "びゅ", "byo": "びょ",
  "pya": "ぴゃ", "pyu": "ぴゅ", "pyo": "ぴょ",
  "xya": "ゃ", "xyu": "ゅ", "xyo": "ょ",
  "xa": "ぁ", "xi": "ぃ", "xu": "ぅ", "xe": "ぇ", "xo": "ぉ",
  "xwa": "ゎ", "xtu": "っ",
  "vu": "ゔ", "va": "ゔぁ", "vi": "ゔぃ", "ve": "ゔぇ", "vo": "ゔぉ",
  "fa": "ふぁ", "fi": "ふぃ", "fu": "ふ", "fe": "ふぇ", "fo": "ふぉ",
};

function extractRomajiSequence(toArray: KarabinerManipulator["to"]): string[] {
  if (!toArray) return [];
  return toArray
    .filter((t) => t.key_code && !t.set_variable && !t.select_input_source)
    .map((t) => t.key_code!)
    .filter((code) => /^[a-z]$/.test(code));
}

function romajiToKana(seq: string[]): string | null {
  const romaji = seq.join("");
  return ROMAJI_TO_KANA[romaji] ?? null;
}

function detectInputType(
  m: KarabinerManipulator
): ParsedMapping["inputType"] {
  const desc = m.description ?? "";

  if (desc.includes("濁")) return "dakuten";
  if (desc.includes("半")) return "handakuten";
  if (desc.includes("小")) return "kogaki";
  if (desc.startsWith("[Sp]")) return "shifted";

  if (m.from.simultaneous) return "combo";

  const hasShiftedCondition = m.conditions?.some(
    (c) => c.type === "variable_if" && c.name === "shifted" && c.value === 1
  );
  if (hasShiftedCondition) return "shifted";

  return "single";
}

function extractOutputKana(m: KarabinerManipulator): string | null {
  const desc = m.description ?? "";

  // 矢印の右側にかながある場合（同時打鍵系）
  const arrowMatch = desc.match(/→\s*(.+)$/);
  if (arrowMatch) {
    return arrowMatch[1].trim().replace(/[()（）]/g, "");
  }

  // [Sp] プレフィックスの後のかな
  const spMatch = desc.match(/^\[Sp\]\s+(.+)$/);
  if (spMatch) {
    return spMatch[1].trim();
  }

  // 単独かな（1-2文字のひらがな/カタカナ）
  if (/^[ぁ-ゔー]{1,2}$/.test(desc)) {
    return desc;
  }

  // ローマ字シーケンスからの推定
  const romaji = extractRomajiSequence(m.to);
  if (romaji.length > 0) {
    const kana = romajiToKana(romaji);
    if (kana) return kana;
  }

  return null;
}

function extractKeys(m: KarabinerManipulator): string[] {
  if (m.from.simultaneous) {
    return m.from.simultaneous.map((k) => k.key_code);
  }
  if (m.from.key_code) {
    return [m.from.key_code];
  }
  return [];
}

function isRelevantManipulator(m: KarabinerManipulator): boolean {
  const desc = m.description ?? "";

  // スキップ: スペースキー自体、編集コマンド、入力モード変更
  if (desc === "スペースキー") return false;
  if (desc.includes("BS")) return false;
  if (desc.includes("UNICODE使用")) return false;
  if (desc.includes("enter")) return false;
  if (desc.includes("Enter")) return false;
  if (desc.includes("──")) return false;
  if (desc.includes("delete")) return false;

  // かなを出力するエントリのみ
  const keys = extractKeys(m);
  if (keys.length === 0) return false;

  return true;
}

function parseManipulator(m: KarabinerManipulator): ParsedMapping | null {
  if (!isRelevantManipulator(m)) return null;

  const kana = extractOutputKana(m);
  if (!kana) return null;

  // 記号類をスキップ（かな以外）
  if (!/[ぁ-ゔー、。「」『』・…―～？！〜]/.test(kana) && kana.length > 3) {
    return null;
  }

  const inputType = detectInputType(m);
  const keys = extractKeys(m);
  const romajiSequence = extractRomajiSequence(m.to);

  return {
    kana,
    inputType,
    keys,
    romajiSequence,
    description: m.description ?? "",
  };
}

function main() {
  const configPath = path.join(
    os.homedir(),
    ".config",
    "karabiner",
    "karabiner.json"
  );

  if (!fs.existsSync(configPath)) {
    console.error(`設定ファイルが見つかりません: ${configPath}`);
    process.exit(1);
  }

  const config: KarabinerConfig = JSON.parse(
    fs.readFileSync(configPath, "utf-8")
  );

  // 薙刀式プロファイルを検索
  const naginataProfile = config.profiles.find(
    (p) => p.name.includes("薙刀式") || p.name.toLowerCase().includes("naginata")
  );

  if (!naginataProfile) {
    console.error("薙刀式プロファイルが見つかりません");
    console.log("利用可能なプロファイル:", config.profiles.map((p) => p.name));
    process.exit(1);
  }

  console.log(`プロファイル「${naginataProfile.name}」を検出`);

  // 薙刀式のルールを検索
  const rules = naginataProfile.complex_modifications?.rules ?? [];
  const naginataRule = rules.find(
    (r) => r.description.includes("薙刀式") || r.description.includes("naginata")
  );

  if (!naginataRule) {
    console.error("薙刀式のルールが見つかりません");
    console.log("利用可能なルール:", rules.map((r) => r.description));
    process.exit(1);
  }

  console.log(`ルール「${naginataRule.description}」を検出`);
  console.log(`manipulator数: ${naginataRule.manipulators.length}`);

  // パース
  const mappings: ParsedMapping[] = [];
  const skipped: string[] = [];

  for (const m of naginataRule.manipulators) {
    const parsed = parseManipulator(m);
    if (parsed) {
      mappings.push(parsed);
    } else if (m.description) {
      skipped.push(m.description);
    }
  }

  console.log(`\nパース結果:`);
  console.log(`  成功: ${mappings.length}`);
  console.log(`  スキップ: ${skipped.length}`);

  // 種類別集計
  const byType: Record<string, number> = {};
  for (const m of mappings) {
    byType[m.inputType] = (byType[m.inputType] ?? 0) + 1;
  }
  console.log(`\n種類別:`);
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  // TypeScriptファイルとして出力
  const outputPath = path.join(
    __dirname,
    "..",
    "src",
    "data",
    "naginata",
    "layout.ts"
  );

  const output = `// このファイルは scripts/parse-karabiner.ts によって自動生成されました
// 手動で編集しないでください
// 生成日時: ${new Date().toISOString()}

import type { KanaMapping, KeyboardLayout } from "@/types/layout";

export const naginataMappings: KanaMapping[] = ${JSON.stringify(
    mappings.map((m) => ({
      kana: m.kana,
      inputType: m.inputType,
      keys: m.keys,
      romajiSequence: m.romajiSequence,
      description: m.description,
    })),
    null,
    2
  )};

export const naginataLayout: KeyboardLayout = {
  name: "naginata",
  version: "v14",
  mappings: naginataMappings,
};

/** かな → マッピングの逆引きマップ */
export const kanaToMapping = new Map<string, KanaMapping[]>();
for (const m of naginataMappings) {
  const existing = kanaToMapping.get(m.kana) ?? [];
  existing.push(m);
  kanaToMapping.set(m.kana, existing);
}
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, "utf-8");
  console.log(`\n出力: ${outputPath}`);

  // スキップされたエントリを表示（デバッグ用）
  if (skipped.length > 0) {
    console.log(`\nスキップされたエントリ (最初の20件):`);
    skipped.slice(0, 20).forEach((s) => console.log(`  - ${s}`));
  }
}

main();
