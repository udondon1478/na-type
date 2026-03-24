"use client";

import { cn } from "@/lib/utils";

interface CharResult {
  char: string;
  correct: boolean;
  inputChar: string;
}

interface TargetTextProps {
  text: string;
  currentPosition: number;
  results: CharResult[];
}

export function TargetText({ text, currentPosition, results }: TargetTextProps) {
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
