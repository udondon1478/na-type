"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFudaGame } from "@/hooks/useFudaGame";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { KeyboardVisualizer } from "@/components/keyboard/KeyboardVisualizer";
import { getKeysForKana } from "@/lib/kana-to-keys";
import { unitEndOffsets } from "@/lib/fuda/segment";
import { getAvailableKana, filterWords } from "@/lib/word-filter";
import { getProgress, getSettings, updateSettings } from "@/lib/storage";
import { Eye, EyeOff } from "lucide-react";
import { FudaHud } from "./FudaHud";
import { FudaMenu, MIN_POOL_SIZE } from "./FudaMenu";
import { RoundBoard } from "./RoundBoard";
import { RoundIntro } from "./RoundIntro";
import { RoundResult } from "./RoundResult";
import { RunResult } from "./RunResult";

/** 完了済みレッスンから初期レベル（単語範囲）を推定する */
function detectInitialLevel(): number {
  const progress = getProgress();
  let max = 1;
  for (const id of Object.keys(progress)) {
    const m = /^naginata-0([1-8])$/.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export function FudaGame() {
  const [level, setLevel] = useState(1);
  const [keyboardVisible, setKeyboardVisible] = useState(
    () => getSettings().showKeyboard
  );
  // TypingArea と同じくロジック専用（マークアップには使わないのでハイドレーション安全）
  const inputMethod = useMemo(() => getSettings().inputMethod, []);
  const isPhysical = inputMethod === "physical";

  const game = useFudaGame();
  const { state } = game;
  const { phase } = state;

  const wordPool = useMemo(
    () => filterWords(getAvailableKana(level)),
    [level]
  );

  // 初期レベルは localStorage 由来のためマウント後に反映する
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLevel(detectInitialLevel());
  }, []);

  const startRun = useCallback(() => {
    if (wordPool.length < MIN_POOL_SIZE) return;
    game.startRun({ lessonLevel: level, wordPool });
  }, [game, level, wordPool]);

  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible((prev) => {
      const next = !prev;
      updateSettings({ showKeyboard: next });
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: { key: string; code: string }) => {
      switch (phase) {
        case "menu":
          if (event.key === " " || event.key === "Enter") startRun();
          return;

        case "roundIntro":
          if (event.key === " " || event.key === "Enter") game.beginRound();
          return;

        case "round": {
          if (event.key === "Escape") {
            if (state.round?.active) {
              game.abortWord();
            } else if (
              window.confirm("ランを中断してメニューに戻りますか？（進行は失われます）")
            ) {
              game.backToMenu();
            }
            return;
          }
          // 数字キー: 札の明示選択（入力中は無効。reducer 側でもガード）
          const digit = /^Digit([1-8])$/.exec(event.code);
          if (digit) {
            game.toggleSelect(parseInt(digit[1], 10) - 1);
            return;
          }
          if (event.key === "Backspace") {
            game.discardSelected();
            return;
          }
          if (isPhysical) {
            game.handleChordKeyDown(event.code);
            return;
          }
          // Space は開始キーの指残りで叩かれがちで、かなにも該当しないため無視する
          if (event.key.length === 1 && event.key !== " ") {
            game.handleKanaInput(event.key, event.code);
          }
          return;
        }

        case "roundResult":
          if (event.key === " " || event.key === "Enter") {
            game.confirmRoundResult();
          }
          return;

        case "runClear":
        case "runFail":
          if (event.key === "Enter") startRun();
          if (event.key === "Escape") game.backToMenu();
          return;
      }
    },
    [phase, state.round?.active, isPhysical, game, startRun]
  );

  const handleKeyUp = useCallback(
    (code: string) => {
      if (phase !== "round" || !isPhysical) return;
      game.handleChordKeyUp(code);
    },
    [phase, isPhysical, game]
  );

  const handleCompositionEnd = useCallback(
    (text: string) => {
      if (phase !== "round" || isPhysical) return;
      game.handleKanaInput(text);
    },
    [phase, isPhysical, game]
  );

  const { inputRef } = useKeyboardInput({
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onCompositionEnd: handleCompositionEnd,
  });

  // 入力中の札の「次の入力単位」をキーボードガイドに表示する
  const highlightKeys = useMemo(() => {
    if (phase !== "round") return [];
    const active = state.round?.active;
    if (!active) return [];
    const card = state.deck.find((c) => c.uid === active.cardUid);
    if (!card) return [];
    const offsets = unitEndOffsets(card.units);
    const unitIndex = offsets.findIndex((o) => o > active.charProgress);
    if (unitIndex === -1) return [];
    const keys = getKeysForKana(card.units[unitIndex]);
    if (keys.length > 0) return keys;
    const char = [...card.word][active.charProgress];
    return char ? getKeysForKana(char) : [];
  }, [phase, state.round?.active, state.deck]);

  return (
    <div className="space-y-4">
      {/* IME compositionイベント用の隠しテキストエリア */}
      <textarea
        ref={inputRef}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute left-0 top-0 w-px h-px opacity-0 overflow-hidden border-0 p-0 m-0"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {phase === "menu" && (
        <FudaMenu
          level={level}
          onLevelChange={setLevel}
          wordPoolSize={wordPool.length}
          onStart={startRun}
        />
      )}

      {(phase === "roundIntro" ||
        phase === "round" ||
        phase === "roundResult") && <FudaHud run={state} />}

      {phase === "roundIntro" && (
        <RoundIntro run={state} onBegin={game.beginRound} />
      )}

      {phase === "round" && (
        <>
          <RoundBoard run={state} />
          <div className="flex items-center justify-end">
            <button
              onClick={toggleKeyboard}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {keyboardVisible ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              キーボード
            </button>
          </div>
          {keyboardVisible && <KeyboardVisualizer highlightKeys={highlightKeys} />}
        </>
      )}

      {phase === "roundResult" && (
        <RoundResult run={state} onConfirm={game.confirmRoundResult} />
      )}

      {(phase === "runClear" || phase === "runFail") && (
        <RunResult
          run={state}
          onRetry={startRun}
          onBackToMenu={game.backToMenu}
        />
      )}
    </div>
  );
}
