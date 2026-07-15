/**
 * 言霊札（ことだまふだ）— Balatro型タイピング・ローグライクの型定義
 *
 * 8幕（アンテ）× 3勝負（序戦・破戦・急戦=ボス）を、単語札のデッキと
 * お守り（ジョーカー）のビルドで勝ち抜くスコアアタック。
 * ロジックの中心は純粋 reducer（lib/fuda/engine.ts）で、この型群が状態の全てを表す。
 */

/**
 * かなの入力属性。薙刀式の入力タイプをスコアリングの「スート」として扱う。
 * physical モードは実際の確定単位から、IME モードは正準セグメンテーションから決まる。
 */
export type KanaAttr =
  | "seion" // 清音（単打）
  | "dakuten" // 濁点同時押し
  | "handakuten" // 半濁点同時押し
  | "kogaki" // 小書き同時押し
  | "shifted" // スペースシフト面
  | "combo"; // 複数キー同時押し（拗音など）

export type FudaPhase =
  | "menu"
  | "roundIntro"
  | "round"
  | "roundResult"
  | "shop"
  | "runClear"
  | "runFail";

/** 役の識別子 */
export type YakuId =
  | "choka" // 長歌: 6かな以上
  | "hayate" // 疾風: 全単位チョード（2単位以上）
  | "dakuryu" // 濁流: 濁点3+
  | "haon" // 破音: 半濁点1+
  | "jougo" // 畳語: 前半と後半が同じ繰り返し語（ざわざわ 等）
  | "ukifune" // 浮舟: シフト4+
  | "hayawaza" // 早業: 平均打鍵間隔が閾値未満
  | "mushin" // 無心: ノーミス連続語ボーナス
  | "hitomoji"; // 一文字: 1〜2かなの短語

/** お守り（ジョーカー）の識別子 */
export type CharmId =
  // 並
  | "dakutenObi" // 濁点の帯
  | "seionObi" // 静音の帯
  | "kazeObi" // 風の帯
  | "sokuonObi" // 促音の帯
  | "homuraObi" // 焔の帯
  | "tameTokkuri" // 貯め徳利
  | "nagaiki" // 長息
  | "yokenNoMe" // 予見の眼
  // 稀
  | "renju" // 連珠
  | "nigorizake" // 濁り酒
  | "shinsokuNoSuzu" // 神速の鈴
  | "yamabiko" // 山彦
  | "tanto" // 短刀
  | "nagamaki" // 長巻
  | "sukimakaze" // 隙間風
  | "soroban" // 商人の算盤
  | "glassOmamori" // ガラスの御守
  | "keikofuda" // 稽古札
  // 伝説
  | "ryuNoHoko" // 龍の咆哮
  | "kotodamaNoUtsuwa"; // 言霊の器

export type CharmRarity = "common" | "rare" | "legendary";

/** ボス（急戦）ルールの識別子 */
export type BossId =
  | "oozeki" // 大関: ノルマ増
  | "seionFuji" // 清音封じ: 清音チップ0
  | "kokugen" // 刻限: 時間制限
  | "ippatsu" // 一発勝負: 引き直し不可
  | "kasumi" // 霞: 次に打つかな以外伏せ字
  | "dokugiri" // 毒霧: ミスで現在語チップ半減
  | "jubaku"; // 呪縛: お守り1枠封印

/** 御札（使い切りアイテム）の識別子 */
export type OfudaId =
  | "haraegushi" // 祓串: デッキから1語削除
  | "shakyo" // 写経: 手札1語を複製追加
  | "oikaze" // 追い風: 次勝負ノルマ-25%
  | "senjafuda" // 千社札: ランダム稀お守り獲得
  | "ryogae" // 両替: +5文
  | "kaigen"; // 開眼: ランダム巻物即時使用

/** 流派（初期デッキ型）の識別子 */
export type SchoolId = "kata" | "dakuryu" | "hayate";

/** 実績の識別子（アンロック条件。M3で確定） */
export type AchievementId = string;

