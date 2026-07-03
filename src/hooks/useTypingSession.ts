"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  validateInput,
  validateCompositionInput,
} from "@/lib/input-engine";
import { resolveKeyToKana } from "@/lib/resolve-key-to-kana";
import { resolveRomajiToKana, isRomajiPrefix } from "@/lib/romaji-resolver";
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
  inputMethod?: InputMethod;
}

export function useTypingSession({
  lessonId,
  exerciseId,
  targetText,
  onComplete,
  inputMethod,
}: UseTypingSessionOptions) {
  const romajiTimeoutMs = inputMethod === "romaji" ? 500 : 30;
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

  // ローマ字蓄積バッファ（Karabiner経由のローマ字シーケンスを蓄積→かな変換）
  // 例: Karabinerが "k","i" を連続送信 → バッファ "ki" → "き" に解決
  const romajiBufferRef = useRef("");
  const romajiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        // フォールバック1: 物理キーコードから薙刀式かなを逆引き
        // karabiner/remappingモード向け（OS変換が来なかった場合の保険）と、
        // physicalモードの主判定を兼ねる。物理キー位置で薙刀式かなを判定する。
        // physicalモードはPhase1として単独打鍵（single）のみ対応。同時打鍵
        // （shift/濁点/combo）はresolveKeyToKanaがsingleしか解決しないため未対応。
        // （romajiモードでは物理jを「あ」と誤認するため無効化）
        if (!result.correct && keyCode && inputMethod !== "romaji") {
          const resolvedKana = resolveKeyToKana(keyCode);
          if (resolvedKana === expectedChar) {
            result = { correct: true, inputChar: resolvedKana, expectedChar };
          }
        }

        // フォールバック2: ローマ字蓄積→かな変換
        // romajiモード専用（リマッピングツールなし、アプリ内でローマ字→かな変換）
        // 例: "k","i" を蓄積 → バッファ "ki" → "き"
        // karabinerモードで有効にすると、生の'a'を「あ」と誤判定し物理キー位置判定を
        // 上書きしてしまうため、romajiモードに限定する。
        if (!result.correct && /^[a-z]$/.test(inputChar) && inputMethod === "romaji") {
          romajiBufferRef.current += inputChar;

          // 完全一致チェック
          const resolvedKana = resolveRomajiToKana(romajiBufferRef.current);
          if (resolvedKana) {
            romajiBufferRef.current = "";
            if (romajiTimerRef.current) {
              clearTimeout(romajiTimerRef.current);
              romajiTimerRef.current = null;
            }
            if (resolvedKana === expectedChar) {
              result = { correct: true, inputChar: resolvedKana, expectedChar };
            } else {
              result = { correct: false, inputChar: resolvedKana, expectedChar };
            }
          } else if (isRomajiPrefix(romajiBufferRef.current)) {
            // 有効なプレフィックス → 次の文字を待つ（状態変更なし）
            // Karabinerは複数キーを数ms以内に送信するため、短いタイムアウトで十分
            if (romajiTimerRef.current) {
              clearTimeout(romajiTimerRef.current);
            }
            romajiTimerRef.current = setTimeout(() => {
              romajiBufferRef.current = "";
              romajiTimerRef.current = null;
            }, romajiTimeoutMs);
            return { ...prev, startTime, status };
          } else {
            // 無効なシーケンス → バッファクリア、ミスとして処理
            romajiBufferRef.current = "";
            if (romajiTimerRef.current) {
              clearTimeout(romajiTimerRef.current);
              romajiTimerRef.current = null;
            }
          }
        } else {
          // 非ローマ字入力時はバッファをクリア
          romajiBufferRef.current = "";
          if (romajiTimerRef.current) {
            clearTimeout(romajiTimerRef.current);
            romajiTimerRef.current = null;
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
    [finishSession, inputMethod, romajiTimeoutMs]
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
    romajiBufferRef.current = "";
    if (romajiTimerRef.current) {
      clearTimeout(romajiTimerRef.current);
      romajiTimerRef.current = null;
    }
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
