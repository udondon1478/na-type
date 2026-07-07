/** 物理キーコード（KeyboardEvent.code値） */
export type PhysicalKeyCode = string;

/** 入力の種類 */
export type InputType =
  | "single"
  | "shifted"
  | "dakuten"
  | "handakuten"
  | "kogaki"
  | "combo";

/** 1つのかなマッピング */
export interface KanaMapping {
  /** 出力されるかな（例: "き", "ざ", "にゃ"） */
  kana: string;
  /** 入力の種類 */
  inputType: InputType;
  /** 押すべきKarabinerキーコード（同時押しの場合は複数） */
  keys: string[];
  /** Karabinerが送信するローマ字シーケンス */
  romajiSequence: string[];
  /** description原文 */
  description: string;
}

/** キーボードレイアウト全体 */
export interface KeyboardLayout {
  name: string;
  version: string;
  /** 全マッピング */
  mappings: KanaMapping[];
}

/** 物理キーボードのキー配置情報（描画用） */
export interface PhysicalKeyInfo {
  /** Karabinerのkey_code */
  karabinerCode: string;
  /** KeyboardEvent.code */
  eventCode: PhysicalKeyCode;
  /** QWERTY表示ラベル */
  qwertyLabel: string;
  /** SVG座標 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** キー行（0=Q行, 1=A行, 2=Z行, 3=最下段/Space） */
  row: number;
  /** 左手/右手 */
  hand: "left" | "right";
  /** 使用する指 */
  finger: "pinky" | "ring" | "middle" | "index" | "thumb";
}

/** Arensitoのキーマッピング（単純な1:1置換） */
export interface ArensitoMapping {
  /** 元のQWERTYキー */
  fromKey: string;
  /** 出力される文字 */
  toChar: string;
  /** シンボルレイヤーの文字（あれば） */
  symbolChar?: string;
}

/** Arensitoレイアウト */
export interface ArensitoLayout {
  name: string;
  baseLayer: ArensitoMapping[];
  symbolLayer: ArensitoMapping[];
}