/** 単語札。units/attrs は word から導出した正準セグメンテーションのキャッシュ */
export interface WordCardData {
  uid: number;
  word: string;
  /** 入力単位（例: "きしゃ" → ["き", "しゃ"]） */
  units: string[];
  /** 各単位の正準属性 */
  attrs: KanaAttr[];
}

/** 確定済み入力単位の結果（実測。physical はチョード確定単位、IME は正準単位） */
export interface UnitResult {
  unit: string;
  attr: KanaAttr;
  chips: number;
  /** 直前の単位確定からの間隔（最初の単位は 0） */
  intervalMs: number;
}

/** 入力中の単語札の進行状態 */
export interface ActiveWordPlay {
  cardUid: number;
  /** 進行の真実（word の文字インデックス）。IME/physical 共通 */
  charProgress: number;
  unitResults: UnitResult[];
  /** リアルタイム加算済みチップ（毒霧ボスの半減対象） */
  chipsSoFar: number;
  missCount: number;
  startedAt: number;
  lastUnitAt: number;
}

/** 勝負（ラウンド）の状態 */
export interface RoundState {
  quota: number;
  scored: number;
  handsLeft: number;
  discardsLeft: number;
  /** 山札（デッキの uid、シャッフル済み） */
  drawPile: number[];
  /** 手札（uid、最大8枚） */
  hand: number[];
  /** 数字キーで選択中の手札 index（捨て札・打札候補の絞り込みに使う） */
  selected: number[];
  active: ActiveWordPlay | null;
  /** 刻限ボスの締切（イベント timestamp 基準）。それ以外は null */
  deadlineAt: number | null;
  /** 呪縛ボスで封印されたお守り slot（この勝負中フックが呼ばれない）。それ以外は null */
  sealedCharmIndex: number | null;
}

/** 所持お守り。counter はスケーリング系お守りの成長値（意味は def が解釈） */
export interface CharmInstance {
  id: CharmId;
  counter: number;
}

/** 勝負クリア時の報酬内訳（roundResult 画面の行別表示用） */
export interface RewardBreakdown {
  base: number;
  remainingHands: number;
  interest: number;
  total: number;
}

/** ラン累計統計（スケーリングお守り・実績・リザルト表示用） */
export interface RunStats {
  kanaTyped: number;
  missCount: number;
  wordsCompleted: number;
  attrCounts: Record<KanaAttr, number>;
  bestWordScore: number;
  maxNoMissStreak: number;
  yakuCounts: Partial<Record<YakuId, number>>;
}

/** seq 採番前の演出イベント（scoring が生成し、reducer が採番する） */
export type FxDraft =
  | { kind: "unitChip"; unit: string; attr: KanaAttr; chips: number }
  | { kind: "miss" }
  | {
      kind: "yaku";
      yakuId: YakuId;
      name: string;
      level: number;
      chips: number;
      mult: number;
    }
  | { kind: "charmProc"; charmIndex: number; charmId: CharmId; label: string }
  | { kind: "charmBreak"; charmIndex: number; charmId: CharmId }
  | { kind: "wordScore"; word: string; chips: number; mult: number; total: number };

/** 演出イベント。reducer が採点と同時に積み、UI が順次再生する（追記専用） */
export type FxEvent = FxDraft & { seq: number };

/** ショップの品揃え */
export interface ShopState {
  charmOffers: { charmId: CharmId; price: number; sold: boolean }[];
  ofudaOffer: { ofudaId: OfudaId; price: number; sold: boolean } | null;
  scrollOffer: { yakuId: YakuId; price: number; sold: boolean } | null;
  packPrice: number;
  packSold: boolean;
  /** 単語パック購入後、3語から1語を選ぶ状態 */
  packChoice: string[] | null;
  /** 御札（祓串/写経）使用後のデッキ操作待ち */
  pendingAction: "remove" | "copy" | null;
  removePrice: number;
  rerollPrice: number;
}

