export interface SessionResult {
  id: string;
  lessonId: string;
  exerciseId: string;
  timestamp: number;
  totalChars: number;
  correctChars: number;
  missCount: number;
  elapsedMs: number;
  /** かな/分 */
  wpm: number;
  /** 正確率（%） */
  accuracy: number;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
  lastPracticed: number;
  sessionCount: number;
}

export interface AppSettings {
  showKeyboard: boolean;
  layoutView: "qwerty" | "kana";
}
