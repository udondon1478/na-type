/**
 * 言霊札の心臓部: 純粋 reducer とラン/勝負の状態遷移
 *
 * 【純度の規律】このファイル（と lib/fuda 配下）では以下を守る:
 * - Date.now() / performance.now() を呼ばない → 時刻はイベントペイロードの `at` で受ける
 * - Math.random() を呼ばない → 抽選は rng.ts + RunState.rngState を経由する
 * - localStorage / AudioContext を触らない → 保存・音は hooks/UI 層の副作用
 * これにより「イベント列を与えれば同じランが再現できる」ことを保証し、
 * Node 上のバランスシミュレーション（scripts/fuda-sim.ts）を可能にする。
 */

import { BALANCE, stakeMod } from "./balance";
import { BOSS_DEFS, rollBoss } from "./bosses";
import { CHARM_DEFS, interestCapBonus } from "./charms";
import * as rng from "./rng";
import { classifyUnit, segmentWord, unitEndOffsets } from "./segment";
import { scoreUnit, scoreWord, walkCharms } from "./scoring";
import { resolveKeyToKana } from "@/lib/resolve-key-to-kana";
import type {
  ActiveWordPlay,
  BossDef,
  FudaEvent,
  FxDraft,
  KanaAttr,
  RewardBreakdown,
  RoundConfig,
  RoundState,
  RunState,
  RunStats,
  SchoolId,
  WordCardData,
} from "@/types/fuda";

const FX_QUEUE_MAX = 50;

// ── 生成 ──

function emptyStats(): RunStats {
  return {
    kanaTyped: 0,
    missCount: 0,
    wordsCompleted: 0,
    attrCounts: {
      seion: 0,
      dakuten: 0,
      handakuten: 0,
      kogaki: 0,
      shifted: 0,
      combo: 0,
    },
    bestWordScore: 0,
    maxNoMissStreak: 0,
    yakuCounts: {},
  };
}

/** メニュー表示用の空状態 */
export function createMenuState(): RunState {
  return {
    phase: "menu",
    seed: 0,
    rngState: 0,
    stake: 1,
    schoolId: "kata",
    lessonLevel: 8,
    ante: 1,
    roundIndex: 0,
    bossId: null,
    bossHistory: [],
    money: 0,
    deck: [],
    charms: [],
    ofudas: [],
    yakuLevels: {},
    noMissStreak: 0,
    lastYakuIds: [],
    stats: emptyStats(),
    round: null,
    roundReward: null,
    fxQueue: [],
    fxSeq: 0,
  };
}

/** 単語からカードを構築する（セグメンテーションをキャッシュ） */
export function buildCard(uid: number, word: string): WordCardData {
  const units = segmentWord(word);
  return { uid, word, units, attrs: units.map(classifyUnit) };
}

export interface CreateRunOptions {
  seed: number;
  lessonLevel: number;
  /** レッスン範囲でフィルタ済みの単語プール */
  wordPool: string[];
  stake?: number;
  schoolId?: SchoolId;
}

/** 新規ランを開始する（phase: roundIntro） */
export function createRun(options: CreateRunOptions): RunState {
  let s = rng.seedFrom(options.seed);
  const [shuffled, s2] = rng.shuffle(s, options.wordPool);
  s = s2;
  const deckWords = shuffled.slice(0, BALANCE.deck.initialSize);
  const deck = deckWords.map((word, i) => buildCard(i + 1, word));
  const [bossId, s3] = rollBoss(s, []);
  s = s3;

  return {
    ...createMenuState(),
    phase: "roundIntro",
    seed: options.seed,
    rngState: s,
    stake: options.stake ?? 1,
    schoolId: options.schoolId ?? "kata",
    lessonLevel: options.lessonLevel,
    bossId,
    bossHistory: [bossId],
    money: BALANCE.economy.initialMoney,
    deck,
  };
}

// ── 勝負の構成 ──

/** この勝負に適用されるボス（急戦、五段では破戦にも） */
export function bossForRound(run: RunState): BossDef | null {
  if (run.bossId === null) return null;
  const applies =
    run.roundIndex === 2 || (stakeMod(run.stake).bossInHasen && run.roundIndex === 1);
  return applies ? BOSS_DEFS[run.bossId] : null;
}

