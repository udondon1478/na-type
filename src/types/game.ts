/**
 * 言霊ディフェンス（タイピングローグライク）の型定義
 */

/** 強化（レリック）の識別子 */
export type UpgradeId =
  | "shukuchi" // 縮地: 敵の移動速度ダウン
  | "ofuda" // 回復の御札: HP回復
  | "renkeki" // 連撃の心得: コンボ倍率アップ
  | "kekkai" // 結界強化: ウェーブごとに被弾を無効化
  | "tokiyomi" // 時詠み: ノーミス撃破で敵全体が停止
  | "kotodama" // 言霊爆ぜ: 連続正解で最前の敵を消滅
  | "jouka" // 浄化の風: ウェーブ開始時にHP回復
  | "mikiri"; // 見切り: ミス時にコンボが半減で済む

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** 絵文字アイコン（依存ライブラリを増やさないため） */
  icon: string;
  description: string;
  /** 取得可能な最大スタック数。undefined は無制限 */
  maxStacks?: number;
}

export type GamePhase = "menu" | "playing" | "upgrade" | "gameover";

/** 画面上の敵（単語を背負って降下する言霊） */
export interface Enemy {
  id: number;
  word: string;
  /** 確定済みのかな数（word の先頭からの文字数） */
  typed: number;
  /** 横位置（プレイフィールドの %） */
  x: number;
  /** 進行度（0=出現地点, 100=結界到達） */
  y: number;
  /** 降下速度（%/秒） */
  speed: number;
  /** この単語の入力中にミスしたか（ノーミスボーナス判定用） */
  missed: boolean;
}

/** レンダリング用のゲーム状態スナップショット */
export interface GameSnapshot {
  phase: GamePhase;
  paused: boolean;
  wave: number;
  hp: number;
  maxHp: number;
  score: number;
  combo: number;
  maxCombo: number;
  kanaTyped: number;
  missCount: number;
  enemies: Enemy[];
  /** ロック中（入力対象）の敵ID */
  lockedId: number | null;
  /** phase === "upgrade" のときの選択肢 */
  upgradeOptions: UpgradeId[];
  /** 取得済み強化のスタック数 */
  stacks: Partial<Record<UpgradeId, number>>;
  /** このウェーブで残っている結界チャージ（被弾無効化） */
  shieldCharges: number;
  /** 敵全体停止の残りミリ秒（表示用） */
  freezeRemainingMs: number;
  /** このウェーブでまだ出現していない敵数 */
  toSpawn: number;
  /** 言霊爆ぜのゲージ（連続正解かな数） */
  bombGauge: number;
  /** ゲームオーバー時: 自己ベスト更新だったか */
  isNewRecord: boolean;
}

/** localStorage に保存するレベル別のプレイ記録 */
export interface GameRecord {
  highScore: number;
  bestWave: number;
  totalRuns: number;
  lastPlayed: number;
}
