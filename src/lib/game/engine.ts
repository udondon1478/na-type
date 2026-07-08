import { matchChordToTarget } from "@/lib/resolve-chord-to-kana";

/**
 * 言霊ディフェンスの純粋ロジック（ウェーブ構成・単語抽選・スコア・chord照合）
 *
 * 時間・乱数以外の副作用を持たない関数群。状態遷移は useKotodamaGame が担う。
 */

export interface WaveConfig {
  /** このウェーブで出現する敵の総数 */
  enemyCount: number;
  /** 敵の出現間隔（ミリ秒） */
  spawnIntervalMs: number;
  /** 基準降下速度（%/秒）。個体ごとにジッターがかかる */
  baseSpeed: number;
  /** 出現する単語の最大かな数 */
  maxWordLen: number;
}

export function getWaveConfig(wave: number): WaveConfig {
  return {
    enemyCount: 5 + wave * 2,
    spawnIntervalMs: Math.max(2600 - wave * 150, 900),
    baseSpeed: 3.2 + wave * 0.55,
    maxWordLen: Math.min(3 + wave, 8),
  };
}

/**
 * 出現させる単語を抽選する。
 * ロック（先頭かな一致）が一意に決まるよう、画面上の敵と先頭かなが被らない単語を優先する。
 */
export function sampleWord(
  pool: string[],
  maxWordLen: number,
  activeFirstKana: Set<string>
): string | null {
  if (pool.length === 0) return null;
  const shortEnough = pool.filter((w) => w.length <= maxWordLen);
  const candidates = shortEnough.length > 0 ? shortEnough : pool;
  const preferred = candidates.filter((w) => !activeFirstKana.has(w[0]));
  const source = preferred.length > 0 ? preferred : candidates;
  return source[Math.floor(Math.random() * source.length)];
}

/** 個体速度: 基準速度に ±15% のジッター。長い単語ほどわずかに遅くする */
export function rollEnemySpeed(baseSpeed: number, wordLen: number): number {
  const jitter = 0.85 + Math.random() * 0.3;
  const lengthFactor = 1 - Math.min(wordLen - 2, 6) * 0.04;
  return baseSpeed * jitter * Math.max(lengthFactor, 0.7);
}

/** かな1文字の正解スコア（コンボ倍率込み） */
export function kanaScore(combo: number, comboRate: number): number {
  return Math.round(10 * (1 + combo * comboRate));
}

/** 単語撃破ボーナス。ノーミスなら2倍 */
export function killBonus(wordLen: number, noMiss: boolean): number {
  return wordLen * 30 * (noMiss ? 2 : 1);
}

/** ウェーブクリアボーナス（残HPを評価） */
export function waveClearBonus(wave: number, hp: number): number {
  return wave * 100 + hp * 20;
}

/** chord 照合の対象候補（ロック中はロック敵のみ、未ロックは全敵） */
export interface ChordCandidate {
  enemyId: number;
  /** 未入力部分（word.slice(typed)） */
  tail: string;
  /** 進行度。複数一致時は結界に近い敵を優先するために使う */
  y: number;
}

export interface GameChordResult {
  /** 確定または保留の対象。null は「どの敵にも一致していない」 */
  match: { enemyId: number; kana: string } | null;
  /**
   * さらにキーを足すと（この敵または他の敵で）より長いかなに一致しうるか。
   * true の場合は確定を保留して後続キーを待つ（レッスンモードの canExtend と同じ扱い）。
   */
  canExtend: boolean;
}

/**
 * physical モード: 押下中のキー集合を複数の敵の目標かなと照合する。
 *
 * レッスンモードの matchChordToTarget（単一目標）を各候補に適用した拡張。
 * 一致した敵が複数いる場合は結界に近い（y が大きい）敵を優先する。
 * どれか1つでも「伸びうる」候補があれば canExtend=true とし、確定は呼び出し側の
 * settle タイマー／全キー解放に委ねる（例: 「じ」の敵と「じゃ」の敵が並んでいる場合）。
 */
export function matchChordToEnemies(
  clusterKeys: string[],
  candidates: ChordCandidate[]
): GameChordResult {
  let best: { enemyId: number; kana: string; y: number } | null = null;
  let canExtend = false;

  for (const c of candidates) {
    const result = matchChordToTarget(clusterKeys, c.tail);
    if (result.canExtend) canExtend = true;
    if (result.kana === null) continue;
    // より長いかなに一致した候補を最優先、同長なら結界に近い敵を優先
    if (
      best === null ||
      result.kana.length > best.kana.length ||
      (result.kana.length === best.kana.length && c.y > best.y)
    ) {
      best = { enemyId: c.enemyId, kana: result.kana, y: c.y };
    }
  }

  return {
    match: best ? { enemyId: best.enemyId, kana: best.kana } : null,
    canExtend,
  };
}
