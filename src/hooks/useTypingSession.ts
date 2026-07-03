"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  validateInput,
  validateCompositionInput,
} from "@/lib/input-engine";
import { resolveKeyToKana } from "@/lib/resolve-key-to-kana";
import { resolveChordToKana } from "@/lib/resolve-chord-to-kana";
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
  const finishedRef = useRef(false);

  // physical モードの同時打鍵（chord）判定用
  // heldRef: 現在押下中の event.code 集合
  // chordRef: 押下開始〜全解放までに押された event.code の和集合
  const heldRef = useRef<Set<string>>(new Set());
  const chordRef = useRef<Set<string>>(new Set());

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

        // 物理キーコードから薙刀式かなを逆引き（karabiner/remapping 用の保険）。
        // OS変換で直接かなが届くのが通常だが、変換が来なかった場合の単独打鍵フォールバック。
        // physical モードは keydown/keyup ベースの chord 経路（processChordKeyDown/Up）で
        // 判定するため、このパスは通らない。
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

  // physical モード: キー押下 → chord に蓄積（keydown 時点では確定しない）
  const processChordKeyDown = useCallback((code: string) => {
    heldRef.current.add(code);
    chordRef.current.add(code);
  }, []);

  // physical モード: キー解放 → held が空になった時点で chord を確定・判定
  // （release ベース＝薙刀式の同時打鍵に自然に一致。押し順が前後しても和集合で判定）
  const processChordKeyUp = useCallback(
    (code: string) => {
      heldRef.current.delete(code);
      // まだ押下中のキーがあれば確定しない（プレフィックス誤発火を防ぐ）
      if (heldRef.current.size > 0) return;
      if (chordRef.current.size === 0) return;

      const codes = [...chordRef.current];
      chordRef.current = new Set();
      const resolved = resolveChordToKana(codes);

      setState((prev) => {
        if (prev.status === "completed") return prev;
        if (prev.currentPosition >= prev.targetText.length) return prev;

        const now = performance.now();
        const startTime = prev.startTime ?? now;
        const status: SessionStatus =
          prev.status === "idle" ? "active" : prev.status;

        // 複数文字かな（じゃ・『』等）は kana.length 分だけ目標と照合・前進する
        const expected = resolved
          ? prev.targetText.slice(
              prev.currentPosition,
              prev.currentPosition + resolved.length
            )
          : prev.targetText[prev.currentPosition];
        const correct = resolved !== null && resolved === expected;

        const newResults = [...prev.results];
        let newPosition = prev.currentPosition;
        let newMissCount = prev.missCount;

        if (correct) {
          for (let i = 0; i < resolved.length; i++) {
            newResults[newPosition] = {
              char: prev.targetText[newPosition],
              correct: true,
              inputChar: resolved[i],
            };
            newPosition++;
          }
        } else {
          newResults[newPosition] = {
            char: prev.targetText[newPosition],
            correct: false,
            inputChar: resolved ?? "",
          };
          newMissCount++;
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
    heldRef.current = new Set();
    chordRef.current = new Set();
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
    processChordKeyDown,
    processChordKeyUp,
    reset,
  };
}
