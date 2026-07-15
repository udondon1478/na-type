import type { SessionResult, LessonProgress, AppSettings } from "@/types/stats";
import type { GameRecord } from "@/types/game";
import type { FudaSave } from "@/types/fuda";
import { normalizeSave } from "@/lib/fuda/save";

const KEYS = {
  sessions: "natype:sessions",
  progress: "natype:progress",
  settings: "natype:settings",
  game: "natype:game",
  fuda: "natype:fuda",
} as const;

const MAX_SESSIONS = 100;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSessions(): SessionResult[] {
  return getItem<SessionResult[]>(KEYS.sessions, []);
}

export function addSession(session: SessionResult): void {
  const sessions = getSessions();
  sessions.unshift(session);
  if (sessions.length > MAX_SESSIONS) sessions.length = MAX_SESSIONS;
  setItem(KEYS.sessions, sessions);
}

export function getProgress(): Record<string, LessonProgress> {
  return getItem<Record<string, LessonProgress>>(KEYS.progress, {});
}

export function updateProgress(lessonId: string, session: SessionResult): void {
  const progress = getProgress();
  const existing = progress[lessonId];

  progress[lessonId] = {
    lessonId,
    completed: true,
    bestWpm: Math.max(existing?.bestWpm ?? 0, session.wpm),
    bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, session.accuracy),
    lastPracticed: session.timestamp,
    sessionCount: (existing?.sessionCount ?? 0) + 1,
  };

  setItem(KEYS.progress, progress);
}

const DEFAULT_SETTINGS: AppSettings = {
  showKeyboard: true,
  layoutView: "qwerty",
};

export function getSettings(): AppSettings {
  const settings = getItem<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
  // 移行: 廃止した "romaji" モードは物理キー位置練習の "physical" に読み替える
  if ((settings.inputMethod as string) === "romaji") {
    return { ...settings, inputMethod: "physical" };
  }
  return settings;
}

export function updateSettings(partial: Partial<AppSettings>): void {
  const settings = getSettings();
  setItem(KEYS.settings, { ...settings, ...partial });
}

export function isSetupCompleted(): boolean {
  return getSettings().inputMethod !== undefined;
}

/**
 * 言霊ディフェンスのプレイ記録（レベル別）
 * レッスン範囲（1-8）ごとに単語プールが変わるため、ハイスコアはレベル単位で持つ。
 */
export function getGameRecords(): Record<string, GameRecord> {
  return getItem<Record<string, GameRecord>>(KEYS.game, {});
}

export function getGameRecord(level: number): GameRecord | undefined {
  return getGameRecords()[String(level)];
}

/** ラン終了時に記録を更新し、ハイスコア更新だったかを返す */
export function updateGameRecord(
  level: number,
  run: { score: number; wave: number }
): { isNewRecord: boolean } {
  const records = getGameRecords();
  const key = String(level);
  const existing = records[key];
  const isNewRecord = run.score > (existing?.highScore ?? 0);

  records[key] = {
    highScore: Math.max(existing?.highScore ?? 0, run.score),
    bestWave: Math.max(existing?.bestWave ?? 0, run.wave),
    totalRuns: (existing?.totalRuns ?? 0) + 1,
    lastPlayed: Date.now(),
  };

  setItem(KEYS.game, records);
  return { isNewRecord };
}

/**
 * 言霊札のセーブデータ（メタ進行 + ラン途中チェックポイント）。
 * 正規化・検証は lib/fuda/save.ts が担い、ここは薄い IO に徹する。
 */
export function getFudaSave(): FudaSave {
  return normalizeSave(getItem<unknown>(KEYS.fuda, null));
}

export function setFudaSave(save: FudaSave): void {
  setItem(KEYS.fuda, save);
}

export function updateFudaSave(mutate: (save: FudaSave) => FudaSave): FudaSave {
  const next = mutate(getFudaSave());
  setFudaSave(next);
  return next;
}
