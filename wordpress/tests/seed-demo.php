<?php
/** Disposable-site sample content. Run with wp eval-file; creates 200 published articles and one draft. */
$topics = ['内部リンクの見直し','配送ルールの設定','数量管理の基本','商品型番の検索','問い合わせ前の案内','記事の更新手順','見出しの書き方','サイト内検索の改善'];
$ids=[];
foreach ($topics as $topic_index=>$topic) {
    for ($i=0;$i<25;$i++) {
        $model='AB-' . (1200+$topic_index*25+$i);
        $ids[]=wp_insert_post(['post_status'=>'publish','post_type'=>'post','post_title'=>$topic . ' ' . $model,'post_content'=>'<!-- wp:heading --><h2 class="wp-block-heading">' . $topic . 'の手順</h2><!-- /wp:heading --><!-- wp:paragraph --><p>運営を続けるために、担当者が確かめる点をまとめました。最初に現在の設定を確認し、変更の前後を比べてください。</p><!-- /wp:paragraph -->']);
    }
}
$draft=wp_insert_post(['post_status'=>'draft','post_type'=>'post','post_title'=>'内部リンクの見直し AB1200','post_content'=>'<!-- wp:paragraph --><p>過去の記事を探して、内部リンクの見直し ＡＢ－１２００ を参考にします。記事の更新手順と見出しの書き方も確かめましょう。</p><!-- /wp:paragraph --><!-- wp:heading --><h2 class="wp-block-heading">内部リンクの見直しの手順</h2><!-- /wp:heading --><!-- wp:paragraph --><p>題名と見出しを手がかりに関連記事を選び、読者が次に知りたい情報へ案内します。</p><!-- /wp:paragraph -->']);
Motoyomi_IL_Plugin::rebuild(); while (get_option('motoyomi_il_progress')['state']==='running') Motoyomi_IL_Plugin::batch();
echo 'Sample articles: '.count($ids).'; draft: '.$draft."\n";
file_put_contents('/tmp/motoyomi-demo-ids.json',wp_json_encode(['articles'=>$ids,'draft'=>$draft]));
