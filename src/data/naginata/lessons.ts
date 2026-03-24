import type { Lesson } from "@/types/lesson";

/**
 * 薙刀式 公式マニュアル v16 快速版準拠のレッスン定義
 *
 * 各レッスンは段階的に新しいかなを導入し、
 * 前のレッスンで学んだかなを含む練習テキストで定着を図る。
 */
export const naginataLessons: Lesson[] = [
  {
    id: "naginata-01",
    layoutId: "naginata",
    title: "右手ホームポジション",
    description: "あ・い・う の基本入力。右手の人差し指・中指・薬指の位置を覚える。",
    targetKana: ["あ", "い", "う"],
    prerequisites: [],
    exercises: [
      {
        id: "naginata-01-01",
        text: "あいう",
        hint: "右手ホームポジション: J=あ, K=い, L=う",
      },
      {
        id: "naginata-01-02",
        text: "あいうあいう",
      },
      {
        id: "naginata-01-03",
        text: "ういあういあ",
      },
      {
        id: "naginata-01-04",
        text: "あいあういうあ",
      },
      {
        id: "naginata-01-05",
        text: "いあういあうい",
      },
    ],
  },
  {
    id: "naginata-02",
    layoutId: "naginata",
    title: "左手ホームポジション",
    description: "と・か・け の入力。左手ホームポジションを覚える。",
    targetKana: ["と", "か", "け"],
    prerequisites: ["naginata-01"],
    exercises: [
      {
        id: "naginata-02-01",
        text: "とかけ",
        hint: "左手ホームポジション: D=と, F=か, S=け",
      },
      {
        id: "naginata-02-02",
        text: "とかけとかけ",
      },
      {
        id: "naginata-02-03",
        text: "かとけかとけ",
      },
      {
        id: "naginata-02-04",
        text: "あかいとうけ",
      },
      {
        id: "naginata-02-05",
        text: "かいとうけあいか",
      },
    ],
  },
  {
    id: "naginata-03",
    layoutId: "naginata",
    title: "上段右手",
    description: "る・す・は の入力。右手上段キーの位置を覚える。",
    targetKana: ["る", "す", "は"],
    prerequisites: ["naginata-02"],
    exercises: [
      {
        id: "naginata-03-01",
        text: "るすは",
        hint: "右手上段: U=る, I=す, O=は",
      },
      {
        id: "naginata-03-02",
        text: "するはするは",
      },
      {
        id: "naginata-03-03",
        text: "はるかすいか",
      },
      {
        id: "naginata-03-04",
        text: "あるいはすると",
      },
      {
        id: "naginata-03-05",
        text: "するとはいかける",
      },
    ],
  },
  {
    id: "naginata-04",
    layoutId: "naginata",
    title: "上段左手",
    description: "き・て・し の入力。左手上段キーの位置を覚える。",
    targetKana: ["き", "て", "し"],
    prerequisites: ["naginata-03"],
    exercises: [
      {
        id: "naginata-04-01",
        text: "きてし",
        hint: "左手上段: W=き, E=て, R=し",
      },
      {
        id: "naginata-04-02",
        text: "してきしてき",
      },
      {
        id: "naginata-04-03",
        text: "しかしきいて",
      },
      {
        id: "naginata-04-04",
        text: "いきてかける",
      },
      {
        id: "naginata-04-05",
        text: "しかしていると",
      },
    ],
  },
  {
    id: "naginata-05",
    layoutId: "naginata",
    title: "下段",
    description: "ほ・ひ・こ・そ・た・な・ん・ら・れ の入力。下段のキーを覚える。",
    targetKana: ["ほ", "ひ", "こ", "そ", "た", "な", "ん", "ら", "れ"],
    prerequisites: ["naginata-04"],
    exercises: [
      {
        id: "naginata-05-01",
        text: "こそたなん",
        hint: "下段: V=こ, B=そ, N=た, M=な, ,(comma)=ん",
      },
      {
        id: "naginata-05-02",
        text: "ほひられ",
        hint: "下段: Z=ほ, X=ひ, .(period)=ら, /(slash)=れ",
      },
      {
        id: "naginata-05-03",
        text: "きたないこと",
      },
      {
        id: "naginata-05-04",
        text: "たしかにそれは",
      },
      {
        id: "naginata-05-05",
        text: "こんなにほしいとは",
      },
    ],
  },
  {
    id: "naginata-06",
    layoutId: "naginata",
    title: "スペースシフト",
    description: "スペースキーとの同時押しで入力するかな。さ・え・お・ゆ・よ 等。",
    targetKana: [
      "さ", "え", "お", "ゆ", "よ", "に", "の", "も", "わ", "つ",
      "せ", "ね", "ぬ", "む", "み", "め", "ろ", "ま", "り", "を",
    ],
    prerequisites: ["naginata-05"],
    exercises: [
      {
        id: "naginata-06-01",
        text: "さえおゆよ",
        hint: "スペース + キーで入力",
      },
      {
        id: "naginata-06-02",
        text: "にのもわつ",
      },
      {
        id: "naginata-06-03",
        text: "おはようさん",
      },
      {
        id: "naginata-06-04",
        text: "それにしても",
      },
      {
        id: "naginata-06-05",
        text: "わたしのなまえは",
      },
    ],
  },
  {
    id: "naginata-07",
    layoutId: "naginata",
    title: "濁音・半濁音",
    description: "同時打鍵による濁音（が・ざ・だ・ば）と半濁音（ぱ）の入力。",
    targetKana: [
      "が", "ぎ", "ぐ", "げ", "ご",
      "ざ", "じ", "ず", "ぜ", "ぞ",
      "だ", "ぢ", "づ", "で", "ど",
      "ば", "び", "ぶ", "べ", "ぼ",
      "ぱ", "ぴ", "ぷ", "ぺ", "ぽ",
    ],
    prerequisites: ["naginata-06"],
    exercises: [
      {
        id: "naginata-07-01",
        text: "がぎぐげご",
        hint: "濁音 = 濁点キー + かな の同時打鍵",
      },
      {
        id: "naginata-07-02",
        text: "ざじずぜぞ",
      },
      {
        id: "naginata-07-03",
        text: "だぢづでど",
      },
      {
        id: "naginata-07-04",
        text: "ばびぶべぼ",
      },
      {
        id: "naginata-07-05",
        text: "ぱぴぷぺぽ",
        hint: "半濁音 = 半濁点キー + かな の同時打鍵",
      },
    ],
  },
  {
    id: "naginata-08",
    layoutId: "naginata",
    title: "総合練習",
    description: "全てのかなを使った実践的なタイピング練習。",
    targetKana: [],
    prerequisites: ["naginata-07"],
    exercises: [
      {
        id: "naginata-08-01",
        text: "きょうはいいてんきです",
      },
      {
        id: "naginata-08-02",
        text: "わたしはにほんごをべんきょうしています",
      },
      {
        id: "naginata-08-03",
        text: "あしたのよていはまだきまっていません",
      },
      {
        id: "naginata-08-04",
        text: "このぷろぐらむはとてもべんりです",
      },
      {
        id: "naginata-08-05",
        text: "たいぴんぐのれんしゅうをがんばりましょう",
      },
    ],
  },
];

/** レッスンIDからレッスンを取得 */
export function getLessonById(id: string): Lesson | undefined {
  return naginataLessons.find((l) => l.id === id);
}

/** レッスン番号（1-8）からレッスンを取得 */
export function getLessonByNumber(num: number): Lesson | undefined {
  return naginataLessons.find((l) => l.id === `naginata-0${num}`);
}
