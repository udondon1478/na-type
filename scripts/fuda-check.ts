/**
 * 言霊札エンジンの自己検査
 *
 * 実行: npx tsx scripts/fuda-check.ts
 *
 * - セグメンテーションの整合性（全辞書語で units.join === word）
 * - 既知のかな（しゃ 等）のチョード認識
 * - 採点の検算（既知の入力 → 期待スコア）
 * - シード付き乱数の再現性
 * - 辞書全語の属性分類レポート
 */

import { wordDictionary } from "../src/data/naginata/words";
import { BALANCE } from "../src/lib/fuda/balance";
import {
  buildCard,
  createRun,
  createMenuState,
  fudaReducer,
} from "../src/lib/fuda/engine";
import {
  classifyUnit,
  maxUnitLen,
  segmentWord,
  wordAttrProfile,
} from "../src/lib/fuda/segment";
import { deserializeRun, serializeRun } from "../src/lib/fuda/save";
import { scoreUnit, scoreWord } from "../src/lib/fuda/scoring";
import { getInputTypeForKana } from "../src/lib/kana-to-keys";
import type {
  ActiveWordPlay,
  KanaAttr,
  RunState,
  WordCardData,
} from "../src/types/fuda";

let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

// ── 1. セグメンテーション ──
console.log("\n[1] セグメンテーション");
console.log(`  最大単位長: ${maxUnitLen}文字`);

assert(
  wordDictionary.every((w) => segmentWord(w).join("") === w),
  `全${wordDictionary.length}語で units.join("") === word（文字の欠落なし）`
);

// CLAUDE.md に記載の代表チョード（し+や→しゃ）が単位として認識されること
const kisha = segmentWord("きしゃ");
assert(
  kisha.length === 2 && kisha[1] === "しゃ",
  `「きしゃ」→ ${JSON.stringify(kisha)}（しゃ が1単位）`
);
assert(classifyUnit("しゃ") === "combo", "「しゃ」の属性 = combo");

const ji = getInputTypeForKana("じ");
assert(ji === "dakuten", `「じ」の入力タイプ = ${ji}（dakuten想定）`);

// ── 2. 採点の検算（レイアウト非依存の合成データ） ──
console.log("\n[2] 採点");

function syntheticCard(word: string, attrs: KanaAttr[]): WordCardData {
  return { uid: 1, word, units: [...word], attrs };
}
function syntheticPlay(
  chipsSoFar: number,
  unitCount: number,
  intervalMs: number
): ActiveWordPlay {
  return {
    cardUid: 1,
    charProgress: unitCount,
    unitResults: Array.from({ length: unitCount }, (_, i) => ({
      unit: "あ",
      attr: "seion" as const,
      chips: 0,
      intervalMs: i === 0 ? 0 : intervalMs,
    })),
    chipsSoFar,
    missCount: 0,
    startedAt: 0,
    lastUnitAt: 0,
  };
}

const menuRun: RunState = createMenuState();

// 6かな・チップ100・遅い打鍵（早業なし）→ 長歌のみ: 100 × (1 + 2) = 300
{
  const card = syntheticCard("あいうえおか", Array(6).fill("seion"));
  const play = syntheticPlay(100, 6, 400);
  const result = scoreWord(menuRun, card, play);
  assert(
    result.total === 300 && result.yakuIds.join(",") === "choka",
    `長歌のみ: 100チップ × 倍率3 = ${result.total}（期待300）`
  );
}

// 同条件 + 速い打鍵（100ms）→ 長歌 + 早業: 100 × (1 + 2 + 2) = 500
{
  const card = syntheticCard("あいうえおか", Array(6).fill("seion"));
  const play = syntheticPlay(100, 6, 100);
  const result = scoreWord(menuRun, card, play);
  assert(
    result.total === 500 && result.yakuIds.includes("hayawaza"),
    `長歌+早業: ${result.total}（期待500）`
  );
}

