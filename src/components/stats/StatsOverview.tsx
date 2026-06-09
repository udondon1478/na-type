"use client";

import { useState } from "react";
import { getSessions, getProgress } from "@/lib/storage";
import type { SessionResult, LessonProgress } from "@/types/stats";

export function StatsOverview() {
  const [sessions] = useState<SessionResult[]>(() => getSessions());
  const [progress] = useState<Record<string, LessonProgress>>(() => getProgress());

  const totalSessions = sessions.length;
  const completedLessons = Object.values(progress).filter(
    (p) => p.completed
  ).length;

  const recentSessions = sessions.slice(0, 5);
  const avgWpm =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((sum, s) => sum + s.wpm, 0) /
            recentSessions.length
        )
      : 0;
  const avgAccuracy =
    recentSessions.length > 0
      ? Math.round(
          (recentSessions.reduce((sum, s) => sum + s.accuracy, 0) /
            recentSessions.length) *
            10
        ) / 10
      : 0;

  if (totalSessions === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        まだ練習データがありません。レッスンを開始しましょう！
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <StatCard label="練習回数" value={totalSessions.toString()} />
      <StatCard label="完了レッスン" value={`${completedLessons}/8`} />
      <StatCard label="平均WPM" value={avgWpm.toString()} suffix="かな/分" />
      <StatCard label="平均正確率" value={`${avgAccuracy}%`} />
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold font-mono mt-1">
        {value}
        {suffix && (
          <span className="text-xs text-muted-foreground ml-1">{suffix}</span>
        )}
      </p>
    </div>
  );
}
