"use client";

import { useState } from "react";
import { Key } from "./Key";
import {
  KEYBOARD_KEYS,
  KEYBOARD_WIDTH,
  KEYBOARD_HEIGHT,
} from "./KeyboardLayout";
import { NAGINATA_KEY_LABELS } from "./naginata-labels";

type LayoutView = "qwerty" | "kana";

interface KeyboardVisualizerProps {
  /** ハイライトすべきKarabinerキーコード */
  highlightKeys?: string[];
  /** 現在押されているキーコード */
  pressedKeys?: string[];
  /** 初期表示モード */
  defaultView?: LayoutView;
}

export function KeyboardVisualizer({
  highlightKeys = [],
  pressedKeys = [],
  defaultView = "kana",
}: KeyboardVisualizerProps) {
  const [view, setView] = useState<LayoutView>(defaultView);

  const highlightSet = new Set(highlightKeys);
  const pressedSet = new Set(pressedKeys);

  // ホームポジションのキー
  const homeRowKeys = new Set(["f", "j", "d", "k"]);

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setView("qwerty")}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            view === "qwerty"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          QWERTY
        </button>
        <button
          onClick={() => setView("kana")}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            view === "kana"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          かな
        </button>
      </div>

      {view === "kana" && (
        <p className="text-[11px] leading-tight text-muted-foreground text-right">
          中央=単打／右上=Space同時（センターシフト）。
          Q・T・Y・U は単打なし、Z・X・/ はシフトなし。
        </p>
      )}

      <svg
        viewBox={`-4 -4 ${KEYBOARD_WIDTH + 8} ${KEYBOARD_HEIGHT + 8}`}
        className="w-full max-w-2xl"
      >
        {KEYBOARD_KEYS.map((keyInfo) => {
          const label =
            keyInfo.karabinerCode === "spacebar" && view === "kana"
              ? "親指シフト"
              : keyInfo.qwertyLabel;
          const kanaLabel =
            view === "kana"
              ? NAGINATA_KEY_LABELS[keyInfo.karabinerCode]
              : undefined;

          return (
            <Key
              key={keyInfo.karabinerCode}
              keyInfo={keyInfo}
              label={label}
              kanaLabel={kanaLabel}
              showKanaLayers={view === "kana"}
              isHighlighted={highlightSet.has(keyInfo.karabinerCode)}
              isPressed={pressedSet.has(keyInfo.karabinerCode)}
              isHomeRow={homeRowKeys.has(keyInfo.karabinerCode)}
            />
          );
        })}
      </svg>
    </div>
  );
}
