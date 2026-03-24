"use client";

import { useCallback, useMemo } from "react";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { useTypingSession } from "@/hooks/useTypingSession";
import { TargetText } from "./TargetText";
import { SessionStats } from "../stats/SessionStats";
import { KeyboardVisualizer } from "../keyboard/KeyboardVisualizer";
import { getKeysForKana } from "@/lib/kana-to-keys";
import type { SessionResult } from "@/types/stats";

interface TypingAreaProps {
  lessonId: string;
  exerciseId: string;
  targetText: string;
  onComplete?: (result: SessionResult) => void;
  showKeyboard?: boolean;
}

export function TypingArea({
  lessonId,
  exerciseId,
  targetText,
  onComplete,
  showKeyboard = true,
}: TypingAreaProps) {
  const session = useTypingSession({
    lessonId,
    exerciseId,
    targetText,
    onComplete,
  });

  const handleKeyDown = useCallback(
    (event: { key: string; code: string }) => {
      if (session.status === "completed") return;

      // Backspaceは無視（ミスしても進む方式）
      if (event.key === "Backspace") return;

      // 特殊キーは無視
      if (event.key.length > 1 && event.key !== "Enter") return;

      session.processInput(event.key, event.code);
    },
    [session]
  );

  const handleCompositionEnd = useCallback(
    (text: string) => {
      if (session.status === "completed") return;
      session.processComposition(text);
    },
    [session]
  );

  useKeyboardInput({
    onKeyDown: handleKeyDown,
    onCompositionEnd: handleCompositionEnd,
    enabled: session.status !== "completed",
  });

  // 現在のかなに対応する物理キーをハイライト
  const highlightKeys = useMemo(() => {
    if (session.currentPosition >= session.targetText.length) return [];
    const currentKana = session.targetText[session.currentPosition];
    return getKeysForKana(currentKana);
  }, [session.currentPosition, session.targetText]);

  return (
    <div className="space-y-6">
      {session.status === "idle" && (
        <p className="text-sm text-muted-foreground animate-pulse">
          入力を開始すると計測がスタートします
        </p>
      )}

      <div className="rounded-lg border border-border bg-card p-6 min-h-[100px] flex items-center justify-center">
        <TargetText
          text={session.targetText}
          currentPosition={session.currentPosition}
          results={session.results}
        />
      </div>

      {showKeyboard && session.status !== "completed" && (
        <KeyboardVisualizer highlightKeys={highlightKeys} />
      )}

      {session.status === "active" && (
        <SessionStats
          correctChars={session.results.filter((r) => r.correct).length}
          totalAttempts={session.results.length}
          missCount={session.missCount}
          startTime={session.startTime}
        />
      )}

      {session.status === "completed" && (
        <div className="space-y-4">
          <SessionStats
            correctChars={session.results.filter((r) => r.correct).length}
            totalAttempts={session.results.length}
            missCount={session.missCount}
            startTime={session.startTime}
          />
          <button
            onClick={session.reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            もう一度
          </button>
        </div>
      )}
    </div>
  );
}
