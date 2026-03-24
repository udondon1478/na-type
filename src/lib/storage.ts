import type { SessionResult, LessonProgress, AppSettings } from "@/types/stats";

const KEYS = {
  sessions: "natype:sessions",
  progress: "natype:progress",
  settings: "natype:settings",
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
  return getItem<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function updateSettings(partial: Partial<AppSettings>): void {
  const settings = getSettings();
  setItem(KEYS.settings, { ...settings, ...partial });
}
