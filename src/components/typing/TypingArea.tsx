"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { useTypingSession } from "@/hooks/useTypingSession";
import { TargetText } from "./TargetText";
import { SessionStats } from "../stats/SessionStats";
import { KeyboardVisualizer } from "../keyboard/KeyboardVisualizer";
import { getKeysForKana } from "@/lib/kana-to-keys";
import { getSettings, updateSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import type { SessionResult } from "@/types/stats";
import type { ExerciseSegment } from "@/types/lesson";

interface TypingAreaProps {
  lessonId: string;
  exerciseId: string;
  targetText: string;
  displaySegments?: ExerciseSegment[];
  onComplete?: (result: SessionResult) => void;
  showKeyboard?: boolean;
}

export function TypingArea({
  lessonId,
  exerciseId,
  targetText,
  displaySegments,
  onComplete,
  showKeyboard = true,
}: TypingAreaProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(() => getSettings().showKeyboard);
  const [showImeWarning, setShowImeWarning] = useState(false);
  const processKeyCountRef = useRef(0);
  const inputMethod = useMemo(() => getSettings().inputMethod, []);

  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible(prev => {
      const next = !prev;
      updateSettings({ showKeyboard: next });
      return next;
    });
  }, []);

  const session = useTypingSession({
    lessonId,
    exerciseId,
    targetText,
    onComplete,
  });

  // physical モードは物理キー位置で薙刀式を判定する。単独打鍵に加え、濁点・シフト・
  // combo 等の同時打鍵を release ベースで確定するため、keydown で蓄積し keyup で判定する。
  const isPhysical = inputMethod === "physical";

  const handleKeyDown = useCallback(
    (event: { key: string; code: string; wasProcessKey?: boolean }) => {
      if (session.status === "completed") return;

      // physical モード: 物理キーを chord に蓄積（key/code の内容には依存しない）
      if (isPhysical) {
        session.processChordKeyDown(event.code);
        return;
      }

      // IME "Process" キー検出 → 連続3回で警告表示
      if (event.wasProcessKey) {
        processKeyCountRef.current += 1;
        if (processKeyCountRef.current >= 3) {
          setShowImeWarning(true);
        }
      } else {
        processKeyCountRef.current = 0;
        if (showImeWarning) setShowImeWarning(false);
      }

      // Backspaceは無視（ミスしても進む方式）
      if (event.key === "Backspace") return;

      // 特殊キーは無視
      if (event.key.length > 1 && event.key !== "Enter") return;

      session.processInput(event.key, event.code);
    },
    [session, showImeWarning, isPhysical]
  );

  const handleKeyUp = useCallback(
    (code: string) => {
      if (!isPhysical || session.status === "completed") return;
      session.processChordKeyUp(code);
    },
    [session, isPhysical]
  );

  const handleCompositionEnd = useCallback(
    (text: string) => {
      if (session.status === "completed") return;
      session.processComposition(text);
    },
    [session]
  );

  const { inputRef } = useKeyboardInput({
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onCompositionEnd: handleCompositionEnd,
    enabled: session.status !== "completed",
  });

  // 完了時のキーボード操作: Enter → もう一度
  useEffect(() => {
    if (session.status !== "completed") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        session.reset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session.status, session.reset]);

  // 現在のかなに対応する物理キーをハイライト
  const highlightKeys = useMemo(() => {
    if (session.currentPosition >= session.targetText.length) return [];
    const currentKana = session.targetText[session.currentPosition];
    return getKeysForKana(currentKana);
  }, [session.currentPosition, session.targetText]);

  return (
    <div className="space-y-6">
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
      {showImeWarning && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
          日本語IMEが有効です。半角英数モード（英数キー）に切り替えてください。
        </div>
      )}

      <p className={cn(
        "text-sm text-muted-foreground",
        session.status === "idle" ? "animate-pulse" : "invisible"
      )}>
        入力を開始すると計測がスタートします
      </p>

      <div className="rounded-lg border border-border bg-card p-6 min-h-[100px] flex items-center justify-center">
        <TargetText
          text={session.targetText}
          currentPosition={session.currentPosition}
          results={session.results}
          displaySegments={displaySegments}
        />
      </div>

      {showKeyboard && session.status !== "completed" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={toggleKeyboard}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {keyboardVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              キーボード
            </button>
          </div>
          {keyboardVisible && <KeyboardVisualizer highlightKeys={highlightKeys} />}
        </>
      )}

      {session.status === "active" && (
        <SessionStats
          correctChars={session.results.filter((r) => r.correct).length}
          totalAttempts={session.results.filter((r) => r.correct).length + session.missCount}
          missCount={session.missCount}
          startTime={session.startTime}
        />
      )}

      {session.status === "completed" && (
        <div className="space-y-4">
          <SessionStats
            correctChars={session.results.filter((r) => r.correct).length}
            totalAttempts={session.results.filter((r) => r.correct).length + session.missCount}
            missCount={session.missCount}
            startTime={session.startTime}
          />
          <button
            onClick={session.reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            もう一度
            <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
