"use client";

import Link from "next/link";
import { KotodamaGame } from "@/components/game/KotodamaGame";

export default function GamePage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">言霊ディフェンス</h1>
          <p className="text-muted-foreground text-sm mt-1">
            薙刀式で言霊を撃ち落とすローグライク・タイピングゲーム
          </p>
        </div>
        <Link
          href="/naginata"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          レッスン一覧 →
        </Link>
      </div>

      <KotodamaGame />
    </div>
  );
}