/** ラン全体の状態（phase を含む唯一の真実） */
export interface RunState {
  phase: FudaPhase;
  seed: number;
  /** シード付き乱数の現在状態。抽選のたびに更新される（純 reducer の鍵） */
  rngState: number;
  /** 段位（1..5）。難易度モディファイア */
  stake: number;
  schoolId: SchoolId;
  /** 単語範囲（レッスン1-8）。デッキ構築と表示に使う */
  lessonLevel: number;
  /** レッスン範囲でフィルタ済みの単語プール（単語パックの抽選元） */
  wordPool: string[];
  /** デッキに札を追加するときの次の uid */
  nextCardUid: number;
  /** 次の勝負のノルマ倍率（御札「追い風」。勝負開始で 1 に戻る） */
  pendingQuotaMult: number;
  /** アンロック済みお守り（ショップ抽選に使う。ラン開始時にメタからスナップショット） */
  unlockedCharms: CharmId[];
  /** 幕（1..8） */
  ante: number;
  /** 勝負種別（0=序戦, 1=破戦, 2=急戦） */
  roundIndex: 0 | 1 | 2;
  /** この幕の急戦で適用されるボスルール */
  bossId: BossId | null;
  /** 出現済みボスの履歴（抽選の偏り防止） */
  bossHistory: BossId[];
  money: number;
  deck: WordCardData[];
  charms: CharmInstance[];
  ofudas: OfudaId[];
  /** 役レベル（巻物で上昇。未記載は Lv1） */
  yakuLevels: Partial<Record<YakuId, number>>;
  /** ノーミスで打ち切った語の連続数（勝負を跨いで持続、ミスで0） */
  noMissStreak: number;
  /** 直前に打ち切った語で成立した役（山彦の判定用） */
  lastYakuIds: YakuId[];
  stats: RunStats;
  round: RoundState | null;
  shop: ShopState | null;
  /** roundResult 表示用。勝利時のみセット */
  roundReward: RewardBreakdown | null;
  fxQueue: FxEvent[];
  fxSeq: number;
}

// ── コンテンツ定義（データ + 型付きイベントフック） ──

/** お守りフックの戻り値: スコア/所持金への増分と演出用ラベル */
export interface Activation {
  chips?: number;
  /** チップ全体への倍率（長巻等）。multTimes より先に chips へ適用される */
  chipsTimes?: number;
  multAdd?: number;
  multTimes?: number;
  money?: number;
  /** 演出用の短い表示（例: "+15", "×1.5"） */
  label: string;
  /** スケーリングお守りの counter 増分 */
  counterDelta?: number;
  /** true でこのお守りは破壊される（ガラスの御守） */
  break?: boolean;
}

/** お守りフックに渡す読み取り専用コンテキスト */
export interface CharmCtx {
  run: Readonly<RunState>;
  round: Readonly<RoundState> | null;
  /** 語スコープのフック（onWordScored 等）で有効 */
  play?: Readonly<ActiveWordPlay>;
  /** onWordScored で有効（対象の単語札） */
  card?: Readonly<WordCardData>;
  /** onWordScored で有効（この語で成立した役のID） */
  yakuHits?: readonly YakuId[];
  /** onUnitScored で有効 */
  unit?: Readonly<Pick<UnitResult, "unit" | "attr">>;
  self: Readonly<CharmInstance>;
}

/** 勝負の構成値（ボス・お守り・段位が修飾する） */
export interface RoundConfig {
  quota: number;
  hands: number;
  discards: number;
  timeLimitMs: number | null;
}

export interface CharmDef {
  id: CharmId;
  name: string;
  /** 絵文字アイコン（依存ライブラリを増やさないため） */
  icon: string;
  rarity: CharmRarity;
  price: number;
  /** counter（スケーリング値）込みの説明文を返す */
  describe(counter: number): string;
  /** アンロック条件。undefined は初期解放 */
  unlock?: AchievementId;
  /** true なら counter を勝負開始時に 0 リセットする（勝負内累積系） */
  counterResetsPerRound?: boolean;
  /** 勝負の構成値を修飾（長息=手数+2 等） */
  modifyRoundConfig?(config: RoundConfig): RoundConfig;
  // 以下のフックはすべて純関数。null は「発動なし」
  onUnitScored?(ctx: CharmCtx): Activation | null;
  onWordScored?(ctx: CharmCtx): Activation | null;
  onMiss?(ctx: CharmCtx): Activation | null;
  onRoundStart?(ctx: CharmCtx): Activation | null;
  onRoundEnd?(ctx: CharmCtx): Activation | null;
  onDiscard?(ctx: CharmCtx): Activation | null;
}

