"use client";

import { useState, useCallback } from "react";
import { TypingArea } from "@/components/typing/TypingArea";
import type { SessionResult } from "@/types/stats";

const SAMPLE_TEXTS = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "the five boxing wizards jump quickly",
  "sphinx of black quartz judge my vow",
  "two driven jocks help fax my big quiz",
  "programming is the art of telling another human what one wants the computer to do",
  "any fool can write code that a computer can understand",
  "first solve the problem then write the code",
  "code is like humor when you have to explain it it is bad",
];

export default function ArensitoPage() {
  const [textIndex, setTextIndex] = useState(0);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  const handleComplete = useCallback((result: SessionResult) => {
    setLastResult(result);
  }, []);

  const handleNext = () => {
    setTextIndex((prev) => (prev + 1) % SAMPLE_TEXTS.length);
    setLastResult(null);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Arensito フリータイピング</h1>
        <p className="text-muted-foreground text-sm mt-1">
          英語テキストを使ったフリータイピング練習。Arensito配列が有効な状態で入力してください。
        </p>
      </div>

      <TypingArea
        key={`arensito-${textIndex}`}
        lessonId="arensito-free"
        exerciseId={`arensito-free-${textIndex}`}
        targetText={SAMPLE_TEXTS[textIndex]}
        onComplete={handleComplete}
        showKeyboard={false}
      />

      {lastResult && (
        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          次のテキスト →
        </button>
      )}
    </div>
  );
}
