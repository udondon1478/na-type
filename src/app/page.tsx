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

export default function Dashboard() {
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

      <div className="grid gap-6 md:grid-cols-2">
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
      </div>
    </div>
  );
}