/** ノルマ・手数・引き直し・制限時間を段位/お守り/ボスで修飾して算出する */
export function roundConfigFor(run: RunState): RoundConfig {
  const mod = stakeMod(run.stake);
  let config: RoundConfig = {
    quota: Math.round(
      BALANCE.quota.anteBase[run.ante] *
        BALANCE.quota.roundFactor[run.roundIndex] *
        mod.quotaMult
    ),
    hands: BALANCE.hand.handsPerRound + mod.handsDelta,
    discards: BALANCE.hand.discardsPerRound + mod.discardsDelta,
    timeLimitMs: null,
  };
  for (const charm of run.charms) {
    const def = CHARM_DEFS[charm.id];
    if (def.modifyRoundConfig) config = def.modifyRoundConfig(config);
  }
  const boss = bossForRound(run);
  if (boss?.modifyRoundConfig) config = boss.modifyRoundConfig(config);
  return {
    ...config,
    hands: Math.max(1, config.hands),
    discards: Math.max(0, config.discards),
  };
}

// ── 内部ヘルパ ──

/** fx を採番して積む（上限で古いものから捨てる） */
function pushFx(run: RunState, drafts: FxDraft[]): RunState {
  if (drafts.length === 0) return run;
  let seq = run.fxSeq;
  const stamped = drafts.map((d) => ({ ...d, seq: ++seq }));
  const queue = [...run.fxQueue, ...stamped];
  return {
    ...run,
    fxSeq: seq,
    fxQueue: queue.length > FX_QUEUE_MAX ? queue.slice(-FX_QUEUE_MAX) : queue,
  };
}

function cardByUid(run: RunState, uid: number): WordCardData | undefined {
  return run.deck.find((c) => c.uid === uid);
}

/** ミスの一元処理: 統計・無心リセット・毒霧半減・ガラス割れ */
function registerMiss(run: RunState): RunState {
  const boss = bossForRound(run);
  let round = run.round;
  if (round?.active) {
    const halve = boss?.flags?.halveChipsOnMiss ?? false;
    round = {
      ...round,
      active: {
        ...round.active,
        missCount: round.active.missCount + 1,
        chipsSoFar: halve
          ? Math.floor(round.active.chipsSoFar / 2)
          : round.active.chipsSoFar,
      },
    };
  }
  let next: RunState = {
    ...run,
    round,
    noMissStreak: 0,
    stats: { ...run.stats, missCount: run.stats.missCount + 1 },
  };
  const walk = walkCharms(next, "onMiss", {});
  next = { ...next, charms: walk.charms, money: next.money + walk.moneyGained };
  return pushFx(next, [{ kind: "miss" }, ...walk.fx]);
}

/** 手札から index の札を打ち始める */
function activateCard(run: RunState, handIndex: number, at: number): RunState {
  const round = run.round;
  if (!round) return run;
  const uid = round.hand[handIndex];
  if (uid === undefined) return run;
  const active: ActiveWordPlay = {
    cardUid: uid,
    charProgress: 0,
    unitResults: [],
    chipsSoFar: 0,
    missCount: 0,
    startedAt: at,
    lastUnitAt: at,
  };
  return { ...run, round: { ...round, active, selected: [] } };
}

/**
 * 入力単位を確定する（チップ加算・統計・fx）。
 * newProgress は確定後の文字インデックス。語が打ち終わっていれば採点まで進む。
 */
