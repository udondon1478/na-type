import type { SessionResult } from "@/types/stats";
import { calculateWpm, calculateAccuracy } from "./input-engine";

export function createSessionResult(params: {
  lessonId: string;
  exerciseId: string;
  correctChars: number;
  totalChars: number;
  missCount: number;
  elapsedMs: number;
}): SessionResult {
  const { lessonId, exerciseId, correctChars, totalChars, missCount, elapsedMs } =
    params;

  return {
    id: crypto.randomUUID(),
    lessonId,
    exerciseId,
    timestamp: Date.now(),
    totalChars,
    correctChars,
    missCount,
    elapsedMs,
    wpm: calculateWpm(correctChars, elapsedMs),
    accuracy: calculateAccuracy(correctChars, correctChars + missCount),
  };
}
