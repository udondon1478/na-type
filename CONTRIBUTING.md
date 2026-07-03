# コントリビューションガイド

N.A.Type への貢献手順とコミット規約をまとめます。開発の背景・アーキテクチャは [CLAUDE.md](CLAUDE.md) を参照してください。

## 開発の前提

- **Node.js 22**（`.node-version` で固定）
- パッケージ管理は **npm のみ**（yarn/pnpm/bun は使わない）
- 依存追加後は `package-lock.json` を必ずコミットに含める

```bash
npm ci
npm run dev
```

## 変更を出す前のチェックリスト

1. `npm run build` が成功する（**静的エクスポートの成否は必ず確認**。`output: "export"` のため通常の開発では気づけない破綻が起きうる）
2. `npm run lint` が通る
3. 動的ルート（`src/app/naginata/lesson/[id]`）を触った場合、`generateStaticParams()` が全 ID を返しているか確認
4. 自動生成ファイル（`src/data/naginata/layout.ts`）を手で編集していない

## コミット規約

コミット履歴は **Conventional Commits + gitmoji + 日本語** の形式に統一しています。

```
<type>(<scope>): <日本語の要約> <:emoji:>
```

- `type` と `scope` は英語（小文字）、要約は日本語
- 末尾に gitmoji を付ける（例: `:rocket:` `:bug:`）
- 1コミット1目的。ビルドが通る単位でコミットする

### type 一覧

| type | 用途 | 代表的な emoji |
|------|------|----------------|
| `feat` | 新機能 | `:rocket:` |
| `fix` | バグ修正 | `:bug:` / `:rotating_light:` |
| `refactor` | 挙動を変えない内部改善 | `:recycle:` |
| `docs` | ドキュメント | `:books:` |
| `chore` | 設定・ビルド・雑務 | `:wrench:` |
| `style` | フォーマットのみ | `:art:` |

### scope の例

`dashboard` / `lesson` / `drill` / `input` / `parser` / `stats` / `build` / `dev`

### 実例（履歴より）

```
feat(drill): 単語ドリルモードを追加 :rocket:
fix(build): Turbopack本番ビルドのReact #185無限ループを回避しwebpackビルドに切替 :rotating_light:
feat(parser): 同一かなの重複マッピングをシンクロ版優先で排除 :rocket:
chore: Cloudflare Pages向けにNodeバージョンを22に固定 :wrench:
docs: 開発ガイドをCLAUDE.mdに整備 :books:
```

## 薙刀式配列データの更新

配列データ `src/data/naginata/layout.ts` は **自動生成物**。手で編集せず、Karabiner 設定から再生成します。

```bash
npx tsx scripts/parse-karabiner.ts
```

- 入力: `~/.config/karabiner/karabiner.json` のプロファイル「薙刀式」
- 対象ルール: `"B: 薙刀式配列v14（集大成版）"`
- 生成物の差分もレビューし、意図しないマッピング変化がないか確認してください

## ブランチ・PR

- `main` を直接壊さない。作業はブランチを切って PR を出す
- PR には変更の目的と、`npm run build` の成否を記載
- マージ後、`main` への push が Cloudflare Pages の本番デプロイをトリガーします（[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)）
