import { naginataMappings } from "@/data/naginata/layout";
import { KARABINER_TO_EVENT_CODE } from "@/components/keyboard/KeyboardLayout";
import type { InputType } from "@/types/layout";

/**
 * 同時打鍵（chord）逆引きマップ
 *
 * `event.code` の集合（ソート済み結合文字列）から薙刀式のかなを解決する。
 * physical モードの Phase 2（#3）で、単独打鍵に限らず全 inputType の同時打鍵を
 * release ベースで判定するために使う。
 *
 * 【注意】これはアプリ内に持つ「低忠実度の第二の薙刀式エンジン」であり、
 * 本物（Karabiner / DvorakJ 等）とはタイミング・同時性判定が異なる。
 * 位置づけは「変換ツール導入前のお試し練習」に限定される。
 */

// inputType の優先度（衝突時は first-wins）: single→shifted→dakuten/handakuten→kogaki→combo
const PRIORITY: Record<InputType, number> = {
  single: 0,
  shifted: 1,
  dakuten: 2,
  handakuten: 2,
  kogaki: 3,
  combo: 4,
};

// 非かなエントリ（機能・記号系）で、全角カタカナのみで構成されるため
// 文字種フィルタをすり抜けてしまうものの明示的な除外リスト。
const EXCLUDED_KANA = new Set(["スペースキー", "ひらがな"]);

/**
 * 練習対象となる「かな」出力のみを許可する。
 * ひらがな・カタカナ・長音符（ー）だけで構成される文字列を対象とし、
 * 漢字・記号・機能ラベル（「新」「確定↓」「行頭□戻し」等）を除外する。
 */
function isKanaOutput(kana: string): boolean {
  if (EXCLUDED_KANA.has(kana)) return false;
  // ひらがな(3041-3096) / カタカナ(30A1-30FA) / 長音符ー(30FC)
  return /^[ぁ-ゖァ-ヺー]+$/.test(kana);
}

/** Karabinerキー配列を event.code の集合に変換（未対応キーがあれば null） */
function toEventCodes(keys: string[], inputType: InputType): string[] | null {
  const codes: string[] = [];
  for (const k of keys) {
    const code = KARABINER_TO_EVENT_CODE[k];
    if (!code) return null;
    codes.push(code);
  }
  // shifted は keys に spacebar を含まないため、Space を集合に補う（例: む = {Space, KeyW}）
  if (inputType === "shifted") {
    codes.push("Space");
  }
  return codes;
}

/** ソート済みの event.code 集合を索引キー文字列にする（例: "KeyH+KeyJ+KeyR"） */
function chordKey(codes: string[]): string {
  return [...new Set(codes)].sort().join("+");
}

// 索引キー → かな のマップを優先度順に構築（first-wins）
const chordToKana = new Map<string, string>();
// 全エントリ（キー集合 → かな）。目標照合の「拡張可能性」判定に使う。
const entries: { keySet: Set<string>; kana: string }[] = [];

const sorted = [...naginataMappings].sort((a, b) => {
  const pa = PRIORITY[a.inputType] ?? 99;
  const pb = PRIORITY[b.inputType] ?? 99;
  if (pa !== pb) return pa - pb;
  return a.keys.length - b.keys.length;
});

for (const m of sorted) {
  if (!isKanaOutput(m.kana)) continue;
  const codes = toEventCodes(m.keys, m.inputType);
  if (!codes) continue;
  const key = chordKey(codes);
  if (!chordToKana.has(key)) {
    chordToKana.set(key, m.kana);
    entries.push({ keySet: new Set(codes), kana: m.kana });
  }
}

/**
 * 押された物理キー（event.code）の集合から薙刀式のかなを解決する。
 * @param codes event.code の配列（順不同・重複可）
 * @returns 対応するかな。見つからない場合は null
 */
export function resolveChordToKana(codes: string[]): string | null {
  if (codes.length === 0) return null;
  return chordToKana.get(chordKey(codes)) ?? null;
}

/** a が b の（同集合含む）部分集合か */
function isSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size > b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export interface ChordTargetMatch {
  /** クラスタが目標かな（現在位置から）に一致した場合のかな。なければ null */
  kana: string | null;
  /**
   * クラスタにさらにキーを足せば、目標に一致する（より長い）かなになりうるか。
   * true の間は確定を保留し、後続キーを待つ（例: じ の途中で じゃ になりうる）。
   */
  canExtend: boolean;
}

/**
 * 現在押されているキー集合（cluster）を、目標テキストの現在位置以降（targetTail）と照合する。
 *
 * 練習アプリでは「次に打つべきかな」が既知なので、cluster がその位置のかなに一致した
 * 時点で確定できる。これによりタイミングに依存せず、かつ プレフィックス問題
 * （あ=J が ど=J+D の部分集合）も目標側で一意に解決される。
 */
export function matchChordToTarget(
  clusterKeys: string[],
  targetTail: string
): ChordTargetMatch {
  const cluster = new Set(clusterKeys);
  const exact = resolveChordToKana(clusterKeys);
  const kana = exact && targetTail.startsWith(exact) ? exact : null;

  // cluster の真部分集合（＝さらにキーを足せる）で、目標に一致するより長いかなが
  // 存在するか。存在すれば確定を保留して後続キーを待つ。
  let canExtend = false;
  for (const e of entries) {
    if (e.keySet.size <= cluster.size) continue; // 真の上位集合のみ
    if (!isSubset(cluster, e.keySet)) continue;
    if (targetTail.startsWith(e.kana)) {
      canExtend = true;
      break;
    }
  }

  return { kana, canExtend };
}
