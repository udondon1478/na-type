/**
 * 言霊札バランスシミュレータ
 *
 * 実行: npx tsx scripts/fuda-sim.ts [runs]
 *
 * ボット（打鍵速度 kpm・正確率・素朴な札選択とショップ戦略）でランを大量に走らせ、
 * 段位×プレイヤープロファイル別のクリア率と平均到達幕を表にする。
 * reducer が純関数＆シードRNGなので、UI なしで実プレイと同一のロジックが走る。
 *
 * 調整目標:
 * - 初段: 中級（200kpm/97%）＋素朴な戦略で 5割前後クリアできる
 * - 五段: 上級（300kpm/98.5%）でもビルドを選ばないと厳しい
 */

import { wordDictionary } from "../src/data/naginata/words";
import { createRun, fudaReducer } from "../src/lib/fuda/engine";
import { wordAttrProfile } from "../src/lib/fuda/segment";
import type { RunState } from "../src/types/fuda";

interface Profile {
  name: string;
  kpm: number;
  acc: number;
}

const PROFILES: Profile[] = [
  { name: "初心 120kpm/95%", kpm: 120, acc: 0.95 },
  { name: "中級 200kpm/97%", kpm: 200, acc: 0.97 },
  { name: "上級 300kpm/98.5%", kpm: 300, acc: 0.985 },
];

const RUNS = parseInt(process.argv[2] ?? "30", 10);

/** 決定的な擬似乱数（ミス注入用。ゲーム内RNGとは独立） */
function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** 語のスコアポテンシャルの素朴な見積もり（役の当たりをつける） */
function estimate(word: string): number {
  const profile = wordAttrProfile(word);
  const len = [...word].length;
  let score = len;
  if (len >= 6) score += 4; // 長歌
  if (profile.dakuten >= 3) score += 4; // 濁流
  if (profile.handakuten >= 1) score += 3; // 破音
  if (profile.shifted >= 3) score += 4; // 浮舟
  const chars = [...word];
  if (
    len >= 4 &&
    len % 2 === 0 &&
    chars.slice(0, len / 2).join("") === chars.slice(len / 2).join("")
  ) {
    score += 4; // 畳語
  }
  return score;
}

function simulateRun(
  seed: number,
  stake: number,
  profile: Profile
): { cleared: boolean; ante: number; words: number } {
  const interval = 60000 / profile.kpm;
  const missRng = makeRng(seed ^ 0x5f3759df);
  let run: RunState = createRun({
    seed,
    lessonLevel: 8,
    wordPool: wordDictionary,
    stake,
  });
  let at = 0;
  let guard = 0;

  while (run.phase !== "runClear" && run.phase !== "runFail" && guard++ < 2000) {
    switch (run.phase) {
      case "roundIntro":
        run = fudaReducer(run, { type: "beginRound", at });
        break;

      case "round": {
        // ポテンシャル最大の札を狙う
        const hand = run.round!.hand;
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < hand.length; i++) {
          const card = run.deck.find((c) => c.uid === hand[i])!;
          const s = estimate(card.word);
          if (s > bestScore) {
            bestScore = s;
            bestIdx = i;
          }
        }
        const target = run.deck.find((c) => c.uid === hand[bestIdx])!;
        at += interval;
        run = fudaReducer(run, {
          type: "charTyped",
          char: [...target.word][0],
          at,
        });
        // 実際にアクティブになった札を打ち切る（ミスを確率注入）
        let inner = 0;
        while (run.phase === "round" && run.round?.active && inner++ < 30) {
          const active = run.round.active;
          const card = run.deck.find((c) => c.uid === active.cardUid)!;
          const ch = [...card.word][active.charProgress];
          if (missRng() > profile.acc) {
            at += interval;
            run = fudaReducer(run, { type: "charTyped", char: "ゑ", at });
          }
          at += interval;
          run = fudaReducer(run, { type: "charTyped", char: ch, at });
        }
        break;
      }

      case "roundResult":
        run = fudaReducer(run, { type: "confirmRoundResult", at });
        break;

      case "shop": {
        const shop = run.shop!;
        const charmIdx = shop.charmOffers.findIndex(
          (o) => !o.sold && o.price <= run.money
        );
        if (charmIdx >= 0 && run.charms.length < 5) {
          run = fudaReducer(run, { type: "buyCharm", index: charmIdx });
        } else if (
          shop.scrollOffer &&
          !shop.scrollOffer.sold &&
          shop.scrollOffer.price <= run.money
        ) {
          run = fudaReducer(run, { type: "buyScroll" });
        } else if (!shop.packSold && shop.packPrice <= run.money) {
          run = fudaReducer(run, { type: "buyPack" });
          const words = run.shop?.packChoice;
          if (words && words.length > 0) {
            const best = [...words].sort((a, b) => estimate(b) - estimate(a))[0];
            run = fudaReducer(run, { type: "pickPackWord", word: best });
          }
        } else {
          run = fudaReducer(run, { type: "leaveShop" });
        }
        break;
      }

      default:
        guard = 99999;
    }
  }

  return {
    cleared: run.phase === "runClear",
    ante: run.ante,
    words: run.stats.wordsCompleted,
  };
}

console.log(`言霊札バランスシミュレーション（${RUNS}ラン/セル）\n`);
console.log(
  "段位      " + PROFILES.map((p) => p.name.padEnd(20)).join(" | ")
);
console.log("-".repeat(10 + PROFILES.length * 23));

for (let stake = 1; stake <= 5; stake++) {
  const cells: string[] = [];
  for (const profile of PROFILES) {
    let cleared = 0;
    let anteSum = 0;
    for (let i = 0; i < RUNS; i++) {
      const result = simulateRun(1000 + i * 7919, stake, profile);
      if (result.cleared) cleared++;
      anteSum += result.ante;
    }
    const rate = Math.round((cleared / RUNS) * 100);
    const avgAnte = (anteSum / RUNS).toFixed(1);
    cells.push(`勝率${String(rate).padStart(3)}% 平均幕${avgAnte}`.padEnd(20));
  }
  console.log(`${stake}段:      ` + cells.join(" | "));
}
