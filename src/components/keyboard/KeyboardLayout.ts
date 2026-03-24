import type { PhysicalKeyInfo } from "@/types/layout";

const KEY_WIDTH = 48;
const KEY_HEIGHT = 48;
const KEY_GAP = 4;

function key(
  karabinerCode: string,
  qwertyLabel: string,
  row: number,
  col: number,
  hand: "left" | "right",
  finger: PhysicalKeyInfo["finger"],
  width = KEY_WIDTH
): PhysicalKeyInfo {
  // 各行のオフセット（QWERTY配列の段差）
  const rowOffsets = [0, 0, 26, 52];
  const x = rowOffsets[row] + col * (KEY_WIDTH + KEY_GAP);
  const y = row * (KEY_HEIGHT + KEY_GAP);

  // Karabiner key_code → KeyboardEvent.code
  const codeMap: Record<string, string> = {
    q: "KeyQ", w: "KeyW", e: "KeyE", r: "KeyR", t: "KeyT",
    y: "KeyY", u: "KeyU", i: "KeyI", o: "KeyO", p: "KeyP",
    a: "KeyA", s: "KeyS", d: "KeyD", f: "KeyF", g: "KeyG",
    h: "KeyH", j: "KeyJ", k: "KeyK", l: "KeyL", semicolon: "Semicolon",
    z: "KeyZ", x: "KeyX", c: "KeyC", v: "KeyV", b: "KeyB",
    n: "KeyN", m: "KeyM", comma: "Comma", period: "Period", slash: "Slash",
    spacebar: "Space",
  };

  return {
    karabinerCode,
    eventCode: codeMap[karabinerCode] ?? karabinerCode,
    qwertyLabel,
    x,
    y,
    width,
    height: KEY_HEIGHT,
    row,
    hand,
    finger,
  };
}

// 行1: Q行
const row1: PhysicalKeyInfo[] = [
  key("q", "Q", 0, 0, "left", "pinky"),
  key("w", "W", 0, 1, "left", "ring"),
  key("e", "E", 0, 2, "left", "middle"),
  key("r", "R", 0, 3, "left", "index"),
  key("t", "T", 0, 4, "left", "index"),
  key("y", "Y", 0, 5, "right", "index"),
  key("u", "U", 0, 6, "right", "index"),
  key("i", "I", 0, 7, "right", "middle"),
  key("o", "O", 0, 8, "right", "ring"),
  key("p", "P", 0, 9, "right", "pinky"),
];

// 行2: A行（ホームポジション）
const row2: PhysicalKeyInfo[] = [
  key("a", "A", 1, 0, "left", "pinky"),
  key("s", "S", 1, 1, "left", "ring"),
  key("d", "D", 1, 2, "left", "middle"),
  key("f", "F", 1, 3, "left", "index"),
  key("g", "G", 1, 4, "left", "index"),
  key("h", "H", 1, 5, "right", "index"),
  key("j", "J", 1, 6, "right", "index"),
  key("k", "K", 1, 7, "right", "middle"),
  key("l", "L", 1, 8, "right", "ring"),
  key("semicolon", ";", 1, 9, "right", "pinky"),
];

// 行3: Z行
const row3: PhysicalKeyInfo[] = [
  key("z", "Z", 2, 0, "left", "pinky"),
  key("x", "X", 2, 1, "left", "ring"),
  key("c", "C", 2, 2, "left", "middle"),
  key("v", "V", 2, 3, "left", "index"),
  key("b", "B", 2, 4, "left", "index"),
  key("n", "N", 2, 5, "right", "index"),
  key("m", "M", 2, 6, "right", "index"),
  key("comma", ",", 2, 7, "right", "middle"),
  key("period", ".", 2, 8, "right", "ring"),
  key("slash", "/", 2, 9, "right", "pinky"),
];

export const KEYBOARD_KEYS: PhysicalKeyInfo[] = [...row1, ...row2, ...row3];

export const KEYBOARD_WIDTH =
  Math.max(...KEYBOARD_KEYS.map((k) => k.x + k.width)) + 8;
export const KEYBOARD_HEIGHT =
  Math.max(...KEYBOARD_KEYS.map((k) => k.y + k.height)) + 8;

/** Karabinerキーコードから物理キー情報を取得 */
export const keyByKarabinerCode = new Map<string, PhysicalKeyInfo>(
  KEYBOARD_KEYS.map((k) => [k.karabinerCode, k])
);

/** 薙刀式v14のかなラベル（単独入力のみ） */
export const NAGINATA_KANA_LABELS: Record<string, string> = {
  // 上段（Q行）
  q: "ゔ", w: "き", e: "て", r: "し", t: "っ",
  y: "っ", u: "る", i: "す", o: "は", p: "く",
  // 中段（A行・ホームポジション）
  a: "ろ", s: "け", d: "と", f: "か", g: "っ",
  h: "く", j: "あ", k: "い", l: "う", semicolon: "ー",
  // 下段（Z行）
  z: "ほ", x: "ひ", c: "こ", v: "そ", b: "た",
  n: "な", m: "ん", comma: "ら", period: "れ", slash: "ー",
};
