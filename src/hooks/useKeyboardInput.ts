"use client";

import { useEffect, useCallback, useRef } from "react";

export interface KeyEvent {
  /** KeyboardEvent.key（論理キー: Karabiner変換後の文字） */
  key: string;
  /** KeyboardEvent.code（物理キー位置） */
  code: string;
  /** タイムスタンプ */
  timestamp: number;
  /** IME変換中か */
  isComposing: boolean;
}

interface UseKeyboardInputOptions {
  /** キー入力コールバック */
  onKeyDown?: (event: KeyEvent) => void;
  /** IME確定時コールバック */
  onCompositionEnd?: (text: string) => void;
  /** 有効/無効 */
  enabled?: boolean;
}

export function useKeyboardInput({
  onKeyDown,
  onCompositionEnd,
  enabled = true,
}: UseKeyboardInputOptions) {
  const onKeyDownRef = useRef(onKeyDown);
  const onCompositionEndRef = useRef(onCompositionEnd);

  useEffect(() => {
    onKeyDownRef.current = onKeyDown;
  }, [onKeyDown]);

  useEffect(() => {
    onCompositionEndRef.current = onCompositionEnd;
  }, [onCompositionEnd]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // IME変換中のキーイベントは無視（compositionendで処理）
      if (e.isComposing) return;

      // メタキー・Ctrl等のモディファイアキーは無視
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)
      )
        return;

      e.preventDefault();

      onKeyDownRef.current?.({
        key: e.key,
        code: e.code,
        timestamp: performance.now(),
        isComposing: false,
      });
    },
    []
  );

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent) => {
      onCompositionEndRef.current?.(e.data);
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("compositionend", handleCompositionEnd);
    };
  }, [enabled, handleKeyDown, handleCompositionEnd]);
}
