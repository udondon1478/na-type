/**
 * 言霊札の全チューニング定数
 *
 * 横断的な曲線・経済・タイミングはすべてここに集約する（調整パスが1ファイルで済む）。
 * お守り・役など個別コンテンツ固有の数値は各 def 内に直書きする方針
 * （1画面で1コンテンツを読める方が調整しやすい）。
 */

/** 段位（アセンション）のモディファイア */
export interface StakeMod {
  name: string;
  description: string;
  quotaMult: number;
  handsDelta: number;
  discardsDelta: number;
  /** ショップ価格倍率 */
  priceMult: number;
  /** 破戦にもボスルールが出現する */
  bossInHasen: boolean;
}

export const BALANCE = {
  hand: {
    size: 8,
    handsPerRound: 10,
    discardsPerRound: 3,
    charmSlots: 5,
    ofudaSlots: 2,
  },
  deck: {
    initialSize: 20,
  },
  chips: {
    /** かな1確定の基礎チップ */
    base: 5,
    /** 属性ごとの素の加算（お守りなしでも属性に価値を持たせる） */
    attr: {
      seion: 0,
      shifted: 2,
      dakuten: 3,
      handakuten: 4,
      kogaki: 4,
      combo: 6,
    },
  },
  quota: {
    /** 幕ごとの基準ノルマ（index=幕番号、[0]は未使用） */
    anteBase: [0, 250, 420, 650, 1000, 1500, 2200, 3200, 4500],
    /** 勝負係数（序戦/破戦/急戦） */
    roundFactor: [1, 1.5, 2.2],
  },
  economy: {
    initialMoney: 4,
    /** 勝負クリアの基本報酬（序戦/破戦/急戦） */
    roundReward: [3, 4, 5],
    /** 残手数1つあたりのボーナス文銭 */
    perRemainingHand: 1,
    /** 所持金この額ごとに利子+1文 */
    interestPer: 5,
    interestCap: 5,
    /** お守り売却の価格倍率 */
    sellRatio: 0.5,
  },
  shop: {
    rerollBase: 2,
    rerollStep: 1,
    packPrice: 4,
    removePrice: 3,
    scrollPrice: 5,
    ofudaPrice: 3,
    /** ショップに並ぶお守りの数 */
    charmSlots: 2,
  },
  rarity: {
    common: 70,
    rare: 25,
    legendary: 5,
  },
  yaku: {
    /** 無心に必要なノーミス連続語数 */
    mushinStreak: 5,
    /** 早業の平均打鍵間隔閾値（ms）。200kpm弱から届く値にする（速度の崖を作らない） */
    hayawazaAvgMs: 320,
    /** 早業の最低かな数 */
    hayawazaMinKana: 4,
  },
  timing: {
    /** physical モードの同時打鍵確定保留（useTypingSession と同義） */
    chordSettleMs: 50,
    /** 演出（fx）再生の間隔 */
    fxStepMs: 120,
    /** 刻限ボスの制限時間 */
    bossTimeLimitMs: 60_000,
  },
  /** 段位1..5（index 0 = 初段） */
  stakes: [
    {
      name: "初段",
      description: "基準の難易度",
      quotaMult: 1,
      handsDelta: 0,
      discardsDelta: 0,
      priceMult: 1,
      bossInHasen: false,
    },
    {
      name: "二段",
      description: "ノルマ +20%",
      quotaMult: 1.2,
      handsDelta: 0,
      discardsDelta: 0,
      priceMult: 1,
      bossInHasen: false,
    },
    {
      name: "三段",
      description: "ノルマ +20%、手数 -1、引き直し -1",
      quotaMult: 1.2,
      handsDelta: -1,
      discardsDelta: -1,
      priceMult: 1,
      bossInHasen: false,
    },
    {
      name: "四段",
      description: "三段に加え、ショップ価格 +50%",
      quotaMult: 1.2,
      handsDelta: -1,
      discardsDelta: -1,
      priceMult: 1.5,
      bossInHasen: false,
    },
    {
      name: "五段",
      description: "四段に加え、破戦にもボスルールが出現",
      quotaMult: 1.2,
      handsDelta: -1,
      discardsDelta: -1,
      priceMult: 1.5,
      bossInHasen: true,
    },
  ] satisfies StakeMod[],
  run: {
    finalAnte: 8,
  },
} as const;

/** 段位番号（1..5）からモディファイアを取得 */
export function stakeMod(stake: number): StakeMod {
  return BALANCE.stakes[Math.min(Math.max(stake, 1), BALANCE.stakes.length) - 1];
}
