@AGENTS.md

# N.A.Type 開発ガイド

## プロジェクト概要

**N.A.Type** は薙刀式配列とArensito配列のタイピング練習Webアプリ。
Karabiner-Elementsで配列環境を構築済みのユーザーが対象。
アプリ内で配列変換は行わず、OS側（Karabiner）の変換結果を受け取って練習する。

- **リポジトリ名**: na-type / **表示名**: N.A.Type
- **ライブラリ管理**: npm（yarn/pnpmは使わない）

## 技術スタック

| 項目 | 技術 | 備考 |
|------|------|------|
| フレームワーク | Next.js 16 (App Router) | `output: "export"` で静的エクスポート |
| 言語 | TypeScript 5 (strict) | |
| UI | shadcn/ui + Tailwind CSS 4 | ダークテーマ固定（`class="dark"`） |
| データ保存 | localStorage のみ | アカウント・バックエンドなし |
| デプロイ先 | Cloudflare Pages | 静的ファイル配信（`out/`）。詳細は `docs/DEPLOYMENT.md` |

## 静的エクスポートの制約

`output: "export"` のため以下が使えない：
- API Routes
- Server Actions
- 動的なServer Components（`generateStaticParams`が必要）
- `cookies()`, `headers()` 等のサーバー専用API

全ページがクライアントコンポーネントまたは静的プリレンダリング。

## アーキテクチャ

### 入力処理フロー
```
物理キー → Karabiner-Elements（OS層で変換）→ ブラウザ KeyboardEvent/IME
  → useKeyboardInput（イベント取得）
  → useTypingSession.processInput()（状態更新）
  → input-engine.validateInput()（正誤判定）
  → localStorage に SessionResult 保存
```

### キーボードガイドの逆引き
```
現在のかな → kana-to-keys.getKeysForKana()
  → Karabinerキーコード（例: ["j"]）
  → KeyboardVisualizer でハイライト
```

### 状態管理
- **useTypingSession**: セッション状態（位置、結果、統計）
- **useKeyboardInput**: イベントリスナー（状態なし）
- **localStorage**: 永続化（SessionResult[], LessonProgress）
- React Context は未使用。この規模ではprop drillingで十分。

## ディレクトリ構成

```
src/
├── app/                        # ページ（App Router）
│   ├── page.tsx                # ダッシュボード
│   ├── naginata/               # 薙刀式セクション
│   │   ├── page.tsx            # レッスン選択
│   │   ├── drill/page.tsx      # 単語ドリル
│   │   ├── game/page.tsx       # 言霊ディフェンス（ZType型・防衛タイピングゲーム）
│   │   ├── fuda/page.tsx       # 言霊札（Balatro型・ローグライクスコアアタック）
│   │   └── lesson/[id]/       # レッスン実行（動的ルート）
│   │       ├── page.tsx        # Server Component + generateStaticParams
│   │       └── LessonClient.tsx # Client Component（実際のUI）
│   └── arensito/page.tsx       # Arensitoフリータイピング
├── components/
│   ├── keyboard/               # SVGキーボードビジュアライザー
│   ├── typing/                 # タイピングエリア・目標テキスト
│   ├── game/                   # 言霊ディフェンスのUI（フィールド・HUD・強化選択等）
│   ├── fuda/                   # 言霊札のUI（手札・採点演出・ショップ・メニュー等）
│   ├── stats/                  # 統計表示
│   ├── layout/                 # ヘッダー等
│   └── ui/                     # shadcn/ui コンポーネント（自動生成）
├── data/naginata/
│   ├── layout.ts               # 自動生成（parse-karabiner.ts の出力）
│   ├── lessons.ts              # レッスン1-8 定義
│   └── words.ts                # 単語ドリル・ゲーム共用の単語辞書（言霊札向け属性拡張済み）
├── hooks/                      # カスタムフック
├── lib/                        # ユーティリティ
│   ├── game/                   # 言霊ディフェンスの純粋ロジック（ウェーブ・スコア・強化・chord照合）
│   └── fuda/                   # 言霊札の純粋ロジック（reducer・採点・役・お守り・ショップ・SFX）
└── types/                      # TypeScript型定義
```

## 重要なファイル

