"use client";

import { useEffect, useCallback, useRef } from "react";

/** Windows IME で e.key === "Process" の場合に e.code から文字を導出するマッピング */
const EVENT_CODE_TO_CHAR: Record<string, string> = {
  KeyA: "a", KeyB: "b", KeyC: "c", KeyD: "d", KeyE: "e",
  KeyF: "f", KeyG: "g", KeyH: "h", KeyI: "i", KeyJ: "j",
  KeyK: "k", KeyL: "l", KeyM: "m", KeyN: "n", KeyO: "o",
  KeyP: "p", KeyQ: "q", KeyR: "r", KeyS: "s", KeyT: "t",
  KeyU: "u", KeyV: "v", KeyW: "w", KeyX: "x", KeyY: "y",
  KeyZ: "z",
  Digit0: "0", Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4",
  Digit5: "5", Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9",
  Space: " ", Semicolon: ";", Comma: ",", Period: ".", Slash: "/",
  Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
  Backslash: "\\", Quote: "'", Backquote: "`",
};

export interface KeyEvent {
  /** KeyboardEvent.key（論理キー: Karabiner変換後の文字） */
  key: string;
  /** KeyboardEvent.code（物理キー位置） */
  code: string;
  /** タイムスタンプ */
  timestamp: number;
  /** IME変換中か */
  isComposing: boolean;
  /** Windows IME: e.key が "Process" だったため e.code から解決した */
  wasProcessKey?: boolean;
}

interface UseKeyboardInputOptions {
  /** キー入力コールバック */
  onKeyDown?: (event: KeyEvent) => void;
  /** キー解放コールバック（physicalモードの同時打鍵確定に使用） */
  onKeyUp?: (code: string) => void;
  /** IME確定時コールバック */
  onCompositionEnd?: (text: string) => void;
  /** 有効/無効 */
  enabled?: boolean;
}

export function useKeyboardInput({
  onKeyDown,
  onKeyUp,
  onCompositionEnd,
  enabled = true,
}: UseKeyboardInputOptions) {
  const onKeyDownRef = useRef(onKeyDown);
  const onKeyUpRef = useRef(onKeyUp);
  const onCompositionEndRef = useRef(onCompositionEnd);

  // IME composition状態の手動追跡
  // JIS配列ではcompositionstart/endが発火するため、その間のkeydownを抑制する
  const isComposingRef = useRef(false);

  useEffect(() => {
    onKeyDownRef.current = onKeyDown;
  }, [onKeyDown]);

  useEffect(() => {
    onKeyUpRef.current = onKeyUp;
  }, [onKeyUp]);

  useEffect(() => {
    onCompositionEndRef.current = onCompositionEnd;
  }, [onCompositionEnd]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // IME変換中のキーイベントは無視（compositionendで処理）
      if (e.isComposing || isComposingRef.current) return;

      // メタキー・Ctrl等のモディファイアキーは無視
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)
      )
        return;

      // Windows IME: e.key === "Process" の場合、e.code から文字を導出
      let key = e.key;
      let wasProcessKey = false;
      if (key === "Process") {
        const resolved = EVENT_CODE_TO_CHAR[e.code];
        if (!resolved) return;
        key = resolved;
        wasProcessKey = true;
      }

      e.preventDefault();

      onKeyDownRef.current?.({
        key,
        code: e.code,
        timestamp: performance.now(),
        isComposing: false,
        wasProcessKey,
      });
    },
    []
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // 同時打鍵の確定は押下中の全キーが解放された時点で行う。
    // モディファイア単体の解放は無視（Shift/Ctrl等）。
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
    onKeyUpRef.current?.(e.code);
  }, []);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent) => {
      isComposingRef.current = false;

      if (!e.data) return;

      onCompositionEndRef.current?.(e.data);

      // 隠しテキストエリアのテキスト蓄積を防止
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    []
  );

  // 隠しテキストエリアからフォーカスが外れた時、インタラクティブ要素でなければ再フォーカス
  const handleBlur = useCallback(() => {
    if (!enabled) return;
    setTimeout(() => {
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "SELECT") {
        return;
      }
      inputRef.current?.focus();
    }, 10);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const el = inputRef.current;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    if (el) {
      // 隠しテキストエリアがある場合、そこでcompositionイベントをキャプチャ
      // IMEはフォーカスされた編集可能要素がないとcompositionイベントを発火しない
      el.addEventListener("compositionstart", handleCompositionStart);
      el.addEventListener("compositionend", handleCompositionEnd);
      el.addEventListener("blur", handleBlur);
      el.focus();
    } else {
      document.addEventListener("compositionstart", handleCompositionStart);
      document.addEventListener("compositionend", handleCompositionEnd);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      if (el) {
        el.removeEventListener("compositionstart", handleCompositionStart);
        el.removeEventListener("compositionend", handleCompositionEnd);
        el.removeEventListener("blur", handleBlur);
      } else {
        document.removeEventListener("compositionstart", handleCompositionStart);
        document.removeEventListener("compositionend", handleCompositionEnd);
      }
    };
  }, [enabled, handleKeyDown, handleKeyUp, handleCompositionStart, handleCompositionEnd, handleBlur]);

  return { inputRef };
}