// ガラスの御守（×2.5）: 500 × 2.5 = 1250
{
  const run: RunState = {
    ...menuRun,
    charms: [{ id: "glassOmamori", counter: 0 }],
  };
  const card = syntheticCard("あいうえおか", Array(6).fill("seion"));
  const play = syntheticPlay(100, 6, 100);
  const result = scoreWord(run, card, play);
  assert(result.total === 1250, `ガラスの御守 ×2.5: ${result.total}（期待1250）`);
}

// 単位チップ: 清音1かな = base(5)、チョード2かな = base×2 + combo(6) = 16
{
  const seion = scoreUnit(menuRun, null, "あ", "seion");
  const combo = scoreUnit(menuRun, null, "しゃ", "combo");
  assert(seion.chips === 5, `清音1かな = ${seion.chips}チップ（期待5）`);
  assert(combo.chips === 16, `チョード「しゃ」 = ${combo.chips}チップ（期待16）`);
}

// 濁点の帯: 濁点1かな = base(5) + attr(3) + 帯(15) = 23
{
  const run: RunState = {
    ...menuRun,
    charms: [{ id: "dakutenObi", counter: 0 }],
  };
  const result = scoreUnit(run, null, "が", "dakuten");
  assert(result.chips === 23, `濁点の帯: 「が」 = ${result.chips}チップ（期待23）`);
}

// ── 3. 乱数の再現性 ──
console.log("\n[3] シード付き乱数");
{
  const pool = wordDictionary.slice(0, 40);
  const a = createRun({ seed: 12345, lessonLevel: 8, wordPool: pool });
  const b = createRun({ seed: 12345, lessonLevel: 8, wordPool: pool });
  assert(
    JSON.stringify(a.deck) === JSON.stringify(b.deck) && a.bossId === b.bossId,
    "同一シード → 同一デッキ・同一ボス"
  );
  const c = createRun({ seed: 99999, lessonLevel: 8, wordPool: pool });
  assert(
    JSON.stringify(a.deck) !== JSON.stringify(c.deck),
    "異なるシード → 異なるデッキ"
  );
  assert(
    a.deck.length === Math.min(BALANCE.deck.initialSize, pool.length),
    `初期デッキ ${a.deck.length}枚（期待${BALANCE.deck.initialSize}）`
  );
}

// ── 4. 辞書の属性レポート ──
console.log("\n[4] 辞書レポート");
{
  const totals: Record<KanaAttr, number> = {
    seion: 0,
    dakuten: 0,
    handakuten: 0,
    kogaki: 0,
    shifted: 0,
    combo: 0,
  };
  const unknownChars = new Set<string>();
  for (const word of wordDictionary) {
    const profile = wordAttrProfile(word);
    for (const [attr, n] of Object.entries(profile)) {
      totals[attr as KanaAttr] += n;
    }
    for (const ch of word) {
      if (getInputTypeForKana(ch) === null && !segmentWord(word).includes(ch)) {
        // 単独では引けない文字（多文字単位に吸収されていれば問題ない）
        const units = segmentWord(word);
        if (units.includes(ch)) unknownChars.add(ch);
      }
    }
  }
  console.log(
    `  属性分布: ` +
      Object.entries(totals)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
  );
  // 役が成立しうる語が存在するかの目安
  const chokaWords = wordDictionary.filter((w) => [...w].length >= 6).length;
  const dakuryuWords = wordDictionary.filter(
    (w) => wordAttrProfile(w).dakuten >= 3
  ).length;
  console.log(`  長歌候補（6かな以上）: ${chokaWords}語 / 濁流候補（濁点3+）: ${dakuryuWords}語`);
  if (unknownChars.size > 0) {
    console.warn(`  ⚠ 分類不能の文字: ${[...unknownChars].join(", ")}`);
  }

  // 単語カード構築が全語で成功すること
  assert(
    wordDictionary.every((w, i) => {
      const card = buildCard(i, w);
      return card.units.length === card.attrs.length && card.units.length > 0;
    }),
    "全語で WordCardData 構築成功"
  );
}

