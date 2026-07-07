"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { useKotodamaGame } from "@/hooks/useKotodamaGame";
import { GameField } from "./GameField";
import { GameHud } from "./GameHud";
import { GameMenu } from "./GameMenu";
import { GameOver } from "./GameOver";
import { UpgradeChoice } from "./UpgradeChoice";
import { KeyboardVisualizer } from "@/components/keyboard/KeyboardVisualizer";
import { getKeysForKana } from "@/lib/kana-to-keys";
import { getAvailableKana, filterWords } from "@/lib/word-filter";
import { getGameRecords, getProgress, getSettings, updateSettings } from "@/lib/storage";
import { Eye, EyeOff } from "lucide-react";
import type { GameRecord } from "@/types/game";

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

export function KotodamaGame() {
  const [level, setLevel] = useState(1);
  const [records, setRecords] = useState<Record<string, GameRecord>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(
    () => getSettings().showKeyboard
  );
  // TypingArea と同じくロジック専用（マークアップには使わないのでハイドレーション安全）
  const inputMethod = useMemo(() => getSettings().inputMethod, []);
  const isPhysical = inputMethod === "physical";

  const game = useKotodamaGame();
  const { phase, paused } = game.snapshot;

  const wordPool = useMemo(
    () => filterWords(getAvailableKana(level)),
    [level]
  );

  // 初期レベルとプレイ記録は localStorage 由来のためマウント後に反映する
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLevel(detectInitialLevel());
  }, []);

  useEffect(() => {
    if (phase !== "menu" && phase !== "gameover") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(getGameRecords());
  }, [phase]);

  const startGame = useCallback(() => {
    if (wordPool.length === 0) return;
    game.startGame(level, wordPool);
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
          if (event.key === " " || event.key === "Enter") startGame();
          return;

        case "playing":
          if (event.key === "Escape") {
            game.togglePause();
            return;
          }
          if (paused) return;
          if (isPhysical) {
            game.handleChordKeyDown(event.code);
            return;
          }
          if (event.key.length === 1) {
            game.handleKanaInput(event.key, event.code);
          }
          return;

        case "upgrade": {
          const index = parseInt(event.key, 10) - 1;
          const option = game.snapshot.upgradeOptions[index];
          if (option) game.pickUpgrade(option);
          return;
        }

        case "gameover":
          if (event.key === "Enter") startGame();
          if (event.key === "Escape") game.backToMenu();
          return;
      }
    },
    [phase, paused, isPhysical, game, startGame]
  );

  const handleKeyUp = useCallback(
    (code: string) => {
      if (phase !== "playing" || !isPhysical) return;
      game.handleChordKeyUp(code);
    },
    [phase, isPhysical, game]
  );

  const handleCompositionEnd = useCallback(
    (text: string) => {
      if (phase !== "playing" || isPhysical) return;
      game.handleKanaInput(text);
    },
    [phase, isPhysical, game]
  );

  const { inputRef } = useKeyboardInput({
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onCompositionEnd: handleCompositionEnd,
  });

  // ロック中の敵の次のかなをキーボードガイドに表示する
  const highlightKeys = useMemo(() => {
    if (phase !== "playing") return [];
    const locked = game.snapshot.enemies.find(
      (e) => e.id === game.snapshot.lockedId
    );
    if (!locked || locked.typed >= locked.word.length) return [];
    return getKeysForKana(locked.word[locked.typed]);
  }, [phase, game.snapshot.enemies, game.snapshot.lockedId]);

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
        <GameMenu
          level={level}
          onLevelChange={setLevel}
          record={records[String(level)]}
          wordPoolSize={wordPool.length}
          onStart={startGame}
        />
      )}

      {(phase === "playing" || phase === "upgrade") && (
        <>
          <GameHud snapshot={game.snapshot} />

          {phase === "playing" ? (
            <GameField
              enemies={game.snapshot.enemies}
              lockedId={game.snapshot.lockedId}
              freezeRemainingMs={game.snapshot.freezeRemainingMs}
              paused={paused}
            />
          ) : (
            <UpgradeChoice
              options={game.snapshot.upgradeOptions}
              stacks={game.snapshot.stacks}
              clearedWave={game.snapshot.wave}
              onPick={game.pickUpgrade}
            />
          )}

          {phase === "playing" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <kbd className="px-1 py-0.5 rounded border border-border">Esc</kbd>{" "}
                  一時停止
                </p>
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
              {keyboardVisible && (
                <KeyboardVisualizer highlightKeys={highlightKeys} />
              )}
            </>
          )}
        </>
      )}

      {phase === "gameover" && (
        <GameOver
          snapshot={game.snapshot}
          onRetry={startGame}
          onBackToMenu={game.backToMenu}
        />
      )}
    </div>
  );
}
