"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { BALANCE } from "@/lib/fuda/balance";
import { createMenuState, fudaReducer } from "@/lib/fuda/engine";
import { matchChordToHand, type HandChordCandidate } from "@/lib/fuda/input";
import { toKanaAttr } from "@/lib/fuda/segment";
import { resolveChordEntry } from "@/lib/resolve-chord-to-kana";
import type { KanaAttr, SchoolId } from "@/types/fuda";

/**
 * 言霊札の状態管理フック
 *
 * ロジックの真実は純粋 reducer（lib/fuda/engine.ts）にあり、このフックは
 * (1) イベントへの時刻付与、(2) physical モードの chord 判定（押下集合の解決）、
 * (3) タイマー・フォーカスロス等の副作用、だけを担う。
 *
 * chord 判定は keydown/keyup の同期処理で行うが、dispatch の反映は非同期なので、
 * 入力中の札の残り（tail）を「影」として楽観的に進める。影は render 後に
 * reducer の状態から再同期されるため、恒久的にズレることはない。
 */

interface ChordPending {
  handIndex: number;
  kana: string;
  attr: KanaAttr;
}

export function useFudaGame() {
  const [state, dispatch] = useReducer(fudaReducer, undefined, createMenuState);

  // chord 層が最新状態を同期的に読むためのミラー
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // 入力中の札の影（handIndex + 未入力 tail）。null = 未入力状態
  const shadowRef = useRef<{ handIndex: number; tail: string } | null>(null);
  useEffect(() => {
    const round = state.round;
    const active = round?.active ?? null;
    if (state.phase !== "round" || !round || !active) {
      shadowRef.current = null;
      return;
    }
    const card = state.deck.find((c) => c.uid === active.cardUid);
    if (!card) {
      shadowRef.current = null;
      return;
    }
    shadowRef.current = {
      handIndex: round.hand.indexOf(active.cardUid),
      tail: [...card.word].slice(active.charProgress).join(""),
    };
  }, [state]);

  // ── physical モードの同時打鍵（chord）判定。useKotodamaGame と同じ ref 構造 ──
  const pressedRef = useRef<Set<string>>(new Set());
  const clusterRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<ChordPending | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const resetChordState = useCallback(() => {
    clearSettleTimer();
    pressedRef.current = new Set();
    clusterRef.current = new Set();
  }, [clearSettleTimer]);

  /** chord 確定: unitTyped を発行し、影を進める */
  const commitChord = useCallback(
    (handIndex: number, kana: string, attr: KanaAttr) => {
      dispatch({
        type: "unitTyped",
        handIndex,
        unit: kana,
        attr,
        at: performance.now(),
      });

      const shadow = shadowRef.current;
      if (shadow) {
        const rest = shadow.tail.slice(kana.length);
        shadowRef.current = rest ? { ...shadow, tail: rest } : null;
        return;
      }
      // 新しく打ち始めた札: reducer の反映前に影を立てる
      const run = stateRef.current;
      const uid = run.round?.hand[handIndex];
      const card = uid !== undefined ? run.deck.find((c) => c.uid === uid) : undefined;
      if (!card) return;
      const rest = card.word.slice(kana.length);
      shadowRef.current = rest ? { handIndex, tail: rest } : null;
    },
    []
  );

  const evaluateCluster = useCallback(() => {
    const run = stateRef.current;
    const round = run.round;
    if (run.phase !== "round" || !round) return;

    const shadow = shadowRef.current;
    let candidates: HandChordCandidate[];
    if (shadow) {
      candidates = [shadow];
    } else {
      const indices =
        round.selected.length > 0
          ? [...round.selected].sort((a, b) => a - b)
          : round.hand.map((_, i) => i);
      candidates = [];
      for (const i of indices) {
        const card = run.deck.find((c) => c.uid === round.hand[i]);
        if (card) candidates.push({ handIndex: i, tail: card.word });
      }
    }

    const clusterKeys = [...clusterRef.current];
    const { match, canExtend } = matchChordToHand(clusterKeys, candidates);
    clearSettleTimer();

    if (match && !canExtend) {
      const attr = toKanaAttr(resolveChordEntry(clusterKeys)?.inputType ?? null);
      clusterRef.current = new Set();
      commitChord(match.handIndex, match.kana, attr);
    } else if (match && canExtend) {
      // より長いかな（じ→じゃ 等）になりうるため確定を保留して後続キーを待つ
      const attr = toKanaAttr(resolveChordEntry(clusterKeys)?.inputType ?? null);
      pendingRef.current = { handIndex: match.handIndex, kana: match.kana, attr };
      settleTimerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending === null) return;
        clearSettleTimer();
        clusterRef.current = new Set();
        commitChord(pending.handIndex, pending.kana, pending.attr);
      }, BALANCE.timing.chordSettleMs);
    }
    // 未一致は後続キー or 全キー解放（＝ミス確定）を待つ
  }, [clearSettleTimer, commitChord]);

  const handleChordKeyDown = useCallback(
    (code: string) => {
      const run = stateRef.current;
      if (run.phase !== "round") return;
      if (pressedRef.current.has(code)) return; // オートリピート除去
      pressedRef.current.add(code);
      clusterRef.current.add(code);
      evaluateCluster();
    },
    [evaluateCluster]
  );

  const handleChordKeyUp = useCallback(
    (code: string) => {
      pressedRef.current.delete(code);
      const run = stateRef.current;
      if (run.phase !== "round") return;
      if (!clusterRef.current.has(code)) return; // 確定済み/無関係キーの解放
      const anyHeld = [...clusterRef.current].some((k) =>
        pressedRef.current.has(k)
      );
      if (anyHeld) return;

      // 未確定クラスタが全解放された → 保留があれば確定、なければミス
      const pending = pendingRef.current;
      clusterRef.current = new Set();
      if (pending !== null) {
        clearSettleTimer();
        commitChord(pending.handIndex, pending.kana, pending.attr);
      } else {
        clearSettleTimer();
        dispatch({ type: "chordMiss", at: performance.now() });
      }
    },
    [clearSettleTimer, commitChord]
  );

  // ── かな入力（karabiner / remapping モード） ──

  const handleKanaInput = useCallback((text: string, keyCode?: string) => {
    const at = performance.now();
    for (const char of text) {
      dispatch({ type: "charTyped", char, at, keyCode });
    }
  }, []);

  // ── フェーズ操作 ──

  const startRun = useCallback(
    (options: {
      lessonLevel: number;
      wordPool: string[];
      stake?: number;
      schoolId?: SchoolId;
    }) => {
      resetChordState();
      dispatch({
        type: "startRun",
        seed: Date.now(),
        lessonLevel: options.lessonLevel,
        wordPool: options.wordPool,
        stake: options.stake,
        schoolId: options.schoolId,
      });
    },
    [resetChordState]
  );

  const beginRound = useCallback(() => {
    resetChordState();
    dispatch({ type: "beginRound", at: performance.now() });
  }, [resetChordState]);

  const confirmRoundResult = useCallback(() => {
    resetChordState();
    dispatch({ type: "confirmRoundResult", at: performance.now() });
  }, [resetChordState]);

  const toggleSelect = useCallback((index: number) => {
    dispatch({ type: "toggleSelect", index });
  }, []);

  const discardSelected = useCallback(() => {
    dispatch({ type: "discardSelected", at: performance.now() });
  }, []);

  const abortWord = useCallback(() => {
    resetChordState();
    dispatch({ type: "abortWord" });
  }, [resetChordState]);

  const backToMenu = useCallback(() => {
    resetChordState();
    dispatch({ type: "backToMenu" });
  }, [resetChordState]);

  // ── 副作用 ──

  // 刻限ボス: 締切で timeUp を発行する（残り時間の表示は UI ローカルで補間）
  useEffect(() => {
    const deadlineAt = state.round?.deadlineAt ?? null;
    if (state.phase !== "round" || deadlineAt === null) return;
    const delay = Math.max(0, deadlineAt - performance.now());
    const timer = setTimeout(() => {
      dispatch({ type: "timeUp", at: performance.now() });
    }, delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.round?.deadlineAt]);

  // フォーカスロス・タブ切替で keyup を取り逃した押下状態をリセットする
  useEffect(() => {
    const handleReset = () => resetChordState();
    window.addEventListener("blur", handleReset);
    document.addEventListener("visibilitychange", handleReset);
    return () => {
      window.removeEventListener("blur", handleReset);
      document.removeEventListener("visibilitychange", handleReset);
    };
  }, [resetChordState]);

  // アンマウント時に保留タイマーを破棄
  useEffect(() => {
    return () => clearSettleTimer();
  }, [clearSettleTimer]);

  return {
    state,
    startRun,
    beginRound,
    confirmRoundResult,
    toggleSelect,
    discardSelected,
    abortWord,
    backToMenu,
    handleKanaInput,
    handleChordKeyDown,
    handleChordKeyUp,
  };
}