function commitUnit(
  run: RunState,
  at: number,
  unit: string,
  attr: KanaAttr,
  newProgress: number
): RunState {
  const round = run.round;
  const play = round?.active;
  if (!round || !play) return run;
  const card = cardByUid(run, play.cardUid);
  if (!card) return run;

  const boss = bossForRound(run);
  const result = scoreUnit(run, boss, unit, attr);
  const unitLen = [...unit].length;
  const interval = play.unitResults.length === 0 ? 0 : at - play.lastUnitAt;

  const nextPlay: ActiveWordPlay = {
    ...play,
    charProgress: newProgress,
    unitResults: [
      ...play.unitResults,
      { unit, attr, chips: result.chips, intervalMs: interval },
    ],
    chipsSoFar: play.chipsSoFar + result.chips,
    lastUnitAt: at,
  };

  let next: RunState = {
    ...run,
    charms: result.charms,
    money: run.money + result.moneyGained,
    round: { ...round, active: nextPlay },
    stats: {
      ...run.stats,
      kanaTyped: run.stats.kanaTyped + unitLen,
      attrCounts: {
        ...run.stats.attrCounts,
        [attr]: run.stats.attrCounts[attr] + 1,
      },
    },
  };
  next = pushFx(next, result.fx);

  if (newProgress >= [...card.word].length) {
    next = completeWord(next);
  }
  return next;
}

/** 語を打ち切ったときの採点と勝負進行 */
function completeWord(run: RunState): RunState {
  const round = run.round;
  const play = round?.active;
  if (!round || !play) return run;
  const card = cardByUid(run, play.cardUid);
  if (!card) return run;

  const result = scoreWord(run, card, play);
  const noMiss = play.missCount === 0;
  const streak = noMiss ? run.noMissStreak + 1 : 0;

  const yakuCounts = { ...run.stats.yakuCounts };
  for (const id of result.yakuIds) {
    yakuCounts[id] = (yakuCounts[id] ?? 0) + 1;
  }

  // 手札から取り除き、山札から1枚補充する
  const handIndex = round.hand.indexOf(play.cardUid);
  const hand = round.hand.filter((_, i) => i !== handIndex);
  const drawPile = [...round.drawPile];
  const drawn = drawPile.shift();
  if (drawn !== undefined) {
    hand.splice(Math.min(handIndex, hand.length), 0, drawn);
  }

  const handsLeft = round.handsLeft - 1;
  let next: RunState = {
    ...run,
    charms: result.charms,
    money: run.money + result.moneyGained,
    noMissStreak: streak,
    lastYakuIds: result.yakuIds,
    stats: {
      ...run.stats,
      wordsCompleted: run.stats.wordsCompleted + 1,
      bestWordScore: Math.max(run.stats.bestWordScore, result.total),
      maxNoMissStreak: Math.max(run.stats.maxNoMissStreak, streak),
      yakuCounts,
    },
    round: {
      ...round,
      scored: round.scored + result.total,
      handsLeft,
      hand,
      drawPile,
      active: null,
    },
  };
  next = pushFx(next, result.fx);

  const scored = next.round!.scored;
  if (scored >= next.round!.quota) {
    return finishRound(next, true);
  }
  if (handsLeft <= 0 || hand.length === 0) {
    return finishRound(next, scored >= next.round!.quota);
  }
  return next;
}

/** 勝負終了: 勝敗確定と報酬精算（roundResult 表示へ） */
function finishRound(run: RunState, won: boolean): RunState {
  let next: RunState = { ...run, phase: "roundResult" };
  if (!won) {
    return { ...next, roundReward: null };
  }
  // 利子は報酬加算前の所持金に対して計算する
  const cap = BALANCE.economy.interestCap + interestCapBonus(run);
  const interest = Math.min(
    Math.floor(run.money / BALANCE.economy.interestPer),
    cap
  );
  const reward: RewardBreakdown = {
    base: BALANCE.economy.roundReward[run.roundIndex],
    remainingHands:
      (run.round?.handsLeft ?? 0) * BALANCE.economy.perRemainingHand,
    interest,
    total: 0,
  };
  reward.total = reward.base + reward.remainingHands + reward.interest;
  next = { ...next, money: next.money + reward.total, roundReward: reward };

  const walk = walkCharms(next, "onRoundEnd", {});
  next = { ...next, charms: walk.charms, money: next.money + walk.moneyGained };
  return pushFx(next, walk.fx);
}

