# 導入
npm版: パッケージをインストールし、astro.config.mjs の emdash({ plugins: [motoyomi] }) に追加してください。`import motoyomi from '@motoyomi/emdash'`。
管理画面の「内部リンク」で対象コレクションと本文の項目を選び、索引を作り直してください。通常は導入時に自動で開始します。保存済み記事の「関連記事と内部リンク」パネルを開いてください。

公開URLの解決にAstro設定の `site: "https://your-site.example"` が必要です。対象コレクションの公開URLを設定してください。公開URLを持たない記事は候補に入りません。
