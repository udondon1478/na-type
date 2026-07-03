"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  validateInput,
  validateCompositionInput,
} from "@/lib/input-engine";
import { resolveKeyToKana } from "@/lib/resolve-key-to-kana";
import { createSessionResult } from "@/lib/stats-calculator";
import { addSession, updateProgress } from "@/lib/storage";
import type { SessionResult, InputMethod } from "@/types/stats";

export type SessionStatus = "idle" | "active" | "completed";

interface CharResult {
  char: string;
  correct: boolean;
  inputChar: string;
  keyCode?: string;
}

interface TypingSessionState {
  status: SessionStatus;
  targetText: string;
  currentPosition: number;
  results: CharResult[];
  missCount: number;
  startTime: number | null;
}

interface UseTypingSessionOptions {
  lessonId: string;
  exerciseId: string;
  targetText: string;
  onComplete?: (result: SessionResult) => void;
  /** Phase 2（同時打鍵対応）で physical モードの chord 判定に使用予定 */
  inputMethod?: InputMethod;
}

export function useTypingSession({
  lessonId,
  exerciseId,
  targetText,
  onComplete,
}: UseTypingSessionOptions) {
  const [state, setState] = useState<TypingSessionState>({
    status: "idle",
    targetText,
    currentPosition: 0,
    results: [],
    missCount: 0,
    startTime: null,
  });

  const onCompleteRef = useRef(onComplete);
  const finishedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishSession = useCallback(
    (finalState: TypingSessionState) => {
      // 同一セッションで複数回呼ばれるのを防止
      // （processInputとprocessCompositionが同じ入力で両方完了を検出する場合）
      if (finishedRef.current) return;
      finishedRef.current = true;
      const elapsedMs = finalState.startTime
        ? performance.now() - finalState.startTime
        : 0;

      const correctChars = finalState.results.filter((r) => r.correct).length;

      const result = createSessionResult({
        lessonId,
        exerciseId,
        correctChars,
        totalChars: correctChars + finalState.missCount,
        missCount: finalState.missCount,
        elapsedMs,
      });

      addSession(result);
      updateProgress(lessonId, result);
      onCompleteRef.current?.(result);
    },
    [lessonId, exerciseId]
  );

  const processInput = useCallback(
    (inputChar: string, keyCode?: string) => {
      setState((prev) => {
        if (prev.status === "completed") return prev;

        const now = performance.now();
        const startTime = prev.startTime ?? now;
        const status: SessionStatus =
          prev.status === "idle" ? "active" : prev.status;

        if (prev.currentPosition >= prev.targetText.length) return prev;

        const expectedChar = prev.targetText[prev.currentPosition];
        let result = validateInput(inputChar, expectedChar);

        // 物理キーコードから薙刀式かなを逆引き
        // - karabiner/remapping: OS変換で直接かなが届くのが通常だが、変換が
        //   来なかった場合の保険として機能する
        // - physical: 物理キー位置で薙刀式を判定する主経路（例: J→あ）
        // Phase1として単独打鍵（single）のみ対応。同時打鍵（shift/濁点/combo）は
        // resolveKeyToKanaがsingleしか解決しないため未対応（#3で対応予定）。
        if (!result.correct && keyCode) {
          const resolvedKana = resolveKeyToKana(keyCode);
          if (resolvedKana === expectedChar) {
            result = { correct: true, inputChar: resolvedKana, expectedChar };
          }
        }

        const charResult: CharResult = {
          char: expectedChar,
          correct: result.correct,
          inputChar: result.inputChar,
          keyCode,
        };

        const newResults = [...prev.results];
        newResults[prev.currentPosition] = charResult;
        const newMissCount = prev.missCount + (result.correct ? 0 : 1);
        const newPosition = result.correct
          ? prev.currentPosition + 1
          : prev.currentPosition;

        const isComplete = newPosition >= prev.targetText.length;

        const newState: TypingSessionState = {
          ...prev,
          status: isComplete ? "completed" : status,
          currentPosition: newPosition,
          results: newResults,
          missCount: newMissCount,
          startTime,
        };

        if (isComplete) {
          // setTimeout to avoid setState in setState
          setTimeout(() => finishSession(newState), 0);
        }

        return newState;
      });
    },
    [finishSession]
  );

  const processComposition = useCallback(
    (composedText: string) => {
      setState((prev) => {
        if (prev.status === "completed") return prev;

        const now = performance.now();
        const startTime = prev.startTime ?? now;
        const status: SessionStatus =
          prev.status === "idle" ? "active" : prev.status;

        const results = validateCompositionInput(
          composedText,
          prev.targetText,
          prev.currentPosition
        );

        let newPosition = prev.currentPosition;
        let newMissCount = prev.missCount;
        const newResults = [...prev.results];

        for (const r of results) {
          newResults[newPosition] = {
            char: r.expectedChar,
            correct: r.correct,
            inputChar: r.inputChar,
          };
          if (r.correct) {
            newPosition++;
          }
          if (!r.correct) {
            newMissCount++;
          }
        }

        const isComplete = newPosition >= prev.targetText.length;

        const newState: TypingSessionState = {
          ...prev,
          status: isComplete ? "completed" : status,
          currentPosition: newPosition,
          results: newResults,
          missCount: newMissCount,
          startTime,
        };

        if (isComplete) {
          setTimeout(() => finishSession(newState), 0);
        }

        return newState;
      });
    },
    [finishSession]
  );

  const reset = useCallback(() => {
    finishedRef.current = false;
    setState({
      status: "idle",
      targetText,
      currentPosition: 0,
      results: [],
      missCount: 0,
      startTime: null,
    });
  }, [targetText]);

  return {
    ...state,
    processInput,
    processComposition,
    reset,
  };
}
