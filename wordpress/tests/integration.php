<?php
// Run using wp eval-file against a disposable WordPress site only.
function il_check($ok, $message) { if (!$ok) { throw new Exception($message); } echo "PASS $message\n"; }
il_check(class_exists('Motoyomi_IL_Plugin'), 'plugin active');
wp_set_current_user(1);
$ids = [];
for ($i=0; $i<200; $i++) {
    $topic = ['内部リンク設計','配送ルール','数量管理','商品型番'][$i % 4];
    $ids[] = wp_insert_post(['post_title'=> $topic . ' AB-' . (1200 + $i), 'post_content'=> '<h2>' . $topic . 'の手順</h2><p>日本語の記事です。</p>', 'post_status'=>'publish']);
}
il_check(count(Motoyomi_IL_Plugin::index()) >= 200, '200 saved articles indexed');
$target = wp_insert_post(['post_title'=>'AB-1200','post_content'=>'<h2>内部リンク設計</h2>', 'post_status'=>'publish']);
$source = wp_insert_post(['post_title'=>'内部リンク設計 AB1200', 'post_content'=>'<p>ＡＢ－１２００ を使います。</p>', 'post_status'=>'draft']);
$request = new WP_REST_Request('POST','/motoyomi/v1/related');
$request->set_body_params(['id'=>$source, 'title'=>'内部リンク設計 AB1200', 'content'=>'<p>ＡＢ－１２００ を使います。</p>']);
$response = rest_do_request($request);
il_check($response->get_status() === 200, 'authorized REST');
$data = $response->get_data();
il_check(in_array($target, array_column($data['links'],'id')), 'fullwidth model anchor');
wp_update_post(['ID'=>$target,'post_status'=>'private']);
il_check(!isset(Motoyomi_IL_Plugin::index()[$target]), 'private immediately removed');
wp_update_post(['ID'=>$target,'post_status'=>'publish']);
wp_trash_post($target);
il_check(!isset(Motoyomi_IL_Plugin::index()[$target]), 'trash immediately removed');
wp_delete_post($target,true);
il_check(!isset(Motoyomi_IL_Plugin::index()[$target]), 'delete removed');
$before = get_post_field('post_content',$source);
rest_do_request($request);
il_check(get_post_field('post_content',$source) === $before, 'suggestion does not modify content');
wp_set_current_user(0);
il_check(rest_do_request($request)->get_status() === 401, 'anonymous denied');
wp_set_current_user(wp_create_user('motoyomi-subscriber-' . time(), wp_generate_password()));
il_check(rest_do_request($request)->get_status() === 403, 'subscriber denied');
wp_set_current_user(1);
Motoyomi_IL_Plugin::rebuild();
Motoyomi_IL_Plugin::batch();
$state = get_option('motoyomi_il_progress');
il_check($state['processed'] === 50 && $state['state'] === 'running', 'batch processes exactly 50');
$cursor = $state['cursor'];
Motoyomi_IL_Plugin::batch();
il_check(get_option('motoyomi_il_progress')['cursor'] > $cursor, 'batch resumes cursor');
while (get_option('motoyomi_il_progress')['state'] === 'running') { Motoyomi_IL_Plugin::batch(); }
il_check(get_option('motoyomi_il_progress')['state'] === 'complete', 'rebuild complete');
$index = Motoyomi_IL_Plugin::index();
il_check(count($index) >= 200, 'rebuild retained articles');
$http = 0;
add_filter('pre_http_request', function () use (&$http) { $http++; return new WP_Error('offline','No network'); });
rest_do_request($request); Motoyomi_IL_Plugin::batch();
il_check($http === 0, 'zero external HTTP requests');
// 50 deterministic relevance probes; these are fixtures, not human judged acceptance.
$hits=0; $started=microtime(true);
for ($i=0;$i<50;$i++) {
    $post = get_post($ids[$i]);
    $r = Motoyomi_IL_Engine::suggest(0,$post->post_title,'<p>' . $post->post_title . '</p>', $index,[],10,20,3);
    if (in_array($post->ID,array_column($r['related'],'id'))) { $hits++; }
}
echo 'FIXTURE recall@10=' . $hits . "/50; query50_ms=" . round((microtime(true)-$started)*1000,2) . "\n";
il_check($hits === 50,'50 known fixture matches');
foreach ($ids as $id) { wp_delete_post($id,true); } wp_delete_post($source,true);
