/**
 * 実績とアンロック（お守り・流派の解放条件）
 *
 * ラン終了時に評価し、新規達成分を返す。メタへの反映・保存は hook 側が行う。
 */

import type {
  AchievementId,
  CharmId,
  FudaMeta,
  RunState,
  SchoolId,
} from "@/types/fuda";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  /** metaAfter はこのランの統計を加算済みのメタ */
  check(run: RunState, cleared: boolean, metaAfter: FudaMeta): boolean;
  rewardCharm?: CharmId;
  rewardSchool?: SchoolId;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "firstClear",
    name: "初伝",
    description: "全8幕をクリアする",
    check: (_run, cleared) => cleared,
    rewardSchool: "dakuryu",
  },
  {
    id: "stake2Clear",
    name: "中伝",
    description: "二段以上でクリアする",
    check: (run, cleared) => cleared && run.stake >= 2,
    rewardSchool: "hayate",
  },
  {
    id: "stake5Clear",
    name: "皆伝",
    description: "五段でクリアする",
    check: (run, cleared) => cleared && run.stake >= 5,
  },
  {
    id: "wordScore3000",
    name: "言霊の一撃",
    description: "一語で3,000点を出す",
    check: (run) => run.stats.bestWordScore >= 3000,
    rewardCharm: "ryuNoHoko",
  },
  {
    id: "mushin5",
    name: "明鏡止水",
    description: "1ランで無心を5回成立させる",
    check: (run) => (run.stats.yakuCounts.mushin ?? 0) >= 5,
    rewardCharm: "kotodamaNoUtsuwa",
  },
  {
    id: "combo30",
    name: "同時打鍵の指",
    description: "1ランでチョードを30単位確定する",
    check: (run) => run.stats.attrCounts.combo >= 30,
  },
  {
    id: "jougo10",
    name: "畳みかけ",
    description: "1ランで畳語を10回成立させる",
    check: (run) => (run.stats.yakuCounts.jougo ?? 0) >= 10,
  },
  {
    id: "streak15",
    name: "無我",
    description: "ノーミスで15語連続で打ち切る",
    check: (run) => run.stats.maxNoMissStreak >= 15,
  },
  {
    id: "deck30",
    name: "蔵書家",
    description: "デッキを30枚まで育てる",
    check: (run) => run.deck.length >= 30,
  },
  {
    id: "kana5000",
    name: "千本打ち",
    description: "言霊札で累計5,000かなを打つ",
    check: (_run, _cleared, metaAfter) => metaAfter.stats.totalKana >= 5000,
  },
];

/** ラン終了時の新規解放を評価する（既達成分は除く） */
export function evaluateUnlocks(
  run: RunState,
  cleared: boolean,
  metaAfter: FudaMeta
): AchievementDef[] {
  return ACHIEVEMENT_DEFS.filter(
    (def) =>
      metaAfter.achievements[def.id] === undefined &&
      def.check(run, cleared, metaAfter)
  );
}
