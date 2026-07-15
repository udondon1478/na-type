import { naginataMappings } from "@/data/naginata/layout";

/**
 * 薙刀式のキー別ラベル（単打面 / センターシフト面）
 *
 * 公式配列図の表記に合わせる:
 *   - 単打（そのまま打つ）        → キーの中央
 *   - センターシフト（Space同時） → キーの右上
 *
 * ラベルは手書きせず、必ず自動生成データ（layout.ts / Karabiner由来）から
 * 導出する。こうすることで実際に入力される結果と配列表が食い違わない。
 */
export interface NaginataKeyLabel {
  /** 単打で出るかな（無ければ undefined。例: Q/T/Y/U は単打なし） */
  single?: string;
  /** Space同時押しで出るかな/記号（無ければ undefined。例: Z/X// はシフトなし） */
  shift?: string;
}

function buildLabels(): Record<string, NaginataKeyLabel> {
  const labels: Record<string, NaginataKeyLabel> = {};

  for (const m of naginataMappings) {
    if (m.inputType === "single" && m.keys.length === 1) {
      const code = m.keys[0];
      (labels[code] ??= {}).single = m.kana;
    } else if (m.inputType === "shifted") {
      const keys = m.keys.filter((k) => k !== "spacebar");
      if (keys.length === 1) {
        (labels[keys[0]] ??= {}).shift = m.kana;
      }
    }
  }

  return labels;
}

/** Karabinerキーコード → 単打/シフトのかなラベル */
export const NAGINATA_KEY_LABELS: Record<string, NaginataKeyLabel> =
  buildLabels();
