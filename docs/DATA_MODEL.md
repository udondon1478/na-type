# データモデル（localStorage）

N.A.Type はバックエンドを持たず、練習記録・進捗・設定をすべてブラウザの localStorage に保存します。アクセスは `src/lib/storage.ts` に集約されています（直接 `localStorage` を触らない）。

## キー一覧

| キー | 型 | 内容 |
|------|-----|------|
| `natype:sessions` | `SessionResult[]` | セッション結果。**直近100件**（`MAX_SESSIONS`）。新しい順（`unshift`） |
| `natype:progress` | `Record<string, LessonProgress>` | レッスンIDごとの進捗・自己ベスト |
| `natype:settings` | `AppSettings` | 表示・入力方式などの設定 |

## 型定義

型の正本は `src/types/stats.ts`。

### SessionResult

```ts
interface SessionResult {
  id: string;          // crypto.randomUUID()（非対応環境はフォールバック生成）
  lessonId: string;
  exerciseId: string;
  timestamp: number;   // epoch ms
  totalChars: number;
  correctChars: number;
  missCount: number;
  elapsedMs: number;
  wpm: number;         // かな/分
  accuracy: number;    // 正確率（%）
}
```

### LessonProgress

```ts
interface LessonProgress {
  lessonId: string;
  completed: boolean;
  bestWpm: number;      // 過去最高 WPM
  bestAccuracy: number; // 過去最高 正確率
  lastPracticed: number;// 最終練習の timestamp
  sessionCount: number; // 通算セッション数
}
```

セッション保存時、`updateProgress()` が `bestWpm` / `bestAccuracy` を `Math.max` で更新し、`sessionCount` を加算します。

### AppSettings

```ts
type InputMethod = "karabiner" | "remapping" | "physical";

interface AppSettings {
  showKeyboard: boolean;              // キーボードガイド表示
  layoutView: "qwerty" | "kana";     // キー表示の切替
  inputMethod?: InputMethod;          // 未設定(undefined)ならセットアップ画面へ
}
```

- デフォルト: `{ showKeyboard: true, layoutView: "qwerty" }`
- `inputMethod === undefined` が「初回セットアップ未完了」の判定に使われる（`isSetupCompleted()`）
- `karabiner` / `remapping`: OS側で薙刀式に変換済みのかなを受け取る
- `physical`: 変換ツールなしで物理キー位置により薙刀式を判定（例: J→あ）。単独打鍵に加え、濁点・シフト・combo 等の同時打鍵に対応。「次に打つべきかな」が既知なので、押下中のキー集合が目標かなのキー集合に一致した時点で確定する目標かなベース方式（`resolve-chord-to-kana.ts` の `matchChordToTarget`）。押す速さ・順序に依存せず、プレフィックス問題（あ=J ⊂ ど=J+D）も目標側で一意に解決。位置づけはツール導入前のお試し練習で、本物の薙刀式とはタイミング判定が異なる
- 旧 `romaji` モードは廃止。保存済みの値は読み込み時に `physical` へ移行（`getSettings()`）

## 設計上の注意

- **読み取りは常にフォールバック付き**: SSR/静的生成時（`window` 不在）や JSON 破損時は既定値を返す。`storage.ts` の `getItem` がこれを担保
- **スキーマのバージョニングは未実装**: 型を破壊的に変更すると既存ユーザーの localStorage と齟齬が出る。フィールド追加は任意化（`?`）＋デフォルト補完で後方互換を保つのが安全
- **保存はベストエフォート**: `setItem` は容量超過等の例外をハンドリングしていない。件数上限（100件）があるため実運用では問題になりにくい
- **端末間同期なし**: データはブラウザローカルのみ。別端末・別ブラウザには引き継がれない