| ファイル | 役割 | 注意点 |
|---------|------|--------|
| `src/data/naginata/layout.ts` | 薙刀式配列データ（323マッピング） | **自動生成**。手動編集禁止。`npx tsx scripts/parse-karabiner.ts` で再生成 |
| `scripts/parse-karabiner.ts` | Karabiner JSON → 配列データ変換 | 入力: `~/.config/karabiner/karabiner.json` |
| `src/hooks/useTypingSession.ts` | タイピングセッション状態機械 | idle→active→completed の状態遷移 |
| `src/hooks/useKeyboardInput.ts` | キーボードイベント取得 | IME compositionend／physicalモードの keyup にも対応 |
| `src/lib/kana-to-keys.ts` | かな→物理キー逆引き | 最もシンプルな入力方法を優先 |
| `src/lib/resolve-chord-to-kana.ts` | 物理キー集合→かな逆引き（全inputType） | physicalモードの同時打鍵判定。非かな・機能エントリは除外 |
| `src/hooks/useKotodamaGame.ts` | 言霊ディフェンスの状態機械＋rAFゲームループ | menu→playing→upgrade→gameover。内部状態はrefでミューテートしスナップショットをstateに同期 |
| `src/lib/game/engine.ts` | 言霊ディフェンスの純粋ロジック | matchChordToEnemies は matchChordToTarget の複数敵拡張 |
| `src/lib/fuda/engine.ts` | 言霊札の心臓部（純粋reducer） | Date.now/Math.random/IO禁止。時刻はイベントの`at`、乱数はrngState経由。イベント列でラン再現可能 |
| `src/hooks/useFudaGame.ts` | 言霊札のフック層 | useReducer+chord判定refs。dispatch反映前のchord照合は「影（shadowRef）」で整合。保存・音・タイマーはここ |
| `src/lib/fuda/balance.ts` | 言霊札の全チューニング定数 | ノルマ曲線・経済・段位。調整は `npx tsx scripts/fuda-sim.ts` で計測してから |

## 薙刀式の入力タイプ

| タイプ | 説明 | 例 |
|--------|------|-----|
| single | 単独キー | J→あ, W→き |
| shifted | スペース+キー同時押し | Space+D→さ |
| dakuten | 濁点キー+かな同時押し | 濁+き→ぎ |
| handakuten | 半濁点キー+かな同時押し | 半+は→ぱ |
| kogaki | 小書きキー+かな同時押し | 小+や→ゃ |
| combo | 複数キー同時押し | し+や→しゃ |

## localStorage キー構造

```
natype:sessions  → SessionResult[]（直近100件）
natype:progress  → Record<string, LessonProgress>
natype:settings  → AppSettings
natype:game      → Record<string, GameRecord>（言霊ディフェンスのレベル別記録）
natype:fuda      → FudaSave（言霊札: メタ進行＋ラン途中チェックポイント。検証はlib/fuda/save.ts）
```

## Karabiner JSONパーサー

```bash
npx tsx scripts/parse-karabiner.ts
```

- 入力: `~/.config/karabiner/karabiner.json` のプロファイル「薙刀式」
- ルール: `"B: 薙刀式配列v14（集大成版）"` の manipulators 配列（393個）
- description フィールドのパターンマッチでかなと入力タイプを分類
- 出力: `src/data/naginata/layout.ts`（323マッピング）

## MVP完了済み機能

- [x] 薙刀式レッスン1-8（公式マニュアル準拠）
- [x] SVGキーボードビジュアライザー（QWERTY/かな切替）
- [x] 次に押すキーのリアルタイムハイライト
- [x] 基本統計（WPM、正確率、ミス数）
- [x] 統合ダッシュボード
- [x] Arensitoフリータイピング（英語テキスト）
- [x] localStorage永続化
- [x] 単語ドリルモード（レッスン範囲フィルタ付き）
- [x] 言霊ディフェンス（ローグライク・タイピングゲーム: ウェーブ制＋強化選択＋レベル別ハイスコア）
- [x] 言霊札（Balatro型ローグライク: かな属性×役×お守りのビルド構築、8幕ノルマ制、段位＋実績アンロック、WebAudio効果音、中断保存）

## 未実装（後続フェーズ）

- [ ] KeyboardEvent.code の Karabiner 経由での動作検証
- [ ] フリータイピング（薙刀式向け任意テキスト）
- [ ] ゲーミフィケーション拡張（実績、ゲーム内イベント・ボス等）
- [ ] 統計ヒートマップ（キー頻度・エラー分布）
- [ ] 同時打鍵成功率分析
- [ ] i18n（英語対応）
- [ ] レッスン内容の公式マニュアルv16との照合・修正

## 開発時の注意

- `npm run build` で静的エクスポートが成功することを常に確認
- 言霊札に触れたら `npx tsx scripts/fuda-check.ts`（エンジン自己検査）を実行。バランス調整は `npx tsx scripts/fuda-sim.ts` で段位×速度プロファイル別の勝率を見てから
- 言霊札の語彙を増やすときは `words.ts` に追記するだけ（属性・役候補は自動導出）。ただしレッスン8までの累積かなのみ使用可（fuda-checkが検証）
- 動的ルート（`[id]`）には `generateStaticParams()` が必須
- `"use client"` と `generateStaticParams` は同じファイルに置けない（Server/Client分離）
- shadcn/ui コンポーネントは `npx shadcn@latest add <name>` で追加
- コミットメッセージは `CONTRIBUTING.md` の規約に従う（Conventional Commits + gitmoji + 日本語）
