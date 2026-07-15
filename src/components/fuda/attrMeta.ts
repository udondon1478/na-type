import type { KanaAttr } from "@/types/fuda";

/**
 * かな属性の表示メタ（ラベルと配色）
 *
 * 属性はビルドの軸なので、カードのドット・チップポップ・統計で一貫した色を使う。
 * ダークテーマ前提の Tailwind クラスを直接持つ。
 */
export const ATTR_META: Record<
  KanaAttr,
  { label: string; dot: string; text: string }
> = {
  seion: { label: "清音", dot: "bg-slate-400", text: "text-slate-300" },
  dakuten: { label: "濁点", dot: "bg-sky-400", text: "text-sky-400" },
  handakuten: { label: "半濁点", dot: "bg-violet-400", text: "text-violet-400" },
  kogaki: { label: "小書き", dot: "bg-emerald-400", text: "text-emerald-400" },
  shifted: { label: "シフト", dot: "bg-amber-400", text: "text-amber-400" },
  combo: { label: "チョード", dot: "bg-rose-400", text: "text-rose-400" },
};

export const ATTR_ORDER: KanaAttr[] = [
  "seion",
  "shifted",
  "dakuten",
  "handakuten",
  "kogaki",
  "combo",
];
