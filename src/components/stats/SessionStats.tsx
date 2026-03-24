"use client";

import { useEffect, useState } from "react";
import { calculateWpm, calculateAccuracy } from "@/lib/input-engine";

interface SessionStatsProps {
  correctChars: number;
  totalAttempts: number;
  missCount: number;
  startTime: number | null;
}

export function SessionStats({
  correctChars,
  totalAttempts,
  missCount,
  startTime,
}: SessionStatsProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsed(performance.now() - startTime);
    }, 200);

    return () => clearInterval(interval);
  }, [startTime]);

  const wpm = calculateWpm(correctChars, elapsed);
  const accuracy = calculateAccuracy(correctChars, totalAttempts);

  return (
    <div className="flex gap-6 text-sm font-mono">
      <div>
        <span className="text-muted-foreground">WPM </span>
        <span className="text-lg font-bold">{wpm}</span>
      </div>
      <div>
        <span className="text-muted-foreground">正確率 </span>
        <span className="text-lg font-bold">{accuracy}%</span>
      </div>
      <div>
        <span className="text-muted-foreground">ミス </span>
        <span className="text-lg font-bold text-destructive">{missCount}</span>
      </div>
    </div>
  );
}
