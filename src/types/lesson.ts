export interface Exercise {
  id: string;
  /** 表示するテキスト */
  text: string;
  /** ヒント */
  hint?: string;
}

export interface Lesson {
  id: string;
  layoutId: string;
  title: string;
  description: string;
  /** このレッスンで使用するかな一覧 */
  targetKana: string[];
  /** 練習テキスト */
  exercises: Exercise[];
  /** 前提レッスン */
  prerequisites: string[];
}
