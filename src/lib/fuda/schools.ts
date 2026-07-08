/**
 * 流派（初期デッキ型）の定義とデッキ構築
 *
 * 流派は語の uid リストではなく「優先語のフィルタ条件」で持つ
 * （レッスン範囲や辞書拡張に自動で追従するため）。
 * 優先語でデッキの過半を確保し、残りはプール全体からランダムに埋める。
 */

import { BALANCE } from "./balance";
import * as rng from "./rng";
import { wordAttrProfile } from "./segment";
import type { KanaAttr, SchoolId } from "@/types/fuda";

export interface SchoolDef {
  id: SchoolId;
  name: string;
  icon: string;
  description: string;
  /** アンロック実績。undefined は初期解放 */
  unlock?: string;
  /** この流派が優先する語か */
  prefer(word: string, profile: Record<KanaAttr, number>): boolean;
}

export const SCHOOL_DEFS: Record<SchoolId, SchoolDef> = {
  kata: {
    id: "kata",
    name: "型",
    icon: "⛩️",
    description: "偏りのない基本のデッキ。まずはここから",
    prefer: () => false,
  },
  dakuryu: {
    id: "dakuryu",
    name: "濁流",
    icon: "🌊",
    description: "濁点・半濁点の多い語を集めたデッキ。濁流・破音・畳語を狙え",
    unlock: "firstClear",
    prefer: (_word, profile) => profile.dakuten + profile.handakuten >= 2,
  },
  hayate: {
    id: "hayate",
    name: "疾風",
    icon: "🌀",
    description: "チョード（同時打鍵）の多い語を集めたデッキ。焔の帯と相性抜群",
    unlock: "stake2Clear",
    prefer: (_word, profile) => profile.combo >= 1,
  },
};

/** 優先デッキ枠（残りはプール全体から埋める） */
const PREFERRED_SLOTS = 12;

/** この単語プールでその流派が成立するか（優先語が一定数あるか） */
export function canUseSchool(schoolId: SchoolId, wordPool: string[]): boolean {
  if (schoolId === "kata") return true;
  const def = SCHOOL_DEFS[schoolId];
  let count = 0;
  for (const w of wordPool) {
    if (def.prefer(w, wordAttrProfile(w))) count++;
    if (count >= PREFERRED_SLOTS) return true;
  }
  return false;
}

/** 流派に従って初期デッキの語を選ぶ */
export function buildSchoolDeckWords(
  state: number,
  schoolId: SchoolId,
  wordPool: string[]
): [string[], number] {
  const def = SCHOOL_DEFS[schoolId];
  let s = state;
  const [shuffled, s2] = rng.shuffle(s, wordPool);
  s = s2;

  const size = Math.min(BALANCE.deck.initialSize, shuffled.length);
  const preferred: string[] = [];
  const rest: string[] = [];
  for (const w of shuffled) {
    if (preferred.length < PREFERRED_SLOTS && def.prefer(w, wordAttrProfile(w))) {
      preferred.push(w);
    } else {
      rest.push(w);
    }
  }
  const words = [...preferred, ...rest].slice(0, size);
  // 優先語が先頭に固まらないよう混ぜ直す
  const [mixed, s3] = rng.shuffle(s, words);
  return [mixed, s3];
}