export interface YakuDef {
  id: YakuId;
  name: string;
  description: string;
  check(card: WordCardData, play: ActiveWordPlay, run: RunState): boolean;
  base: { chips: number; mult: number };
  /** 巻物レベル1につき加算される分 */
  perLevel: { chips: number; mult: number };
}

export interface BossDef {
  id: BossId;
  name: string;
  icon: string;
  description: string;
  modifyRoundConfig?(config: RoundConfig): RoundConfig;
  /** かな1確定のチップを修飾（清音封じ等） */
  modifyUnitChips?(attr: KanaAttr, chips: number): number;
  flags?: {
    /** 手札の単語を伏せ字表示（霞） */
    maskHand?: boolean;
    /** ミス時に入力中チップ半減（毒霧） */
    halveChipsOnMiss?: boolean;
    /** お守り1枠をランダム封印（呪縛） */
    sealCharm?: boolean;
  };
}

/** 御札（使い切りアイテム）の定義 */
export interface OfudaDef {
  id: OfudaId;
  name: string;
  icon: string;
  description: string;
  canUse(run: RunState): boolean;
  /** 使用効果。抽選が要る場合は rngState を消費した新しい RunState を返す */
  apply(run: RunState): RunState;
}

// ── reducer イベント ──

export type FudaEvent =
  | {
      type: "startRun";
      seed: number;
      lessonLevel: number;
      /** レッスン範囲でフィルタ済みの単語プール */
      wordPool: string[];
      stake?: number;
      schoolId?: SchoolId;
      unlockedCharms?: CharmId[];
    }
  | { type: "beginRound"; at: number }
  | { type: "charTyped"; char: string; at: number; keyCode?: string }
  | {
      type: "unitTyped";
      handIndex: number;
      unit: string;
      attr: KanaAttr;
      at: number;
    }
  | { type: "chordMiss"; at: number }
  | { type: "toggleSelect"; index: number }
  | { type: "discardSelected"; at: number }
  | { type: "abortWord" }
  | { type: "timeUp"; at: number }
  | { type: "confirmRoundResult"; at: number }
  // ── ショップ ──
  | { type: "buyCharm"; index: number }
  | { type: "buyOfuda" }
  | { type: "buyScroll" }
  | { type: "buyPack" }
  | { type: "pickPackWord"; word: string }
  | { type: "sellCharm"; slot: number }
  | { type: "rerollShop" }
  | { type: "removeDeckWord"; uid: number }
  | { type: "copyDeckWord"; uid: number }
  | { type: "useOfuda"; slot: number }
  | { type: "leaveShop" }
  // ── 永続化 ──
  | { type: "restoreRun"; run: RunState }
  | { type: "backToMenu" };

// ── 永続化（natype:fuda） ──

/** メタ進行（段位解放・アンロック・累計統計） */
export interface FudaMeta {
  soundEnabled: boolean;
  /** 解放済み最高段位（1..5） */
  stakeUnlocked: number;
  unlockedCharms: CharmId[];
  unlockedSchools: SchoolId[];
  /** 実績ID → 達成タイムスタンプ */
  achievements: Partial<Record<AchievementId, number>>;
  stats: {
    totalRuns: number;
    wins: number;
    bestAnte: number;
    winsByStake: Record<string, number>;
    totalKana: number;
  };
}

export interface FudaSave {
  version: 1;
  meta: FudaMeta;
  /** ラン途中セーブ（roundIntro / shop 境界のチェックポイント）。JSON化された RunState 断片 */
  currentRun: unknown | null;
}
