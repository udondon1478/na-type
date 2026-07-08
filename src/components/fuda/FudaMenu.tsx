"use client";

import { cn } from "@/lib/utils";
import { BALANCE } from "@/lib/fuda/balance";
import { canUseSchool, SCHOOL_DEFS } from "@/lib/fuda/schools";
import { ACHIEVEMENT_DEFS } from "@/lib/fuda/unlocks";
import type { FudaMeta, RunState, SchoolId } from "@/types/fuda";

const ROUND_LABELS = ["序戦", "破戦", "急戦"] as const;

interface FudaMenuProps {
  level: number;
  onLevelChange: (level: number) => void;
  wordPool: string[];
  stake: number;
  onStakeChange: (stake: number) => void;
  schoolId: SchoolId;
  onSchoolChange: (schoolId: SchoolId) => void;
  /** メタ進行（段位解放・流派解放・戦績）。マウント前は null */
  meta: FudaMeta | null;
  /** 途中セーブがあれば渡す（「続きから」を表示） */
  savedRun: RunState | null;
  onStart: () => void;
  onContinue: () => void;
}

/** 開始に必要な最低語数（手札1周分は欲しい） */
export const MIN_POOL_SIZE = BALANCE.hand.size;

/** 流派の解放条件の説明（ロック表示用） */
function unlockHint(schoolId: SchoolId): string {
  const def = SCHOOL_DEFS[schoolId];
  if (!def.unlock) return "";
  const achievement = ACHIEVEMENT_DEFS.find((a) => a.id === def.unlock);
  return achievement ? `実績「${achievement.name}」（${achievement.description}）で解放` : "";
}

export function FudaMenu({
  level,
  onLevelChange,
  wordPool,
  stake,
  onStakeChange,
  schoolId,
  onSchoolChange,
  meta,
  savedRun,
  onStart,
  onContinue,
}: FudaMenuProps) {
  const stakeUnlocked = meta?.stakeUnlocked ?? 1;
  const unlockedSchools = meta?.unlockedSchools ?? ["kata"];
  const stats = meta?.stats;

  return (
    <div className="flex flex-col items-center justify-center min-h-[460px] md:min-h-[520px] rounded-lg border border-border bg-background/60 gap-5 px-4 py-8">
      <div className="text-center space-y-2">
        <p className="text-3xl font-bold font-mono tracking-widest">言霊札</p>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          単語札を打ち切って点を稼ぎ、幕ごとに上がるノルマを越えろ。
          札の最初のかなを打つと入力開始。濁点・シフト・チョードなどの
          「属性」と「役」を狙えばスコアは爆発する。
          全8幕、3勝負目のボスはルールを歪めてくる。
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <label className="text-sm text-muted-foreground">単語の範囲:</label>
        <select
          value={level}
          onChange={(e) => onLevelChange(parseInt(e.target.value, 10))}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              レッスン {n} まで
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{wordPool.length}語</span>

        <label className="text-sm text-muted-foreground ml-2">段位:</label>
        <select
          value={stake}
          onChange={(e) => onStakeChange(parseInt(e.target.value, 10))}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          title={BALANCE.stakes[stake - 1]?.description}
        >
          {BALANCE.stakes.map((s, i) => (
            <option key={s.name} value={i + 1} disabled={i + 1 > stakeUnlocked}>
              {s.name}
              {i + 1 > stakeUnlocked ? "（未解放）" : ""}
            </option>
          ))}
        </select>
      </div>
      {stake > 1 && (
        <p className="text-xs text-amber-400/90 -mt-2">
          {BALANCE.stakes[stake - 1]?.description}
        </p>
      )}

      {/* 流派（初期デッキ型） */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {Object.values(SCHOOL_DEFS).map((def) => {
          const unlocked = unlockedSchools.includes(def.id);
          const usable = canUseSchool(def.id, wordPool);
          const disabled = !unlocked || !usable;
          return (
            <button
              key={def.id}
              onClick={() => onSchoolChange(def.id)}
              disabled={disabled}
              title={
                !unlocked
                  ? unlockHint(def.id)
                  : !usable
                    ? "この単語範囲では組めません"
                    : def.description
              }
              className={cn(
                "px-3 py-2 rounded-md border text-sm transition-colors text-left",
                schoolId === def.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent",
                disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <span className="font-bold">
                {def.icon} {def.name}
                {!unlocked && " 🔒"}
              </span>
              <span className="block text-[11px] text-muted-foreground max-w-[11rem] leading-tight mt-0.5">
                {def.description}
              </span>
            </button>
          );
        })}
      </div>

      {stats && stats.totalRuns > 0 && (
        <div className="flex gap-6 text-sm font-mono text-center">
          <div>
            <p className="text-muted-foreground text-xs">挑戦</p>
            <p className="text-lg font-bold tabular-nums">{stats.totalRuns}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">制覇</p>
            <p className="text-lg font-bold text-emerald-400 tabular-nums">
              {stats.wins}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">最高到達</p>
            <p className="text-lg font-bold tabular-nums">幕{stats.bestAnte}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">累計かな</p>
            <p className="text-lg font-bold tabular-nums">
              {stats.totalKana.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {wordPool.length < MIN_POOL_SIZE && (
        <p className="text-xs text-red-400">
          この範囲は語数が足りません（{MIN_POOL_SIZE}語以上必要）
        </p>
      )}

      <div className="flex items-center gap-3">
        {savedRun && (
          <button
            onClick={onContinue}
            className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            続きから（幕{savedRun.ante} {ROUND_LABELS[savedRun.roundIndex]}）
            <kbd className="ml-2 text-xs opacity-60">Space</kbd>
          </button>
        )}
        <button
          onClick={onStart}
          disabled={wordPool.length < MIN_POOL_SIZE}
          className={
            savedRun
              ? "px-6 py-2.5 rounded-md border border-border text-sm font-bold hover:bg-accent transition-colors disabled:opacity-50"
              : "px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          }
        >
          {savedRun ? "新しくランを開始" : "ランを開始"}
          {!savedRun && <kbd className="ml-2 text-xs opacity-60">Space</kbd>}
        </button>
      </div>
    </div>
  );
}
