"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFudaGame } from "@/hooks/useFudaGame";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { KeyboardVisualizer } from "@/components/keyboard/KeyboardVisualizer";
import { getKeysForKana } from "@/lib/kana-to-keys";
import { deserializeRun } from "@/lib/fuda/save";
import { unitEndOffsets } from "@/lib/fuda/segment";
import {
  ensureAudio,
  playFail,
  playMoney,
  playRoundWin,
  setSoundEnabled,
} from "@/lib/fuda/sfx";
import { getAvailableKana, filterWords } from "@/lib/word-filter";
import {
  getFudaSave,
  getProgress,
  getSettings,
  updateFudaSave,
  updateSettings,
} from "@/lib/storage";
import { Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import { canUseSchool } from "@/lib/fuda/schools";
import { CharmShelf } from "./CharmShelf";
import { FudaHud } from "./FudaHud";
import { FudaMenu, MIN_POOL_SIZE } from "./FudaMenu";
import { RoundBoard } from "./RoundBoard";
import { RoundIntro } from "./RoundIntro";
import { RoundResult } from "./RoundResult";
import { RunResult } from "./RunResult";
import { ShopScreen } from "./ShopScreen";
import type { FudaMeta, RunState, SchoolId } from "@/types/fuda";

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
  const [stake, setStake] = useState(1);
  const [schoolId, setSchoolId] = useState<SchoolId>("kata");
  const [meta, setMeta] = useState<FudaMeta | null>(null);
  const [savedRun, setSavedRun] = useState<RunState | null>(null);
  const [soundOn, setSoundOn] = useState(true);
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

  // 初期レベル・音設定・途中セーブは localStorage 由来のためマウント後に反映する
  useEffect(() => {
    const save = getFudaSave();
    setSoundEnabled(save.meta.soundEnabled);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLevel(detectInitialLevel());
    setSoundOn(save.meta.soundEnabled);
  }, []);

  // メニューに戻るたびに「続きから」とメタ進行を読み直す
  useEffect(() => {
    if (phase !== "menu") return;
    const save = getFudaSave();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedRun(deserializeRun(save.currentRun));
    setMeta(save.meta);
  }, [phase]);

  // 単語範囲を変えたとき、その範囲で組めない流派は基本に戻す
  useEffect(() => {
    if (!canUseSchool(schoolId, wordPool)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSchoolId("kata");
    }
  }, [schoolId, wordPool]);

  const startRun = useCallback(() => {
    if (wordPool.length < MIN_POOL_SIZE) return;
    ensureAudio();
    game.startRun({ lessonLevel: level, wordPool, stake, schoolId });
  }, [game, level, wordPool, stake, schoolId]);

  const continueRun = useCallback(() => {
    if (!savedRun) return;
    ensureAudio();
    game.restoreRun(savedRun);
  }, [game, savedRun]);

  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible((prev) => {
      const next = !prev;
      updateSettings({ showKeyboard: next });
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      updateFudaSave((save) => ({
        ...save,
        meta: { ...save.meta, soundEnabled: next },
      }));
      return next;
    });
  }, []);

  // 画面遷移の効果音（roundResult の勝敗・クリア・敗北・ショップ入場）
  const roundWon =
    state.round !== null && state.round.scored >= state.round.quota;
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === phase) return;
    if (phase === "roundResult") {
      if (roundWon) playRoundWin();
      else playFail();
    } else if (phase === "runClear") {
      playRoundWin();
    } else if (phase === "runFail") {
      playFail();
    } else if (phase === "shop") {
      playMoney();
    }
  }, [phase, roundWon]);

  const handleKeyDown = useCallback(
    (event: { key: string; code: string }) => {
      ensureAudio();
      switch (phase) {
        case "menu":
          if (event.key === " " || event.key === "Enter") {
            if (savedRun) continueRun();
            else startRun();
          }
          return;

        case "roundIntro":
          if (event.key === " " || event.key === "Enter") game.beginRound();
          if (event.key === "Escape") game.backToMenu(); // チェックポイント済みで安全
          return;

        case "round": {
          if (event.key === "Escape") {
            if (state.round?.active) {
              game.abortWord();
            } else if (
              window.confirm(
                "この勝負を中断してメニューに戻りますか？（勝負開始時点から再開できます）"
              )
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

        case "shop":
          if (event.key === "Enter") game.leaveShop();
          if (event.key === "Escape") game.backToMenu(); // 購入状況ごと保存済み
          return;

        case "runClear":
        case "runFail":
          if (event.key === "Enter") startRun();
          if (event.key === "Escape") game.backToMenu();
          return;
      }
    },
    [phase, state.round?.active, isPhysical, game, savedRun, continueRun, startRun]
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

  const showHud =
    phase === "roundIntro" ||
    phase === "round" ||
    phase === "roundResult" ||
    phase === "shop";

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
          wordPool={wordPool}
          stake={stake}
          onStakeChange={setStake}
          schoolId={schoolId}
          onSchoolChange={setSchoolId}
          meta={meta}
          savedRun={savedRun}
          onStart={startRun}
          onContinue={continueRun}
        />
      )}

      {showHud && (
        <div className="space-y-2">
          <FudaHud run={state} />
          {state.charms.length > 0 && phase !== "shop" && (
            <CharmShelf run={state} />
          )}
        </div>
      )}

      {phase === "roundIntro" && (
        <RoundIntro run={state} onBegin={game.beginRound} />
      )}

      {phase === "round" && (
        <>
          <RoundBoard run={state} />
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={toggleSound}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {soundOn ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              効果音
            </button>
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

      {phase === "shop" && (
        <ShopScreen
          run={state}
          onBuyCharm={game.buyCharm}
          onBuyOfuda={game.buyOfuda}
          onBuyScroll={game.buyScroll}
          onBuyPack={game.buyPack}
          onPickPackWord={game.pickPackWord}
          onSellCharm={game.sellCharm}
          onReroll={game.rerollShop}
          onRemoveWord={game.removeDeckWord}
          onCopyWord={game.copyDeckWord}
          onUseOfuda={game.useOfuda}
          onLeave={game.leaveShop}
        />
      )}

      {(phase === "runClear" || phase === "runFail") && (
        <RunResult
          run={state}
          newUnlocks={game.newUnlocks}
          onRetry={startRun}
          onBackToMenu={game.backToMenu}
        />
      )}
    </div>
  );
}