// ── 5. reducer スモークテスト（イベント列で1勝負を進める） ──
console.log("\n[5] reducer スモーク");
{
  let run = createRun({ seed: 42, lessonLevel: 8, wordPool: wordDictionary });
  assert(run.phase === "roundIntro", "createRun → roundIntro");

  let at = 1000;
  run = fudaReducer(run, { type: "beginRound", at });
  assert(
    run.phase === "round" && run.round !== null,
    `beginRound → round（手札${run.round?.hand.length}枚 / ノルマ${run.round?.quota}）`
  );

  // IME 経路: 手札1枚目の語を1文字ずつ打つ
  const firstCard = run.deck.find((c) => c.uid === run.round!.hand[0])!;
  for (const ch of firstCard.word) {
    at += 150;
    run = fudaReducer(run, { type: "charTyped", char: ch, at });
  }
  assert(
    run.stats.wordsCompleted === 1 && run.round!.active === null,
    `charTyped で1語完了（「${firstCard.word}」→ ${run.round!.scored}点）`
  );
  assert(
    run.round!.handsLeft === BALANCE.hand.handsPerRound - 1,
    `手数が1減った（${run.round!.handsLeft}）`
  );

  // ミス: どの札の先頭にもない文字
  const missBefore = run.stats.missCount;
  run = fudaReducer(run, { type: "charTyped", char: "ゑ", at: (at += 150) });
  assert(
    run.stats.missCount === missBefore + 1 && run.noMissStreak === 0,
    "不一致文字でミス登録・無心リセット"
  );

  // 引き直し: 1枚選択して捨てる
  const discardsBefore = run.round!.discardsLeft;
  const handBefore = [...run.round!.hand];
  run = fudaReducer(run, { type: "toggleSelect", index: 0 });
  run = fudaReducer(run, { type: "discardSelected", at: (at += 150) });
  assert(
    run.round!.discardsLeft === discardsBefore - 1 &&
      run.round!.hand[run.round!.hand.length - 1] !== handBefore[0] &&
      run.round!.hand.length === handBefore.length,
    "引き直しで札が入れ替わった"
  );

  // physical 経路: 手札1枚目を正準単位で unitTyped
  const card2 = run.deck.find((c) => c.uid === run.round!.hand[0])!;
  for (let i = 0; i < card2.units.length; i++) {
    at += 120;
    run = fudaReducer(run, {
      type: "unitTyped",
      handIndex: 0,
      unit: card2.units[i],
      attr: card2.attrs[i],
      at,
    });
  }
  assert(
    run.stats.wordsCompleted === 2,
    `unitTyped で2語目完了（「${card2.word}」）`
  );

  // 勝負を最後まで進める（ノルマ到達 or 手数切れで必ず roundResult になる）
  let steps = 0;
  while (run.phase === "round" && steps < 20) {
    steps++;
    const card = run.deck.find((c) => c.uid === run.round!.hand[0]);
    if (!card) break;
    for (const ch of card.word) {
      at += 150;
      run = fudaReducer(run, { type: "charTyped", char: ch, at });
      if (run.phase !== "round") break;
    }
  }
  assert(
    run.phase === "roundResult",
    `勝負が決着（scored=${run.round?.scored} / quota=${run.round?.quota}）`
  );
  const won = (run.round?.scored ?? 0) >= (run.round?.quota ?? Infinity);
  run = fudaReducer(run, { type: "confirmRoundResult", at: (at += 150) });
  assert(
    won
      ? run.phase === "shop" && run.roundIndex === 1
      : run.phase === "runFail",
    `確認後の遷移: ${run.phase}（${won ? "勝利→幕間ショップへ" : "敗北→runFail"}）`
  );

  // ── 6. ショップとセーブの往復 ──
  console.log("\n[6] ショップ・セーブ");
  if (run.phase === "shop" && run.shop) {
    // 買えるお守りがあれば買う
    const idx = run.shop.charmOffers.findIndex(
      (o) => !o.sold && o.price <= run.money
    );
    if (idx >= 0) {
      const before = run.money;
      run = fudaReducer(run, { type: "buyCharm", index: idx });
      assert(
        run.charms.length === 1 && run.money < before,
        `お守り購入: ${run.charms[0]?.id}（${before}→${run.money}文）`
      );
    } else {
      console.log("  （所持金不足でお守り購入はスキップ）");
    }

    // チェックポイントの直列化 → JSON往復 → 復元
    const ser = JSON.parse(JSON.stringify(serializeRun(run)));
    const restored = deserializeRun(ser);
    assert(
      restored !== null &&
        restored.ante === run.ante &&
        restored.money === run.money &&
        restored.deck.map((c) => c.word).join(",") ===
          run.deck.map((c) => c.word).join(",") &&
        restored.charms.length === run.charms.length,
      "serializeRun → JSON → deserializeRun の往復一致"
    );
    assert(deserializeRun({ phase: "round" }) === null, "壊れたセーブは null");

    run = fudaReducer(run, { type: "leaveShop" });
    assert(
      run.phase === "roundIntro" && run.roundIndex === 1,
      "leaveShop → 破戦の roundIntro"
    );
  }

  // ── 7. ボットでラン全体を走らせる（終端に到達すること） ──
  console.log("\n[7] フルランのボット走行");
  {
    let bot = createRun({ seed: 777, lessonLevel: 8, wordPool: wordDictionary });
    let botAt = 10_000;
    let guard = 0;
    while (
      bot.phase !== "runFail" &&
      bot.phase !== "runClear" &&
      guard++ < 400
    ) {
      switch (bot.phase) {
        case "roundIntro":
          bot = fudaReducer(bot, { type: "beginRound", at: botAt });
          break;
        case "round": {
          // 一番長い札を狙って最初の1文字を打つ（同じ先頭かなは左端優先で確定する）
          const hand = bot.round!.hand;
          let bestIdx = 0;
          for (let i = 1; i < hand.length; i++) {
            const a = bot.deck.find((c) => c.uid === hand[i])!;
            const b = bot.deck.find((c) => c.uid === hand[bestIdx])!;
            if ([...a.word].length > [...b.word].length) bestIdx = i;
          }
          const target = bot.deck.find((c) => c.uid === hand[bestIdx])!;
          botAt += 100;
          bot = fudaReducer(bot, {
            type: "charTyped",
            char: [...target.word][0],
            at: botAt,
          });
          // 以降は実際にアクティブになった札を打ち切る（人間がやることと同じ）
          let inner = 0;
          while (bot.phase === "round" && bot.round?.active && inner++ < 20) {
            const active = bot.round.active;
            const card = bot.deck.find((c) => c.uid === active.cardUid)!;
            const ch = [...card.word][active.charProgress];
            botAt += 100;
            bot = fudaReducer(bot, { type: "charTyped", char: ch, at: botAt });
          }
          break;
        }
        case "roundResult":
          bot = fudaReducer(bot, { type: "confirmRoundResult", at: botAt });
          break;
        case "shop": {
          // 買えるものを1つずつ買ってから出る
          const shopIdx = bot.shop!.charmOffers.findIndex(
            (o) => !o.sold && o.price <= bot.money
          );
          if (shopIdx >= 0 && bot.charms.length < 5) {
            bot = fudaReducer(bot, { type: "buyCharm", index: shopIdx });
          } else {
            bot = fudaReducer(bot, { type: "leaveShop" });
          }
          break;
        }
        default:
          guard = 9999;
      }
    }
    assert(
      bot.phase === "runFail" || bot.phase === "runClear",
      `ボット走行が終端に到達: ${bot.phase}（幕${bot.ante} / ${bot.stats.wordsCompleted}語 / お守り${bot.charms.length}個）`
    );
    assert(guard < 400, `ループガード内で終了（${guard}ステップ）`);
  }
}

console.log(
  failed === 0 ? "\n✅ 全チェック通過" : `\n❌ ${failed}件のチェックが失敗`
);
process.exit(failed === 0 ? 0 : 1);
