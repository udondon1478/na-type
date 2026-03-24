/**
 * 入力エンジン: 目標テキストに対する入力の検証を行う
 *
 * Karabiner-Elements経由で変換済みのかな文字が入力される前提。
 * IME compositionend経由とdirect keydown経由の両方に対応。
 */

export interface InputResult {
  /** 正しい入力か */
  correct: boolean;
  /** 入力された文字 */
  inputChar: string;
  /** 期待されていた文字 */
  expectedChar: string;
  /** 物理キーコード（取得可能な場合） */
  keyCode?: string;
}

/**
 * 1文字の入力を検証する
 */
export function validateInput(
  inputChar: string,
  expectedChar: string
): InputResult {
  const correct = inputChar === expectedChar;
  return {
    correct,
    inputChar,
    expectedChar,
  };
}

/**
 * IME確定文字列を検証する（複数文字の場合あり）
 */
export function validateCompositionInput(
  composedText: string,
  targetText: string,
  currentPosition: number
): InputResult[] {
  const results: InputResult[] = [];

  for (let i = 0; i < composedText.length; i++) {
    const expectedIndex = currentPosition + i;
    if (expectedIndex >= targetText.length) break;

    results.push(
      validateInput(composedText[i], targetText[expectedIndex])
    );
  }

  return results;
}

/**
 * WPMを計算する（かな/分）
 */
export function calculateWpm(
  correctChars: number,
  elapsedMs: number
): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round(correctChars / minutes);
}

/**
 * 正確率を計算する（%）
 */
export function calculateAccuracy(
  correctChars: number,
  totalAttempts: number
): number {
  if (totalAttempts <= 0) return 100;
  return Math.round((correctChars / totalAttempts) * 1000) / 10;
}
