"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  validateInput,
  validateCompositionInput,
} from "@/lib/input-engine";
import { createSessionResult } from "@/lib/stats-calculator";
import { addSession, updateProgress } from "@/lib/storage";
import type { SessionResult } from "@/types/stats";

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

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishSession = useCallback(
    (finalState: TypingSessionState) => {
      const elapsedMs = finalState.startTime
        ? performance.now() - finalState.startTime
        : 0;

      const correctChars = finalState.results.filter((r) => r.correct).length;

      const result = createSessionResult({
        lessonId,
        exerciseId,
        correctChars,
        totalChars: finalState.results.length,
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
        const result = validateInput(inputChar, expectedChar);

        const charResult: CharResult = {
          char: expectedChar,
          correct: result.correct,
          inputChar,
          keyCode,
        };

        const newResults = [...prev.results, charResult];
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
          newResults.push({
            char: r.expectedChar,
            correct: r.correct,
            inputChar: r.inputChar,
          });
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
