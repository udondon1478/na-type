/**
 * 採点（かな1確定のチップ・語完成のスコア）とお守りフックの走査
 *
 * すべて純関数。演出イベント（FxDraft）を採点と同時に生成して返し、
 * reducer が seq を採番して fxQueue に積む。
 */

import { BALANCE } from "./balance";
import { CHARM_DEFS } from "./charms";
import { evaluateYaku } from "./yaku";
import type {
  Activation,
  ActiveWordPlay,
  BossDef,
  CharmCtx,
  CharmDef,
  CharmInstance,
  FxDraft,
  KanaAttr,
  RunState,
  WordCardData,
  YakuId,
} from "@/types/fuda";

/** お守りフック走査の結果 */
export interface CharmWalkResult {
  activations: { index: number; charm: CharmInstance; activation: Activation }[];
  /** counter 更新・破壊を適用した新しい所持配列 */
  charms: CharmInstance[];
  moneyGained: number;
  fx: FxDraft[];
}

type CharmHookName =
  | "onUnitScored"
  | "onWordScored"
  | "onMiss"
  | "onRoundStart"
  | "onRoundEnd"
  | "onDiscard";

/**
 * 所持お守りを slot 順に走査してフックを発火する。
 * 呪縛ボスで封印された slot はスキップ。counter 更新・破壊も同時に適用する。
 */
export function walkCharms(
  run: RunState,
  hook: CharmHookName,
  ctxExtra: Partial<CharmCtx>
): CharmWalkResult {
  const sealedIndex = run.round?.sealedCharmIndex ?? null;
  const activations: CharmWalkResult["activations"] = [];
  const fx: FxDraft[] = [];
  let moneyGained = 0;

  const nextCharms: CharmInstance[] = [];
  run.charms.forEach((charm, index) => {
    const def: CharmDef = CHARM_DEFS[charm.id];
    const fn = def[hook];
    if (!fn || index === sealedIndex) {
      nextCharms.push(charm);
      return;
    }
    const ctx: CharmCtx = {
      run,
      round: run.round,
      self: charm,
      ...ctxExtra,
    };
    const activation = fn.call(def, ctx);
    if (!activation) {
      nextCharms.push(charm);
      return;
    }
    activations.push({ index, charm, activation });
    moneyGained += activation.money ?? 0;
    fx.push({
      kind: "charmProc",
      charmIndex: index,
      charmId: charm.id,
      label: activation.label,
    });
    if (activation.break) {
      fx.push({ kind: "charmBreak", charmIndex: index, charmId: charm.id });
      return; // 破壊: nextCharms に積まない
    }
    nextCharms.push(
      activation.counterDelta
        ? { ...charm, counter: charm.counter + activation.counterDelta }
        : charm
    );
  });

  return { activations, charms: nextCharms, moneyGained, fx };
}

export interface UnitScoreResult {
  chips: number;
  charms: CharmInstance[];
  moneyGained: number;
  fx: FxDraft[];
}

/**
 * かな1単位の確定チップを計算する。
 * 基礎 + 属性ボーナスにボス修飾を適用し、0 でなければお守り（onUnitScored）を走査する。
 */
export function scoreUnit(
  run: RunState,
  boss: BossDef | null,
  unit: string,
  attr: KanaAttr
): UnitScoreResult {
  // 基礎チップは含有かな数でスケール（チョード「しゃ」= 2かな分 + 属性ボーナス）
  let base = BALANCE.chips.base * [...unit].length + BALANCE.chips.attr[attr];
  if (boss?.modifyUnitChips) {
    base = boss.modifyUnitChips(attr, base);
  }
  const fx: FxDraft[] = [];

  if (base <= 0) {
    // ボスに封じられた属性: お守りも発動しない
    fx.push({ kind: "unitChip", unit, attr, chips: 0 });
    return { chips: 0, charms: run.charms, moneyGained: 0, fx };
  }

  const walk = walkCharms(run, "onUnitScored", { unit: { unit, attr } });
  let chips = base;
  for (const { activation } of walk.activations) {
    chips += activation.chips ?? 0;
  }
  fx.push({ kind: "unitChip", unit, attr, chips });
  fx.push(...walk.fx);
  return { chips, charms: walk.charms, moneyGained: walk.moneyGained, fx };
}

export interface WordScoreResult {
  total: number;
  chips: number;
  mult: number;
  yakuIds: YakuId[];
  charms: CharmInstance[];
  moneyGained: number;
  fx: FxDraft[];
}

/**
 * 語完成時のスコアを計算する。
 * 語スコア = (蓄積チップ + 役チップ) × (1 + 役倍率)、そのあと slot 順にお守りが修飾する。
 */
export function scoreWord(
  run: RunState,
  card: WordCardData,
  play: ActiveWordPlay
): WordScoreResult {
  const hits = evaluateYaku(card, play, run);
  const yakuIds = hits.map((h) => h.def.id);
  const fx: FxDraft[] = [];

  let chips = play.chipsSoFar;
  let mult = 1;
  for (const hit of hits) {
    chips += hit.chips;
    mult += hit.mult;
    fx.push({
      kind: "yaku",
      yakuId: hit.def.id,
      name: hit.def.name,
      level: hit.level,
      chips: hit.chips,
      mult: hit.mult,
    });
  }

  const walk = walkCharms(run, "onWordScored", { play, card, yakuHits: yakuIds });
  for (const { activation } of walk.activations) {
    chips += activation.chips ?? 0;
    if (activation.chipsTimes) chips = Math.round(chips * activation.chipsTimes);
    mult += activation.multAdd ?? 0;
    if (activation.multTimes) mult *= activation.multTimes;
  }
  fx.push(...walk.fx);

  const total = Math.round(chips * mult);
  fx.push({ kind: "wordScore", word: card.word, chips, mult, total });

  return {
    total,
    chips,
    mult,
    yakuIds,
    charms: walk.charms,
    moneyGained: walk.moneyGained,
    fx,
  };
}
