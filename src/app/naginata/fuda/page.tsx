"use client";

import Link from "next/link";
import { FudaGame } from "@/components/fuda/FudaGame";

export default function FudaPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">言霊札</h1>
          <p className="text-muted-foreground text-sm mt-1">
            属性と役でスコアを爆発させるローグライク・タイピング札遊び
          </p>
        </div>
        <Link
          href="/naginata"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          レッスン一覧 →
        </Link>
      </div>

      <FudaGame />
    </div>
  );
}
