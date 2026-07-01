# デプロイ・運用ガイド

N.A.Type は Next.js の静的エクスポート（`output: "export"`）で `out/` に静的ファイルを生成し、**Cloudflare Pages** でホスティングします。バックエンド・データベース・環境変数は使いません（設定は全てクライアント側 / localStorage）。

## ビルド成果物

```bash
npm ci
npm run build   # → out/ に静的サイトを生成
```

- 出力ディレクトリ: **`out/`**（`.gitignore` 対象。デプロイ時に生成する）
- 環境変数: **不要**（コード内に `process.env` 参照なし）
- ビルドは **webpack 固定**（`package.json` の `build` が `next build --webpack`）。Turbopack 本番ビルドは React #185 の無限ループを踏むため使わない

## Cloudflare Pages（Git 連携・推奨）

`main` への push をトリガーに自動ビルド・デプロイする構成です。

### プロジェクト設定

| 項目 | 値 |
|------|-----|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node.js version | `22`（`.node-version` で固定。環境変数 `NODE_VERSION=22` でも可） |
| Framework preset | None（Static。`out` を直接配信するため Next.js プリセットは使わない） |

> Framework preset に "Next.js" を選ぶと Cloudflare 側が SSR/Functions 前提の挙動を取ることがあります。本プロジェクトは純粋な静的サイトなので **preset なし + 出力 `out`** を推奨します。

### デプロイフロー

1. PR を `main` にマージ（または `main` へ push）
2. Cloudflare Pages が自動でビルド（`npm ci` → `npm run build`）
3. `out/` を配信。数分で本番反映
4. PR ごとに Preview デプロイ（一意 URL）が作られる

## wrangler CLI での手動デプロイ（代替）

ダッシュボードを使わず手元から直接上げる場合:

```bash
npm run build
npx wrangler pages deploy out --project-name=<プロジェクト名>
```

初回は `npx wrangler login` で認証が必要です。

## SPA ルーティングについて

静的エクスポートは各ルートを実ファイル（`out/naginata/index.html` など）として書き出すため、通常は追加のリライト設定は不要です。動的ルート `naginata/lesson/[id]` は `generateStaticParams()` が返す ID 分だけ事前生成されます。

未定義パスのフォールバックを調整したい場合は `public/_redirects` / `public/_headers`（Cloudflare Pages 形式）を追加すると `out/` にコピーされます。

## 運用チェックリスト

- **リリース前**: ローカルで `npm run build` が成功することを必ず確認（静的エクスポートの破綻はビルド時にしか出ない）
- **配列データ変更時**: `layout.ts` を再生成（[CONTRIBUTING.md](../CONTRIBUTING.md) 参照）してからビルド
- **依存の脆弱性**: `npm audit` を定期確認。純粋な静的サイトのため実行時リスクは限定的だが、ビルド依存は更新する
- **ロールバック**: Cloudflare Pages のダッシュボードから過去のデプロイを "Rollback" で即時復帰できる
- **監視対象なし**: サーバー・APIがないため死活監視は Cloudflare 側のエッジ配信ステータスのみ

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| 本番ビルドが無限ループ / OOM | `next build --webpack` になっているか確認（Turbopack 由来の React #185） |
| Node バージョン不一致でビルド失敗 | Cloudflare の Node を 22 に固定（`.node-version` / `NODE_VERSION`） |
| ページ遷移で 404 | 該当ルートが静的生成されているか、`out/` に HTML が出ているか確認 |
| 動的レッスンが 404 | `generateStaticParams()` が対象 ID を返しているか確認 |
