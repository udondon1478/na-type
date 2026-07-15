"use client";

import type { PhysicalKeyInfo } from "@/types/layout";
import { cn } from "@/lib/utils";
import type { NaginataKeyLabel } from "./naginata-labels";

interface KeyProps {
  keyInfo: PhysicalKeyInfo;
  label: string;
  kanaLabel?: NaginataKeyLabel;
  showKanaLayers?: boolean;
  isHighlighted: boolean;
  isPressed: boolean;
  isHomeRow: boolean;
}

export function Key({
  keyInfo,
  label,
  kanaLabel,
  showKanaLayers = false,
  isHighlighted,
  isPressed,
  isHomeRow,
}: KeyProps) {
  const baseClasses =
    "rounded-md border text-center select-none transition-all duration-100";

  let fillClass = "fill-card stroke-border";
  let textClass = "fill-muted-foreground";

  if (isPressed) {
    fillClass = "fill-primary/80 stroke-primary";
    textClass = "fill-primary-foreground";
  } else if (isHighlighted) {
    fillClass = "fill-primary/30 stroke-primary";
    textClass = "fill-foreground";
  }

  return (
    <g className={cn(baseClasses)}>
      <rect
        x={keyInfo.x}
        y={keyInfo.y}
        width={keyInfo.width}
        height={keyInfo.height}
        rx={6}
        className={cn(fillClass, "stroke-1")}
      />
      {showKanaLayers ? (
        <>
          {kanaLabel?.shift && (
            <text
              x={keyInfo.x + keyInfo.width - 7}
              y={keyInfo.y + 9}
              textAnchor="end"
              dominantBaseline="central"
              className={cn(textClass, "font-mono pointer-events-none")}
              fontSize={kanaLabel.shift.length > 1 ? 9 : 10}
            >
              {kanaLabel.shift}
            </text>
          )}
          {kanaLabel?.single ? (
            <text
              x={keyInfo.x + keyInfo.width / 2}
              y={keyInfo.y + keyInfo.height / 2 + 2}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(textClass, "text-sm font-mono pointer-events-none")}
              fontSize={kanaLabel.single.length > 1 ? 12 : 16}
            >
              {kanaLabel.single}
            </text>
          ) : (
            <text
              x={keyInfo.x + keyInfo.width / 2}
              y={keyInfo.y + keyInfo.height / 2 + 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground/35 text-xs font-mono pointer-events-none"
              fontSize={12}
            >
              {label}
            </text>
          )}
        </>
      ) : (
        <text
          x={keyInfo.x + keyInfo.width / 2}
          y={keyInfo.y + keyInfo.height / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn(textClass, "text-sm font-mono pointer-events-none")}
          fontSize={label.length > 1 ? 11 : 14}
        >
          {label}
        </text>
      )}
      {isHomeRow && (
        <circle
          cx={keyInfo.x + keyInfo.width / 2}
          cy={keyInfo.y + keyInfo.height - 8}
          r={2}
          className="fill-muted-foreground/40"
        />
      )}
    </g>
  );
}
