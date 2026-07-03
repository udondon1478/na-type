"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/storage";
import type { InputMethod } from "@/types/stats";

interface InputMethodOption {
  value: InputMethod;
  label: string;
  description: string;
}

const OPTIONS: InputMethodOption[] = [
  {
    value: "karabiner",
    label: "Karabiner-Elements を使用中（macOS）",
    description:
      "Karabinerで薙刀式配列を構築済み。かな文字が直接入力される。",
  },
  {
    value: "remapping",
    label: "リマッピングツールを使用中（Windows / Linux）",
    description:
      "DvorakJ・AutoHotKey等で薙刀式配列を構築済み。",
  },
  {
    value: "physical",
    label: "リマッピングツールなしで練習（IME必ずオフ）",
    description:
      "変換ツール未導入でも、物理キーの位置で薙刀式を判定（例: Jキー→あ）。現時点は単独打鍵のかなのみ対応。同時打鍵（濁点・シフト等）は今後対応予定。",
  },
];

interface InputMethodSetupProps {
  onComplete: () => void;
}

export function InputMethodSetup({ onComplete }: InputMethodSetupProps) {
  const [selected, setSelected] = useState<InputMethod | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    updateSettings({ inputMethod: selected });
    onComplete();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">入力方式の設定</CardTitle>
          <CardDescription>
            お使いの環境に合った入力方式を選択してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                selected === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {option.description}
              </div>
            </button>
          ))}

          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full mt-2"
          >
            設定を保存して開始
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            この設定はいつでも変更できます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
