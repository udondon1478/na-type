import type { Lesson, ExerciseSegment } from "@/types/lesson";

/**
 * 薙刀式 公式マニュアル v16 快速版準拠のレッスン定義
 *
 * かなの導入順序は公式マニュアルに準拠（頻出度順）。
 * 各レッスンは段階的に新しいかなを導入し、
 * 実在の日本語単語・フレーズで定着を図る。
 */

/** "{漢字|reading}plain" → { text, segments } */
function segmented(
  annotated: string
): { text: string; segments: ExerciseSegment[] } {
  const segments: ExerciseSegment[] = [];
  let text = "";
  let i = 0;
  while (i < annotated.length) {
    if (annotated[i] === "{") {
      const end = annotated.indexOf("}", i);
      const [display, reading] = annotated.slice(i + 1, end).split("|");
      segments.push({ display, reading });
      text += display;
      i = end + 1;
    } else {
      segments.push({ display: annotated[i], reading: annotated[i] });
      text += annotated[i];
      i++;
    }
  }
  return { text, segments };
}

export const naginataLessons: Lesson[] = [
  // ─── L1: 「ある」「ない」「する」 ───
  // 新規: あ, い, う, る, す, な
  {
    id: "naginata-01",
    layoutId: "naginata",
    title: "「ある」「ない」「する」",
    description:
      "日本語で最も使う動詞から始める。6つのかなで基本文が作れる。",
    targetKana: ["あ", "い", "う", "る", "す", "な"],
    prerequisites: [],
    exercises: [
      {
        id: "naginata-01-01",
        text: "あいう",
        hint: "キーボードガイドを見ながら、ゆっくり正確に打ちましょう",
      },
      { id: "naginata-01-02", text: "るすな" },
      { id: "naginata-01-03", text: "あいうるすな" },
      { id: "naginata-01-04", text: "ある" },
      { id: "naginata-01-05", text: "ない" },
      { id: "naginata-01-06", text: "する" },
      { id: "naginata-01-07", text: "いる" },
      { id: "naginata-01-08", text: "いない" },
      { id: "naginata-01-09", text: "なる" },
      { id: "naginata-01-10", text: "うなる" },
      { id: "naginata-01-11", text: "すいすい" },
      { id: "naginata-01-12", text: "するな" },
      { id: "naginata-01-13", text: "いるいない" },
      { id: "naginata-01-14", text: "あるないする" },
      { id: "naginata-01-15", text: "ないするいない" },
    ],
  },

  // ─── L2: 助動詞+濁音 ───
  // 新規: か, が, て, で, ず
  // 累積: あいうるすな + かがてでず
  {
    id: "naginata-02",
    layoutId: "naginata",
    title: "助動詞+濁音",
    description:
      "「がある」「である」「です」を学ぶ。濁音の同時打鍵に慣れる。",
    targetKana: ["か", "が", "て", "で", "ず"],
    prerequisites: ["naginata-01"],
    exercises: [
      {
        id: "naginata-02-01",
        text: "かてで",
        hint: "新しいかなのキー位置を確認しましょう",
      },
      {
        id: "naginata-02-02",
        text: "がず",
        hint: "濁音 = 濁点キー(F) + かな の同時打鍵",
      },
      { id: "naginata-02-03", text: "かがてでず" },
      { id: "naginata-02-04", text: "です" },
      { id: "naginata-02-05", text: "がある" },
      { id: "naginata-02-06", text: "である" },
      { id: "naginata-02-07", text: "すてる" },
      { id: "naginata-02-08", text: "かてる" },
      { id: "naginata-02-09", text: "でかい" },
      { id: "naginata-02-10", text: "ずるい" },
      { id: "naginata-02-11", text: "かるい" },
      { id: "naginata-02-12", text: "でないがある" },
      { id: "naginata-02-13", text: "ずるいがかてる" },
      { id: "naginata-02-14", text: "ないでいる" },
      { id: "naginata-02-15", text: "するがいいである" },
    ],
  },

  // ─── L3: 左右の心臓部 ───
  // 新規: こ, と, し, ご, ど, じ, た, だ, ん
  // 累積: あいうるすなかがてでず + ことしごどじただん
  {
    id: "naginata-03",
    layoutId: "naginata",
    title: "左右の心臓部",
    description:
      "「こと」「した」「どう」など頻出語を一気に習得。文らしい文が作れるようになる。",
    targetKana: ["こ", "と", "し", "ご", "ど", "じ", "た", "だ", "ん"],
    prerequisites: ["naginata-02"],
    exercises: [
      {
        id: "naginata-03-01",
        text: "ことし",
        hint: "9つの新しいかなを覚えます。キーボードガイドを活用しましょう",
      },
      { id: "naginata-03-02", text: "じだいごと" },
      { id: "naginata-03-03", text: "こんどのしごと" },
      { id: "naginata-03-04", text: "こと" },
      { id: "naginata-03-05", text: "しごと" },
      { id: "naginata-03-06", text: "じかん" },
      { id: "naginata-03-07", text: "しかし" },
      { id: "naginata-03-08", text: "こんど" },
      { id: "naginata-03-09", text: "ただし" },
      { id: "naginata-03-10", text: "かんたん" },
      { id: "naginata-03-11", text: "ことがある" },
      { id: "naginata-03-12", text: "したことがない" },
      { id: "naginata-03-13", text: "どうするかだ" },
      { id: "naginata-03-14", text: "しんじるしかない" },
      { id: "naginata-03-15", text: "こんなことがある" },
      { id: "naginata-03-16", text: "なんとかするしかない" },
      { id: "naginata-03-17", text: "じかんがないとする" },
    ],
  },

  // ─── L4: センターシフト ───
  // 新規: に, ま, れ, そ, お, も, の
  // 累積: ...+ にまれそおもの
  {
    id: "naginata-04",
    layoutId: "naginata",
    title: "センターシフト",
    description:
      "スペースキー同時押しのかなを習得。「もの」「これ」「それ」が使えるように。",
    targetKana: ["に", "ま", "れ", "そ", "お", "も", "の"],
    prerequisites: ["naginata-03"],
    exercises: [
      {
        id: "naginata-04-01",
        text: "にまれ",
        hint: "センターシフト = スペースキー + かな の同時打鍵",
      },
      { id: "naginata-04-02", text: "そおもの" },
      { id: "naginata-04-03", text: "にまれそおもの" },
      { id: "naginata-04-04", text: "もの" },
      { id: "naginata-04-05", text: "これ" },
      { id: "naginata-04-06", text: "それ" },
      { id: "naginata-04-07", text: "おもう" },
      { id: "naginata-04-08", text: "まだ" },
      { id: "naginata-04-09", text: "この" },
      { id: "naginata-04-10", text: "なにも" },
      { id: "naginata-04-11", text: "ものがある" },
      { id: "naginata-04-12", text: "これにする" },
      { id: "naginata-04-13", text: "おもうことがある" },
      { id: "naginata-04-14", text: "それまでにする" },
      { id: "naginata-04-15", text: "なにもないのだ" },
      { id: "naginata-04-16", text: "どれにするかまだ" },
      { id: "naginata-04-17", text: "それにしてもこのこと" },
    ],
  },

  // ─── L5: 促音+句読点 ───
  // 新規: っ, く, わ, は, ら, 、, 。
  // 累積: ...+ っくわはら、。
  {
    id: "naginata-05",
    layoutId: "naginata",
    title: "促音+句読点",
    description:
      "「あった」「わたし」「だから」。促音（っ）と句読点で自然な日本語に近づく。",
    targetKana: ["っ", "く", "わ", "は", "ら", "、", "。"],
    prerequisites: ["naginata-04"],
    exercises: [
      {
        id: "naginata-05-01",
        text: "っくわ",
        hint: "促音（っ）は小さい「つ」。次の子音を強調する音です",
      },
      {
        id: "naginata-05-02",
        text: "はら",
        hint: "句読点も練習しましょう。「、」は読点、「。」は句点",
      },
      { id: "naginata-05-03", text: "あった" },
      { id: "naginata-05-04", text: "だった" },
      { id: "naginata-05-05", text: "わたし" },
      { id: "naginata-05-06", text: "くる" },
      { id: "naginata-05-07", text: "だから" },
      { id: "naginata-05-08", text: "それから" },
      { id: "naginata-05-09", text: "くわしい" },
      { id: "naginata-05-10", text: "わくわくする" },
      { id: "naginata-05-11", text: "わたしはここにいる" },
      { id: "naginata-05-12", text: "それからどうする。" },
      { id: "naginata-05-13", text: "あったことがない。" },
      { id: "naginata-05-14", text: "くわしくはない。" },
      { id: "naginata-05-15", text: "だからこそ、ものがある。" },
      {
        id: "naginata-05-16",
        ...segmented("{思|おも}ったことがある。"),
      },
      {
        id: "naginata-05-17",
        ...segmented("わたしはそう{思|おも}った。"),
      },
    ],
  },

  // ─── L6: 拗音+半濁音+小書き ───
  // 新規: き, ぎ, み, を, よ, ゆ, や, ー, ゃ, ゅ, ょ, ば, ぱ
  // 累積: ...+ きぎみをよゆやーゃゅょばぱ
  {
    id: "naginata-06",
    layoutId: "naginata",
    title: "拗音+半濁音+小書き",
    description:
      "拗音（しょ・きょ等）と半濁音（ぱ行）、長音（ー）を学ぶ。表現の幅が大きく広がる。",
    targetKana: [
      "き", "ぎ", "み", "を", "よ", "ゆ", "や",
      "ー", "ゃ", "ゅ", "ょ", "ば", "ぱ",
    ],
    prerequisites: ["naginata-05"],
    exercises: [
      {
        id: "naginata-06-01",
        text: "きみよゆや",
        hint: "新しいかなのキー位置を確認しましょう",
      },
      {
        id: "naginata-06-02",
        text: "ゃゅょー",
        hint: "拗音 = 小書きキー + かな の同時打鍵。ー は長音記号",
      },
      {
        id: "naginata-06-03",
        text: "ばぱ",
        hint: "半濁音 = 半濁点キー + かな の同時打鍵",
      },
      { id: "naginata-06-04", text: "きょう" },
      { id: "naginata-06-05", text: "ようやく" },
      { id: "naginata-06-06", text: "しょうがない" },
      { id: "naginata-06-07", text: "できる" },
      { id: "naginata-06-08", text: "できない" },
      { id: "naginata-06-09", text: "よゆう" },
      { id: "naginata-06-10", text: "ないよう" },
      { id: "naginata-06-11", text: "きみがいない" },
      { id: "naginata-06-12", text: "できることがある。" },
      { id: "naginata-06-13", text: "しょうがないのだ。" },
      { id: "naginata-06-14", text: "このようにするしかない。" },
      {
        id: "naginata-06-15",
        ...segmented("{今日|きょう}からやっていく。"),
      },
      {
        id: "naginata-06-16",
        ...segmented("{内容|ないよう}がないのは、しょうがない。"),
      },
      {
        id: "naginata-06-17",
        ...segmented("{余裕|よゆう}を{持|も}っていこう。"),
      },
    ],
  },

  // ─── L7: 残りの清音+外来音 ───
  // 新規: り, ひ, ち, ほ, ふ, け, つ, え
  //   + 濁音/半濁音派生: び, ぴ, ぢ, ぶ, ぷ, げ, づ, ぼ, ぽ, ぐ
  // 累積: ほぼ全かな（L8の へろせめむぬさね 以外）
  {
    id: "naginata-07",
    layoutId: "naginata",
    title: "残りの清音+外来音",
    description:
      "り・ひ・ち・ほ・ふ・け・つ・え を学ぶ。使えるかなが一気に増える。",
    targetKana: [
      "り", "ひ", "ち", "ほ", "ふ", "け", "つ", "え",
      "び", "ぴ", "ぢ", "ぶ", "ぷ", "げ", "づ", "ぼ", "ぽ", "ぐ",
    ],
    prerequisites: ["naginata-06"],
    exercises: [
      {
        id: "naginata-07-01",
        text: "りひち",
        hint: "8つの清音を覚えます。濁音・半濁音の派生も使えるようになります",
      },
      { id: "naginata-07-02", text: "ほふけ" },
      { id: "naginata-07-03", text: "つえ" },
      { id: "naginata-07-04", text: "あります" },
      { id: "naginata-07-05", text: "いける" },
      { id: "naginata-07-06", text: "ちかい" },
      { id: "naginata-07-07", text: "ひとつ" },
      {
        id: "naginata-07-08",
        ...segmented("{方法|ほうほう}"),
      },
      {
        id: "naginata-07-09",
        ...segmented("{使|つか}う"),
      },
      {
        id: "naginata-07-10",
        ...segmented("{引|ひ}く"),
      },
      {
        id: "naginata-07-11",
        ...segmented("{続|つづ}ける"),
      },
      {
        id: "naginata-07-12",
        ...segmented("{帰|かえ}る"),
      },
      {
        id: "naginata-07-13",
        ...segmented("{文章|ぶんしょう}を{書|か}く。"),
      },
      {
        id: "naginata-07-14",
        ...segmented("{近|ちか}くにあります。"),
      },
      {
        id: "naginata-07-15",
        ...segmented("{方法|ほうほう}はひとつではない。"),
      },
      {
        id: "naginata-07-16",
        ...segmented("いつも{使|つか}っている。"),
      },
      {
        id: "naginata-07-17",
        ...segmented("{続|つづ}けることが{大事|だいじ}だ。"),
      },
    ],
  },

  // ─── L8: 最後の8文字 ───
  // 新規: へ, ろ, せ, め, む, ぬ, さ, ね
  //   + 濁音/半濁音派生: ぜ, ぞ, べ, ぺ
  // これで全かな完了
  {
    id: "naginata-08",
    layoutId: "naginata",
    title: "最後の8文字",
    description:
      "へ・ろ・せ・め・む・ぬ・さ・ね で全かな完了。総合的な文章を打てるようになる。",
    targetKana: [
      "へ", "ろ", "せ", "め", "む", "ぬ", "さ", "ね",
      "ざ", "ぜ", "ぞ", "べ", "ぺ",
    ],
    prerequisites: ["naginata-07"],
    exercises: [
      {
        id: "naginata-08-01",
        text: "へろせ",
        hint: "最後の8文字を覚えれば全かな完了です！",
      },
      { id: "naginata-08-02", text: "めむぬ" },
      { id: "naginata-08-03", text: "さね" },
      {
        id: "naginata-08-04",
        ...segmented("どこ{へ|へ}{行|い}く"),
      },
      {
        id: "naginata-08-05",
        ...segmented("{始|はじ}める"),
      },
      {
        id: "naginata-08-06",
        ...segmented("{寒|さむ}い"),
      },
      {
        id: "naginata-08-07",
        ...segmented("{最初|さいしょ}"),
      },
      {
        id: "naginata-08-08",
        ...segmented("{全然|ぜんぜん}"),
      },
      { id: "naginata-08-09", text: "だよね。" },
      { id: "naginata-08-10", text: "むずかしい" },
      {
        id: "naginata-08-11",
        ...segmented("{労働|ろうどう}"),
      },
      {
        id: "naginata-08-12",
        ...segmented("{死|し}ぬ"),
      },
      {
        id: "naginata-08-13",
        ...segmented("{盗|ぬす}む"),
      },
      {
        id: "naginata-08-14",
        ...segmented("{目覚|めざ}める"),
      },
      {
        id: "naginata-08-15",
        ...segmented("{全然|ぜんぜん}むずかしくない。"),
      },
      {
        id: "naginata-08-16",
        ...segmented("{最初|さいしょ}から{始|はじ}めよう。"),
      },
      {
        id: "naginata-08-17",
        ...segmented("だよね。そう{思|おも}うよね。"),
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
