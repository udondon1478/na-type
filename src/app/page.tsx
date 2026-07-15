"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { InputMethodSetup } from "@/components/setup/InputMethodSetup";
import { isSetupCompleted, getSettings, updateSettings } from "@/lib/storage";

const INPUT_METHOD_LABELS: Record<string, string> = {
  karabiner: "Karabiner-Elements",
  remapping: "リマッピングツール",
  physical: "物理キー位置練習",
};

export default function Dashboard() {
  // 初期値false = SSRとクライアント初回レンダリングで一致（ハイドレーションエラー回避）
  const [setupDone, setSetupDone] = useState(false);

  // マウント後にlocalStorageを確認し、設定済みならダッシュボードに切り替え。
  // localStorageはクライアントのみ参照可能なため、SSG初期状態(false)と一致させた上で
  // マウント後に反映する定番のハイドレーション対策。effect内setStateは意図的。
  useEffect(() => {
    if (isSetupCompleted()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSetupDone(true);
    }
  }, []);

  if (!setupDone) {
    return <InputMethodSetup onComplete={() => setSetupDone(true)} />;
  }

  const settings = getSettings();
  const methodLabel = settings.inputMethod
    ? INPUT_METHOD_LABELS[settings.inputMethod] ?? settings.inputMethod
    : "";

  const handleResetSetup = () => {
    updateSettings({ inputMethod: undefined as never });
    setSetupDone(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-wider">
          N.A.Type
        </h1>
        <p className="text-muted-foreground mt-1">
          薙刀式 & Arensito 配列タイピング練習
        </p>
      </div>

      <StatsOverview />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/naginata">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">薙刀式</CardTitle>
                <Badge variant="secondary">日本語かな入力</Badge>
              </div>
              <CardDescription>
                同時打鍵ベースの日本語かな配列。公式マニュアル準拠のレッスン1〜8で段階的に学習。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                レッスンを選択して練習を開始
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/arensito">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Arensito</CardTitle>
                <Badge variant="secondary">英字入力</Badge>
              </div>
              <CardDescription>
                人間工学に最適化された英字配列。フリータイピングで実践練習。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                フリータイピングで練習を開始
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/naginata/game">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">言霊ディフェンス</CardTitle>
                <Badge variant="secondary">ゲーム</Badge>
              </div>
              <CardDescription>
                薙刀式で降ってくる言霊を撃ち落とすローグライク・タイピングゲーム。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                ウェーブごとに強化を選んで生き延びろ
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/naginata/fuda">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">言霊札</CardTitle>
                <Badge variant="secondary">ゲーム</Badge>
              </div>
              <CardDescription>
                かなの属性と役でスコアを爆発させる、Balatro型ローグライク札遊び。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                お守りのビルドで8幕のノルマを越えろ
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>入力方式: {methodLabel}</span>
        <button
          type="button"
          onClick={handleResetSetup}
          className="underline hover:text-foreground transition-colors"
        >
          変更
        </button>
      </div>
    </div>
  );
}
