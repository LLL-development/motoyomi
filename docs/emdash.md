# Motoyomi for EmDash — 1.0.0 ベータ

## インストール

EmDashサイトのディレクトリで実行します。npm registryには未公開なので、今回の公開tarball URLを指定してください。

```sh
npm install "https://github.com/LLL-development/motoyomi/releases/download/beta-2026-11-04/motoyomi-emdash-1.0.0.tgz"
# pnpmを利用するサイト: pnpm add "同じtarball URL"
```

既存のastro.config.mjsのEmDash設定にdescriptorを追加します。既存のadapter・collections等は保持してください。

```js
import { defineConfig } from 'astro/config';
import emdash from 'emdash/astro';
import motoyomi from '@motoyomi/emdash';

export default defineConfig({
  site: 'https://your-site.example', // 実際の公開URLへ変更
  integrations: [emdash({ plugins: [motoyomi] })],
});
```

`motoyomi`はdescriptorです。`motoyomi()`のようには呼び出しません。対象コレクションの公開URLも設定してください。公開URLが解決できない記事は索引しません。

以下に機能と既知制限を記載します。

# Motoyomi for EmDash
保存した記事の本文にある語句から内部リンクを提案し、題名と見出しが近い公開記事を探します。日本語bigram、型番の全角/半角・ハイフンの差に対応します。外部通信・生成・本文への書き込みを行いません。

`import motoyomi from '@motoyomi/emdash'` を読み込み、EmDash設定の `plugins: [motoyomi]` に追加します。EmDash >=1.3.1 <2、受入検査対象1.4.0。`plugins` 配列ではホスト内で実行し、Node/workerdを追加せずに導入できます。`sandboxed` 配列や登録簿からの導入ではNode/workerdまたはCloudflare有料Worker Loaderが必要です。

初回は索引を自動作成。管理画面「内部リンク」で範囲を設定します。再構築は1回50件、毎分のcronまたは「続きを進める」で再開します。索引作成中も既に登録した記事から候補を表示します。

編集パネルで「保存した内容」を比較します。リンク先URLはコード欄を選択して⌘C / Ctrl+Cでコピーし、本文へ手動で入れてください。「語句を探す」は該当語句と本文内の文字位置を表示します。現在のBlock Kitはエディタ内の位置移動を提供しないため、⌘F/Ctrl+Fで検索してください。

後の版でサーバにつなぐ機能を足します。追加権限はその版で同意を求めます。

開発: `pnpm install && pnpm test && pnpm typecheck && pnpm build`。実SDKの標準descriptorを生成します。`pnpm test:runtime`は明示的なテスト用publisherを使う使い捨てfixtureで公式CLIと本物D1/workerdを検証します（公開アカウントや公開可否の検証ではありません）。登録簿metadataのpublisher/セキュリティ窓口は公開前に実アカウントで確定してください。空publisherのまま公開することはできません。

Astroの `site` に本番サイトURLを設定してください。EmDashの `getPublicUrl` が公開URLを解決できない記事は索引から除きます。

## 初期ベータの制限
日本語200記事・人手正解50組による候補精度IL-01、無関係候補率IL-02は未評価です。的中率を保証しません。
Cloudflare有料実機のCPU 50ms・外部呼び出し枠は未測定です。ローカルNodeの参考実測は500件で中央値29.6ms/p95 31.1ms、2000件で中央値119.7ms/p95 269.2ms（DB取得を含まない候補計算の実時間）です。500件を超えるサイトは対象範囲を絞って試してください。
現在のEmDash Block Kitは本文位置への自動移動・クリップボード書き込みを提供しません。語句と位置の表示、URLの選択コピー、手動リンクに対応します。保存した下書きのリビジョンは読み取らず、公開済み記事に未公開の変更がある場合は公開値を比較します。
登録簿への公開は実publisherの確定が残っています。npm用tarballのローカル導入は検証済みですが、npm registryへは未公開です。
