import { naginataLessons } from "@/data/naginata/lessons";
import { wordDictionary } from "@/data/naginata/words";

/** 指定レッスン番号までの累積targetKanaを取得 */
export function getAvailableKana(upToLessonNum: number): Set<string> {
  const kana = new Set<string>();
  for (const lesson of naginataLessons) {
    const num = parseInt(lesson.id.replace("naginata-0", ""), 10);
    if (num > upToLessonNum) break;
    for (const k of lesson.targetKana) {
      kana.add(k);
    }
  }
  return kana;
}

/** 利用可能なかなだけで構成された単語をフィルタ */
export function filterWords(availableKana: Set<string>): string[] {
  return wordDictionary.filter((word) =>
    [...word].every((char) => availableKana.has(char))
  );
}

/** 配列からランダムにN個選択（Fisher-Yatesシャッフル） */
export function pickRandomWords(words: string[], count: number): string[] {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
