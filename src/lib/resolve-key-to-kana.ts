import { naginataMappings } from "@/data/naginata/layout";
import { KARABINER_TO_EVENT_CODE } from "@/components/keyboard/KeyboardLayout";

/**
 * KeyboardEvent.code → かな の逆引きマップ（single入力のみ）
 * 例: "KeyJ" → "あ", "KeyK" → "い"
 */
const eventCodeToKana = new Map<string, string>();

for (const mapping of naginataMappings) {
  if (mapping.inputType === "single" && mapping.keys.length === 1) {
    const eventCode = KARABINER_TO_EVENT_CODE[mapping.keys[0]];
    if (eventCode) {
      eventCodeToKana.set(eventCode, mapping.kana);
    }
  }
}

/** 物理キーコード（event.code）から薙刀式のかなを解決する */
export function resolveKeyToKana(eventCode: string): string | null {
  return eventCodeToKana.get(eventCode) ?? null;
}
