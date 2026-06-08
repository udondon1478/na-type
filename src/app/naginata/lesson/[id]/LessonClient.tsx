"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLessonByNumber } from "@/data/naginata/lessons";
import { TypingArea } from "@/components/typing/TypingArea";
import { Badge } from "@/components/ui/badge";
import type { SessionResult } from "@/types/stats";

interface LessonClientProps {
  lessonId: string;
}

export function LessonClient({ lessonId }: LessonClientProps) {
  const lessonNum = parseInt(lessonId, 10);
  const lesson = getLessonByNumber(lessonNum);
  const router = useRouter();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  const isLastExercise = lesson
    ? currentExerciseIndex === lesson.exercises.length - 1
    : false;

  const handleComplete = useCallback(
    (result: SessionResult) => {
      setLastResult(result);
    },
    []
  );

  // 完了時のキーボード操作
  useEffect(() => {
    if (!lastResult) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!isLastExercise) {
          setCurrentExerciseIndex((prev) => prev + 1);
          setLastResult(null);
        } else if (lessonNum < 8) {
          router.push(`/naginata/lesson/${lessonNum + 1}`);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lastResult, isLastExercise, lessonNum, router]);

  if (!lesson) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          レッスン {lessonId} は見つかりませんでした。
        </p>
        <Link
          href="/naginata"
          className="text-primary hover:underline text-sm"
        >
          レッスン一覧に戻る
        </Link>
      </div>
    );
  }

  const currentExercise = lesson.exercises[currentExerciseIndex];
  const targetText = currentExercise.segments
    ? currentExercise.segments.map((s) => s.reading).join("")
    : currentExercise.text;

  const handleNextExercise = () => {
    if (!isLastExercise) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setLastResult(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/naginata"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← レッスン一覧
        </Link>
        <Link
          href={`/naginata/drill?level=${lessonNum}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          単語ドリル →
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono">
            {lessonNum}
          </Badge>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
        </div>
        <p className="text-muted-foreground text-sm">{lesson.description}</p>
      </div>

      {lesson.targetKana.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {lesson.targetKana.map((k) => (
            <Badge key={k} variant="secondary" className="text-base px-2 py-0.5">
              {k}
            </Badge>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        練習 {currentExerciseIndex + 1} / {lesson.exercises.length}
      </div>

      {currentExercise.hint && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          {currentExercise.hint}
        </p>
      )}

      <TypingArea
        key={currentExercise.id}
        lessonId={lesson.id}
        exerciseId={currentExercise.id}
        targetText={targetText}
        displaySegments={currentExercise.segments}
        onComplete={handleComplete}
      />

      {lastResult && !isLastExercise && (
        <button
          onClick={handleNextExercise}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          次の練習へ →
          <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
        </button>
      )}

      {lastResult && isLastExercise && (
        <div className="space-y-3">
          <p className="text-primary font-medium">
            レッスン {lessonNum} 完了！
          </p>
          <div className="flex gap-3">
            <Link
              href="/naginata"
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              レッスン一覧へ
            </Link>
            {lessonNum < 8 && (
              <Link
                href={`/naginata/lesson/${lessonNum + 1}`}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                レッスン {lessonNum + 1} へ →
                <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
