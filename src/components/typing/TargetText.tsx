"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ExerciseSegment } from "@/types/lesson";

interface CharResult {
  char: string;
  correct: boolean;
  inputChar: string;
}

interface TargetTextProps {
  text: string;
  currentPosition: number;
  results: CharResult[];
  displaySegments?: ExerciseSegment[];
}

export function TargetText({
  text,
  currentPosition,
  results,
  displaySegments,
}: TargetTextProps) {
  if (displaySegments) {
    return (
      <SegmentedText
        segments={displaySegments}
        currentPosition={currentPosition}
        results={results}
      />
    );
  }

  return (
    <div className="font-mono text-2xl tracking-widest leading-relaxed select-none">
      {text.split("").map((char, i) => {
        const result = results[i];
        const isCurrent = i === currentPosition;

        let className = "transition-colors duration-100 ";

        if (result) {
          className += result.correct
            ? "text-primary"
            : "text-destructive underline underline-offset-4";
        } else if (isCurrent) {
          className += "text-foreground bg-primary/20 rounded-sm px-0.5";
        } else {
          className += "text-muted-foreground/50";
        }

        return (
          <span key={i} className={cn(className)}>
            {char}
          </span>
        );
      })}
    </div>
  );
}

interface SegmentedTextProps {
  segments: ExerciseSegment[];
  currentPosition: number;
  results: CharResult[];
}

function SegmentedText({
  segments,
  currentPosition,
  results,
}: SegmentedTextProps) {
  const segmentPositions = useMemo(() => {
    const positions: { start: number; end: number }[] = [];
    for (const seg of segments) {
      const start = positions.length > 0 ? positions[positions.length - 1].end : 0;
      positions.push({ start, end: start + seg.reading.length });
    }
    return positions;
  }, [segments]);

  return (
    <div className="font-mono text-2xl tracking-widest leading-relaxed select-none">
      {segments.map((seg, segIdx) => {
        const { start, end } = segmentPositions[segIdx];

        // セグメント内の結果を集計
        const segResults = results.slice(start, end);
        const isCompleted = segResults.length === seg.reading.length;
        const hasError = segResults.some((r) => !r.correct);
        const isCurrent =
          currentPosition >= start && currentPosition < end;
        const isFuture = currentPosition < start;

        let className = "transition-colors duration-100 inline ";

        if (isCompleted) {
          className += hasError
            ? "text-destructive underline underline-offset-4"
            : "text-primary";
        } else if (isCurrent) {
          className += "text-foreground bg-primary/20 rounded-sm px-0.5";
        } else if (isFuture) {
          className += "text-muted-foreground/50";
        } else {
          className += "text-muted-foreground/50";
        }

        const needsRuby = seg.display !== seg.reading;

        return (
          <span key={segIdx} className={cn(className)}>
            {needsRuby ? (
              <ruby>
                {seg.display}
                <rt className="text-xs font-normal opacity-70">
                  {seg.reading}
                </rt>
              </ruby>
            ) : (
              seg.display
            )}
          </span>
        );
      })}
    </div>
  );
}
