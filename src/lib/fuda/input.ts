/**
 * physical モードの同時打鍵を手札の複数候補と照合する
 *
 * 言霊ディフェンスの matchChordToEnemies（lib/game/engine.ts）の手札版。
 * 優先規則が「結界に近い敵（y座標）」→「手札の左端（handIndex）」に変わるため、
 * 共通化せず独立に持つ（判定の中身は matchChordToTarget に委譲している）。
 * このモジュールは hooks/useFudaGame の chord 層（reducer の外）から呼ばれる。
 */

import { matchChordToTarget } from "@/lib/resolve-chord-to-kana";

/** chord 照合の候補（入力中はその札のみ、未入力時は手札全体） */
export interface HandChordCandidate {
  handIndex: number;
  /** 未入力部分（word.slice(charProgress)） */
  tail: string;
}

export interface HandChordResult {
  /** 確定または保留の対象。null は「どの札にも一致していない」 */
  match: { handIndex: number; kana: string } | null;
  /** さらにキーを足すとより長いかなに一致しうるか（確定保留の判定） */
  canExtend: boolean;
}

/**
 * 押下中のキー集合を手札候補の目標かなと照合する。
 * より長いかなに一致した候補を最優先、同長なら左端の札を優先する。
 */
export function matchChordToHand(
  clusterKeys: string[],
  candidates: HandChordCandidate[]
): HandChordResult {
  let best: { handIndex: number; kana: string } | null = null;
  let canExtend = false;

  for (const c of candidates) {
    const result = matchChordToTarget(clusterKeys, c.tail);
    if (result.canExtend) canExtend = true;
    if (result.kana === null) continue;
    if (
      best === null ||
      result.kana.length > best.kana.length ||
      (result.kana.length === best.kana.length && c.handIndex < best.handIndex)
    ) {
      best = { handIndex: c.handIndex, kana: result.kana };
    }
  }

  return { match: best, canExtend };
}