/** 勝負を開始する（roundIntro → round） */
function beginRound(run: RunState, at: number): RunState {
  const config = roundConfigFor(run);
  let s = run.rngState;

  const uids = run.deck.map((c) => c.uid);
  const [shuffled, s2] = rng.shuffle(s, uids);
  s = s2;
  const hand = shuffled.slice(0, BALANCE.hand.size);
  const drawPile = shuffled.slice(BALANCE.hand.size);

  // 勝負内累積系お守りの counter をリセット
  const charms = run.charms.map((c) =>
    CHARM_DEFS[c.id].counterResetsPerRound ? { ...c, counter: 0 } : c
  );

  // 呪縛ボス: お守り1枠を封印
  const boss = bossForRound(run);
  let sealedCharmIndex: number | null = null;
  if (boss?.flags?.sealCharm && charms.length > 0) {
    const [idx, s3] = rng.nextInt(s, charms.length);
    s = s3;
    sealedCharmIndex = idx;
  }

  const round: RoundState = {
    quota: config.quota,
    scored: 0,
    handsLeft: config.hands,
    discardsLeft: config.discards,
    drawPile,
    hand,
    selected: [],
    active: null,
    deadlineAt: config.timeLimitMs !== null ? at + config.timeLimitMs : null,
    sealedCharmIndex,
  };

  let next: RunState = {
    ...run,
    phase: "round",
    rngState: s,
    charms,
    round,
    roundReward: null,
  };
  const walk = walkCharms(next, "onRoundStart", {});
  next = { ...next, charms: walk.charms, money: next.money + walk.moneyGained };
  return pushFx(next, walk.fx);
}

/** roundResult 確認後の進行（次の勝負 / 次の幕 / クリア / 敗北） */
function advanceAfterResult(run: RunState): RunState {
  const won = (run.round?.scored ?? 0) >= (run.round?.quota ?? Infinity);
  if (!won) {
    return { ...run, phase: "runFail", round: null };
  }
  if (run.roundIndex < 2) {
    return {
      ...run,
      phase: "roundIntro",
      roundIndex: (run.roundIndex + 1) as 0 | 1 | 2,
      round: null,
      roundReward: null,
    };
  }
  if (run.ante >= BALANCE.run.finalAnte) {
    return { ...run, phase: "runClear", round: null };
  }
  // 次の幕へ（新しいボスを抽選）
  const [bossId, s] = rollBoss(run.rngState, run.bossHistory.slice(-3));
  return {
    ...run,
    phase: "roundIntro",
    rngState: s,
    ante: run.ante + 1,
    roundIndex: 0,
    bossId,
    bossHistory: [...run.bossHistory, bossId],
    round: null,
    roundReward: null,
  };
}

// ── 入力処理 ──

/**
 * かな1文字を進行に適用する（IME・かな直接入力モード）。
 * 正準セグメンテーションの単位境界を跨いだ時点で unit を確定する。
 */
function advanceByChar(
  run: RunState,
  char: string,
  at: number,
  keyCode?: string
): RunState {
  const round = run.round;
  if (!round) return run;

  if (round.active) {
    const card = cardByUid(run, round.active.cardUid);
    if (!card) return run;
    const chars = [...card.word];
    const expected = chars[round.active.charProgress];
    const matched =
      char === expected ||
      (keyCode !== undefined && resolveKeyToKana(keyCode) === expected);
    if (!matched) return registerMiss(run);

    const newProgress = round.active.charProgress + 1;
    const offsets = unitEndOffsets(card.units);
    const unitIndex = offsets.indexOf(newProgress);
    if (unitIndex === -1) {
      // 単位の途中（例: しゃ の し まで）: 進行のみ更新
      return {
        ...run,
        round: {
          ...round,
          active: { ...round.active, charProgress: newProgress },
        },
      };
    }
    return commitUnit(
      run,
      at,
      card.units[unitIndex],
      card.attrs[unitIndex],
      newProgress
    );
  }

  // 未入力: 先頭かなが一致する札を左から探す（数字キー選択中はその札のみ）
  const indices =
    round.selected.length > 0
      ? [...round.selected].sort((a, b) => a - b)
      : round.hand.map((_, i) => i);
  const resolved = keyCode !== undefined ? resolveKeyToKana(keyCode) : null;
  for (const i of indices) {
    const card = cardByUid(run, round.hand[i]);
    if (!card) continue;
    const first = [...card.word][0];
    if (first === char || (resolved !== null && first === resolved)) {
      return advanceByChar(
        activateCard(run, i, at),
        first,
        at,
        undefined
      );
    }
  }
  return registerMiss(run);
}

