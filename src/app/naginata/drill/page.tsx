"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DrillSession } from "@/components/typing/DrillSession";
import { getAvailableKana, filterWords, pickRandomWords } from "@/lib/word-filter";

const WORDS_PER_SESSION = 10;

function DrillContent() {
  const searchParams = useSearchParams();
  const initialLevel = parseInt(searchParams.get("level") ?? "1", 10);
  const [level, setLevel] = useState(
    Math.min(Math.max(initialLevel, 1), 8)
  );
  const [sessionKey, setSessionKey] = useState(0);

  const availableKana = useMemo(() => getAvailableKana(level), [level]);
  const wordPool = useMemo(() => filterWords(availableKana), [availableKana]);

  const sessionWords = useMemo(
    () => pickRandomWords(wordPool, Math.min(WORDS_PER_SESSION, wordPool.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wordPool, sessionKey]
  );

  const handleNewSession = useCallback(() => {
    setSessionKey((prev) => prev + 1);
  }, []);

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    setSessionKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">単語ドリル</h1>
          <p className="text-muted-foreground text-sm mt-1">
            習得済みのかなで構成された単語をひたすら入力
          </p>
        </div>
        <Link
          href="/naginata"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          レッスン一覧 →
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm text-muted-foreground">範囲:</label>
        <select
          value={level}
          onChange={(e) => handleLevelChange(parseInt(e.target.value, 10))}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              レッスン {n} まで
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {wordPool.length}語の単語プール
        </span>
      </div>

      {sessionWords.length > 0 ? (
        <DrillSession
          key={sessionKey}
          words={sessionWords}
          lessonId={`naginata-drill-${String(level).padStart(2, "0")}`}
          onSessionComplete={handleNewSession}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>この範囲で使える単語がありません。</p>
          <p className="text-sm mt-1">レッスン範囲を広げてみてください。</p>
        </div>
      )}
    </div>
  );
}

export default function DrillPage() {
  return (
    <Suspense>
      <DrillContent />
    </Suspense>
  );
}
