/**
 * シード付き乱数（mulberry32）
 *
 * 言霊札の抽選はすべてこのモジュールを経由する。状態（32bit整数）を引数で受け取り
 * [値, 次状態] を返す純関数群で、RunState.rngState に状態を持たせることで
 * ラン再現・Node上のバランスシミュレーションを可能にする。
 *
 * 【規律】lib/fuda 配下で Math.random() を使わないこと（再現性が壊れる）。
 */

/** [0,1) の乱数と次状態を返す */
export function next(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, t | 0];
}

/** [0, n) の整数と次状態を返す */
export function nextInt(state: number, n: number): [number, number] {
  const [v, s] = next(state);
  return [Math.floor(v * n), s];
}

/** 配列から1要素を選ぶ（空配列は null） */
export function pick<T>(state: number, arr: readonly T[]): [T | null, number] {
  if (arr.length === 0) return [null, state];
  const [i, s] = nextInt(state, arr.length);
  return [arr[i], s];
}

/** Fisher-Yates シャッフル（新しい配列を返す） */
export function shuffle<T>(state: number, arr: readonly T[]): [T[], number] {
  const out = [...arr];
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, ns] = nextInt(s, i + 1);
    s = ns;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, s];
}

/** 文字列や任意の整数から初期シードを作る */
export function seedFrom(n: number): number {
  // 0 でも十分拡散するよう1回混ぜる
  return next(n | 0)[1];
}
