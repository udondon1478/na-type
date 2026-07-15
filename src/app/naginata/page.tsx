import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { naginataLessons } from "@/data/naginata/lessons";

export default function NaginataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">薙刀式レッスン</h1>
        <p className="text-muted-foreground mt-1">
          公式マニュアル準拠のレッスンで段階的に学習
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/naginata/drill">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base">単語ドリル</CardTitle>
              <CardDescription>
                習得済みのかなで構成された単語をひたすら入力して定着を図る
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/naginata/game">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">言霊ディフェンス</CardTitle>
                <Badge variant="secondary">ゲーム</Badge>
              </div>
              <CardDescription>
                降ってくる言霊を打ち落とすローグライク。ウェーブごとに強化を選んで生き延びろ
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/naginata/fuda">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">言霊札</CardTitle>
                <Badge variant="secondary">ゲーム</Badge>
              </div>
              <CardDescription>
                属性と役とお守りのビルドでノルマを越える、Balatro型スコアアタック
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {naginataLessons.map((lesson, i) => {
          const lessonNum = i + 1;
          return (
            <Link key={lesson.id} href={`/naginata/lesson/${lessonNum}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {lessonNum}
                    </Badge>
                    <CardTitle className="text-base">
                      {lesson.title}
                    </CardTitle>
                  </div>
                  <CardDescription>{lesson.description}</CardDescription>
                  {lesson.targetKana.length > 0 && (
                    <div className="flex gap-1 flex-wrap pt-1">
                      {lesson.targetKana.map((k) => (
                        <Badge
                          key={k}
                          variant="secondary"
                          className="text-xs"
                        >
                          {k}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