/** physical モード: チョード確定単位を進行に適用する */
function applyUnitTyped(
  run: RunState,
  handIndex: number,
  unit: string,
  attr: KanaAttr,
  at: number
): RunState {
  const round = run.round;
  if (!round) return run;

  let next = run;
  if (!round.active) {
    next = activateCard(run, handIndex, at);
  }
  const active = next.round?.active;
  if (!active) return run;
  const card = cardByUid(next, active.cardUid);
  if (!card) return run;

  // 防御: chord 層の候補が古い場合は無視する（tail 不一致）
  const tail = [...card.word].slice(active.charProgress).join("");
  if (!tail.startsWith(unit)) return run;

  return commitUnit(next, at, unit, attr, active.charProgress + [...unit].length);
}

// ── reducer 本体 ──

export function fudaReducer(run: RunState, event: FudaEvent): RunState {
  switch (event.type) {
    case "startRun":
      return createRun({
        seed: event.seed,
        lessonLevel: event.lessonLevel,
        wordPool: event.wordPool,
        stake: event.stake,
        schoolId: event.schoolId,
      });

    case "beginRound":
      if (run.phase !== "roundIntro") return run;
      return beginRound(run, event.at);

    case "charTyped":
      if (run.phase !== "round") return run;
      return advanceByChar(run, event.char, event.at, event.keyCode);

    case "unitTyped":
      if (run.phase !== "round") return run;
      return applyUnitTyped(run, event.handIndex, event.unit, event.attr, event.at);

    case "chordMiss":
      if (run.phase !== "round") return run;
      return registerMiss(run);

    case "toggleSelect": {
      const round = run.round;
      if (run.phase !== "round" || !round || round.active) return run;
      if (event.index < 0 || event.index >= round.hand.length) return run;
      const selected = round.selected.includes(event.index)
        ? round.selected.filter((i) => i !== event.index)
        : [...round.selected, event.index];
      return { ...run, round: { ...round, selected } };
    }

    case "discardSelected": {
      const round = run.round;
      if (run.phase !== "round" || !round || round.active) return run;
      if (round.selected.length === 0 || round.discardsLeft <= 0) return run;

      const walk = walkCharms(run, "onDiscard", {});
      let next: RunState = {
        ...run,
        charms: walk.charms,
        money: run.money + walk.moneyGained,
      };
      next = pushFx(next, walk.fx);

      // 捨てた枚数分だけ山札から補充する（山札が尽きたらそのまま減る）
      const discardSet = new Set(round.selected);
      const kept = round.hand.filter((_, i) => !discardSet.has(i));
      const drawPile = [...round.drawPile];
      const drawCount = Math.min(discardSet.size, drawPile.length);
      const hand = [...kept, ...drawPile.splice(0, drawCount)];

      next = {
        ...next,
        round: {
          ...next.round!,
          hand,
          drawPile,
          selected: [],
          discardsLeft: round.discardsLeft - 1,
        },
      };
      if (hand.length === 0) {
        // 手札が尽きた（小さなデッキで捨てすぎた）: 勝負を強制終了
        return finishRound(
          next,
          (next.round?.scored ?? 0) >= (next.round?.quota ?? Infinity)
        );
      }
      return next;
    }

    case "abortWord": {
      const round = run.round;
      if (run.phase !== "round" || !round || !round.active) return run;
      return { ...run, round: { ...round, active: null } };
    }

    case "timeUp": {
      const round = run.round;
      if (run.phase !== "round" || !round || round.deadlineAt === null) return run;
      if (event.at < round.deadlineAt) return run;
      return finishRound(run, round.scored >= round.quota);
    }

    case "confirmRoundResult":
      if (run.phase !== "roundResult") return run;
      return advanceAfterResult(run);

    case "backToMenu":
      return createMenuState();

    default:
      return run;
  }
}
