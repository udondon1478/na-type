import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const lessons = [
  {
    id: 1,
    title: "右手ホームポジション",
    description: "あ・い・う の基本入力を学ぶ",
    kana: ["あ", "い", "う"],
  },
  {
    id: 2,
    title: "左手ホームポジション",
    description: "と・か・け の基本入力を学ぶ",
    kana: ["と", "か", "け"],
  },
  {
    id: 3,
    title: "上段右手",
    description: "る・す・は の入力を学ぶ",
    kana: ["る", "す", "は"],
  },
  {
    id: 4,
    title: "上段左手",
    description: "き・て・し の入力を学ぶ",
    kana: ["き", "て", "し"],
  },
  {
    id: 5,
    title: "下段",
    description: "ほ・ひ・こ・そ・た・な・ん・ら・れ の入力を学ぶ",
    kana: ["ほ", "ひ", "こ", "そ", "た", "な", "ん", "ら", "れ"],
  },
  {
    id: 6,
    title: "スペースシフト",
    description: "さ・え・お・ゆ・よ 等のスペースシフト入力を学ぶ",
    kana: ["さ", "え", "お", "ゆ", "よ"],
  },
  {
    id: 7,
    title: "濁音・半濁音",
    description: "が・ざ・だ・ば・ぱ 等の濁音・半濁音を学ぶ",
    kana: ["が", "ざ", "だ", "ば", "ぱ"],
  },
  {
    id: 8,
    title: "総合練習",
    description: "全てのかなを使った総合的なタイピング練習",
    kana: [],
  },
] as const;

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
        {lessons.map((lesson) => (
          <Link key={lesson.id} href={`/naginata/lesson/${lesson.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {lesson.id}
                  </Badge>
                  <CardTitle className="text-base">{lesson.title}</CardTitle>
                </div>
                <CardDescription>{lesson.description}</CardDescription>
                {lesson.kana.length > 0 && (
                  <div className="flex gap-1 flex-wrap pt-1">
                    {lesson.kana.map((k) => (
                      <Badge key={k} variant="secondary" className="text-xs">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
