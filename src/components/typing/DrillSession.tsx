"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TypingArea } from "./TypingArea";
import { calculateWpm, calculateAccuracy } from "@/lib/input-engine";
import type { SessionResult } from "@/types/stats";

interface DrillSessionProps {
  words: string[];
  lessonId: string;
  onSessionComplete?: () => void;
}

export function DrillSession({
  words,
  lessonId,
  onSessionComplete,
}: DrillSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordResults, setWordResults] = useState<SessionResult[]>([]);
  const [finished, setFinished] = useState(false);
  // セッション経過時間を完了時に確定して保持（render中にref/performance.now()を触らない）
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const sessionStartRef = useRef<number | null>(null);
  const lastCompletedIndexRef = useRef(-1);

  const handleWordComplete = useCallback(
    (result: SessionResult) => {
      // 同一単語の二重完了を防止
      if (lastCompletedIndexRef.current >= currentIndex) return;
      lastCompletedIndexRef.current = currentIndex;

      if (sessionStartRef.current === null) {
        sessionStartRef.current = performance.now() - result.elapsedMs;
      }

      const isLastWord = wordResults.length + 1 >= words.length;
      setWordResults((prev) => [...prev, result]);

      if (isLastWord) {
        // 完了時にセッション経過時間を確定（render中にref/performance.nowを触らない）
        const start = sessionStartRef.current;
        setTotalElapsedMs(
          start !== null
            ? performance.now() - start
            : [...wordResults, result].reduce((s, r) => s + r.elapsedMs, 0)
        );
        setFinished(true);
      } else if (currentIndex < words.length - 1) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 300);
      }
    },
    [currentIndex, words.length, wordResults]
  );

  // 完了時のキーボード操作
  const handleRetry = useCallback(() => {
    lastCompletedIndexRef.current = -1;
    setCurrentIndex(0);
    setWordResults([]);
    setFinished(false);
    setTotalElapsedMs(0);
    sessionStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!finished) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSessionComplete?.();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleRetry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [finished, onSessionComplete, handleRetry]);

  if (finished) {
    const totalCorrect = wordResults.reduce((s, r) => s + r.correctChars, 0);
    const totalMiss = wordResults.reduce((s, r) => s + r.missCount, 0);
    const wpm = calculateWpm(totalCorrect, totalElapsedMs);
    const accuracy = calculateAccuracy(totalCorrect, totalCorrect + totalMiss);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-primary">
            {words.length}語 完了！
          </p>
        </div>

        <div className="flex justify-center gap-8 text-sm font-mono">
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
            <span className="text-lg font-bold text-destructive">
              {totalMiss}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            もう一度
            <kbd className="ml-2 text-xs opacity-60">R</kbd>
          </button>
          <button
            onClick={onSessionComplete}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            次の{words.length}語
            <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const nextWord = currentIndex + 1 < words.length ? words[currentIndex + 1] : null;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground text-center font-mono">
        {currentIndex + 1} / {words.length}
      </div>

      <TypingArea
        key={`${lessonId}-${currentIndex}`}
        lessonId={lessonId}
        exerciseId={`${lessonId}-word-${currentIndex}`}
        targetText={currentWord}
        onComplete={handleWordComplete}
        showKeyboard={true}
      />

      {nextWord && (
        <div className="text-center text-muted-foreground/40 text-lg font-mono select-none">
          次: {nextWord}
        </div>
      )}
    </div>
  );
}
