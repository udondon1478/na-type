export interface ExerciseSegment {
  /** 表示テキスト（漢字可） */
  display: string;
  /** 入力判定用ひらがな */
  reading: string;
}

export interface Exercise {
  id: string;
  /** 表示するテキスト（ひらがなのみの場合はこれだけでOK） */
  text: string;
  /** 漢字を含む場合のセグメント情報 */
  segments?: ExerciseSegment[];
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
