"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  validateInput,
  validateCompositionInput,
} from "@/lib/input-engine";
import { resolveKeyToKana } from "@/lib/resolve-key-to-kana";
import { resolveChordToKana, matchChordToTarget } from "@/lib/resolve-chord-to-kana";
import { createSessionResult } from "@/lib/stats-calculator";
import { addSession, updateProgress } from "@/lib/storage";
import type { SessionResult } from "@/types/stats";

export type SessionStatus = "idle" | "active" | "completed";

/**
 * physical モードの同時打鍵確定を保留する時間（ミリ秒）。
 *
 * 目標かなに一致してもより長いかな（例: じ → じゃ）に伸びうる場合のみ、この時間だけ
 * 後続キーを待ってから確定する。通常の一致（伸びる余地なし）は即確定するので、この値は
 * 複数文字かな（combo）のときだけ効く。押下タイミングの判定には使わない。
 */
const CHORD_SETTLE_MS = 50;

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

  // physical モードの同時打鍵（chord）判定用（目標かなベース）
  // 「次に打つべきかな」が既知なので、押下中のキー集合が目標かなのキー集合に一致した
  // 時点で確定する。押下タイミングには依存せず、正しいキーさえ押せば発動する。
  // - pressedRef:  現在物理的に押下中の集合（オートリピート除去・オーバーラップ判定用）
  // - clusterRef:  未確定の現在の試行に含まれるキー集合（確定済みキーは除く）
  // - consumedRef: 確定済みだがまだ物理的に押されているキー（次の試行で二重計上しない）
  // - pendingKanaRef: 一致したが「より長いかな」に伸びうるため確定保留中のかな
  // - settleTimerRef: 保留中のかなを確定するタイマー
  // - posRef:      physical モードでの権威的な現在位置（setState の非同期化を回避）
  const pressedRef = useRef<Set<string>>(new Set());
  const clusterRef = useRef<Set<string>>(new Set());
  const consumedRef = useRef<Set<string>>(new Set());
  const pendingKanaRef = useRef<string | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posRef = useRef(0);

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

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    pendingKanaRef.current = null;
  }, []);

  // 一致したかなを正解として確定し、kana.length 分だけ前進する
  const commitCorrect = useCallback(
    (kana: string) => {
      clearSettleTimer();
      // 確定に使ったキーがまだ物理的に押されていれば「消費済み」に移し、次の試行で
      // 二重計上しない（例: ど 確定後も J/D を押しっぱなしのまま次へ）
      for (const k of clusterRef.current) {
        if (pressedRef.current.has(k)) consumedRef.current.add(k);
      }
      clusterRef.current = new Set();

      const startPos = posRef.current;
      const newPos = startPos + kana.length;
      posRef.current = newPos;

      setState((prev) => {
        if (prev.status === "completed") return prev;
        const now = performance.now();
        const startTime = prev.startTime ?? now;
        const newResults = [...prev.results];
        for (let i = 0; i < kana.length; i++) {
          newResults[startPos + i] = {
            char: prev.targetText[startPos + i],
            correct: true,
            inputChar: kana[i],
          };
        }
        const isComplete = newPos >= prev.targetText.length;
        const newState: TypingSessionState = {
          ...prev,
          status: isComplete ? "completed" : "active",
          currentPosition: newPos,
          results: newResults,
          startTime,
        };
        if (isComplete) {
          setTimeout(() => finishSession(newState), 0);
        }
        return newState;
      });
    },
    [finishSession, clearSettleTimer]
  );

  // 現在位置をミスとして記録する（前進しない）
  const commitMiss = useCallback(() => {
    const resolved = resolveChordToKana([...clusterRef.current]);
    clearSettleTimer();
    clusterRef.current = new Set();
    const pos = posRef.current;

    setState((prev) => {
      if (prev.status === "completed") return prev;
      if (pos >= prev.targetText.length) return prev;
      const now = performance.now();
      const startTime = prev.startTime ?? now;
      const newResults = [...prev.results];
      newResults[pos] = {
        char: prev.targetText[pos],
        correct: false,
        inputChar: resolved ?? "",
      };
      return {
        ...prev,
        status: "active",
        currentPosition: pos,
        results: newResults,
        missCount: prev.missCount + 1,
        startTime,
      };
    });
  }, [clearSettleTimer]);

  // 現在のクラスタを目標かなと照合し、確定・保留・待機を決める
  const evaluateCluster = useCallback(() => {
    const tail = targetText.slice(posRef.current);
    if (tail.length === 0) return;

    const { kana, canExtend } = matchChordToTarget([...clusterRef.current], tail);
    clearSettleTimer();

    if (kana && !canExtend) {
      // 目標に一致し、これ以上伸びる余地なし → 即確定
      commitCorrect(kana);
    } else if (kana && canExtend) {
      // 一致したが、より長いかな（例: じ→じゃ）になりうる → 少し待って後続キーを見る
      pendingKanaRef.current = kana;
      settleTimerRef.current = setTimeout(() => {
        const k = pendingKanaRef.current;
        if (k !== null) commitCorrect(k);
      }, CHORD_SETTLE_MS);
    }
    // 未一致（kana === null）は、後続キー or 全キー解放（＝ミス確定）を待つ
  }, [targetText, clearSettleTimer, commitCorrect]);

  // physical モード: キー押下 → クラスタに追加して目標照合
  const processChordKeyDown = useCallback(
    (code: string) => {
      // オートリピート由来／確定後も押下中のキーの重複keydownは無視
      if (pressedRef.current.has(code)) return;
      pressedRef.current.add(code);
      clusterRef.current.add(code);
      evaluateCluster();
    },
    [evaluateCluster]
  );

  // physical モード: キー解放 → 未確定クラスタが全解放されたら確定/ミスを判定
  const processChordKeyUp = useCallback(
    (code: string) => {
      pressedRef.current.delete(code);
      consumedRef.current.delete(code);
      if (!clusterRef.current.has(code)) return; // 確定済み/無関係キーの解放
      // まだ押下中の未確定キーが残っていれば、組み立て継続中
      const anyHeld = [...clusterRef.current].some((k) =>
        pressedRef.current.has(k)
      );
      if (anyHeld) return;
      // 未確定クラスタが全解放された → 保留中の一致があれば確定、なければミス
      if (pendingKanaRef.current !== null) {
        commitCorrect(pendingKanaRef.current);
      } else {
        commitMiss();
      }
    },
    [commitCorrect, commitMiss]
  );

  const clearChord = useCallback(() => {
    clearSettleTimer();
    pressedRef.current = new Set();
    clusterRef.current = new Set();
    consumedRef.current = new Set();
    posRef.current = 0;
  }, [clearSettleTimer]);

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
