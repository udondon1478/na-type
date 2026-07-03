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

/**
 * physical モードで「同時打鍵」とみなす押下の時間窓（ミリ秒）。
 * 最初のキー押下からこの時間内に押されたキーだけを1つの同時打鍵として扱う。
 *
 * 人間の「同時押し」は指の着地が数十msばらつくため、狭すぎると意図的な同時打鍵を
 * 取りこぼす。一方 physical モードはツール導入前のお試し（≒初心者・連続打鍵の間隔は
 * 広い）用途なので、やや広めにしても連続打鍵との誤結合は起きにくい。
 * 60ms は連続打鍵（通常 150〜300ms/文字、速い人でも ≈100ms）とは十分に分離できる。
 */
const CHORD_WINDOW_MS = 60;

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

  // physical モードの同時打鍵（chord）判定用（時間窓ベース）
  // 最初のキー押下から CHORD_WINDOW_MS 以内に押されたキーを1つの同時打鍵とみなす。
  // 窓が閉じた時点（またはそれより後の押下が来た時点）で塊を確定する。
  // - pressedRef: 現在物理的に押下中の集合（オートリピートの重複keydown除去用）
  // - chordRef:   形成中の塊（同一同時打鍵とみなすキー集合）
  // - chordStartRef: 塊の最初のキーが押された時刻（performance.now）
  // - flushTimerRef: 窓が閉じた時点で確定するためのタイマー
  const pressedRef = useRef<Set<string>>(new Set());
  const chordRef = useRef<Set<string>>(new Set());
  const chordStartRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // 形成中の塊を確定して目標かなと照合する（時間窓の満了・別打鍵の割込み時に呼ばれる）
  const commitChord = useCallback(
    () => {
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (chordRef.current.size === 0) {
        chordStartRef.current = null;
        return;
      }

      const codes = [...chordRef.current];
      chordRef.current = new Set();
      chordStartRef.current = null;
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

  const startChord = useCallback((code: string, timestamp: number) => {
    chordRef.current = new Set([code]);
    chordStartRef.current = timestamp;
    flushTimerRef.current = setTimeout(commitChord, CHORD_WINDOW_MS);
  }, [commitChord]);

  // physical モード: キー押下 → 「時間窓 かつ オーバーラップ」で同時打鍵をクラスタリング
  const processChordKeyDown = useCallback(
    (code: string, timestamp: number) => {
      // オートリピート由来の重複keydownは無視
      if (pressedRef.current.has(code)) return;

      const start = chordStartRef.current;
      if (start === null) {
        pressedRef.current.add(code);
        startChord(code, timestamp);
        return;
      }

      // 同時打鍵とみなす条件（Karabiner の絶対時間窓 + やまぶき/薙刀式のオーバーラップ）:
      //   1. 最初の押下から CHORD_WINDOW_MS 以内（連続打鍵＝ロールオーバーを弾く）
      //   2. 直前の塊のキーがまだ物理的に押されている（＝重なっている。全部離した後の
      //      「離して押し直し」は、たとえ窓内でも連続打鍵として分離する）
      const withinWindow = timestamp - start <= CHORD_WINDOW_MS;
      const overlapping = [...chordRef.current].some((k) =>
        pressedRef.current.has(k)
      );
      pressedRef.current.add(code);

      if (withinWindow && overlapping) {
        // 同一同時打鍵に追加（確定時刻は最初の押下基準のまま）
        chordRef.current.add(code);
      } else {
        // 別打鍵 → 現在の塊を即確定してから新しい塊を開始
        commitChord();
        startChord(code, timestamp);
      }
    },
    [commitChord, startChord]
  );

  // physical モード: キー解放 → 押下集合の追跡のみ（確定は時間窓が担う）
  const processChordKeyUp = useCallback((code: string) => {
    pressedRef.current.delete(code);
  }, []);

  const clearChord = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    pressedRef.current = new Set();
    chordRef.current = new Set();
    chordStartRef.current = null;
  }, []);

  const reset = useCallback(() => {
    finishedRef.current = false;
    clearChord();
    setState({
      status: "idle",
      targetText,
      currentPosition: 0,
      results: [],
      missCount: 0,
      startTime: null,
    });
  }, [targetText, clearChord]);

  // アンマウント時に保留中の確定タイマーを破棄
  useEffect(() => clearChord, [clearChord]);

  return {
    ...state,
    processInput,
    processComposition,
    processChordKeyDown,
    processChordKeyUp,
    reset,
  };
}
