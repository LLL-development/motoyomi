<?php
function wp_strip_all_tags($s) { return strip_tags(preg_replace('@<(script|style)[^>]*?>.*?</\\1>@si', '', $s)); }
function wp_parse_url($s, $component = -1) { return parse_url($s, $component); }
require __DIR__ . '/../motoyomi/vendor/autoload.php';
require __DIR__ . '/../motoyomi/includes/class-motoyomi-il-engine.php';
function check($ok, $message) { if (!$ok) { throw new Exception($message); } echo "PASS $message\n"; }
check(Motoyomi_IL_Engine::normalize('ＡＢ－１２００') === 'ab-1200', 'NFKC and case');
check(in_array('ab1200', Motoyomi_IL_Engine::grams('AB−1200')), 'model compact token');
check(in_array('内部', Motoyomi_IL_Engine::grams('内部リンク')), 'Japanese bigram');
foreach (['AB1200', 'ＡＢ－１２００', 'ab-1200'] as $text) {
    check(Motoyomi_IL_Engine::anchor('製品 ' . $text . ' を使います', ['AB-1200'], 3) === $text, 'original anchor ' . $text);
}
check(Motoyomi_IL_Engine::anchor('会社概要', ['会社'], 3) === null, 'minimum anchor length');
$docs = [1 => ['id'=>1,'title'=>'内部リンク','headings'=>[],'grams'=>Motoyomi_IL_Engine::weighted('内部リンク', []),'url'=>'/one/'],2=>['id'=>2,'title'=>'内部リンクの設計','headings'=>[],'grams'=>Motoyomi_IL_Engine::weighted('内部リンクの設計', []),'url'=>'/two/'],3=>['id'=>3,'title'=>'料理','headings'=>[],'grams'=>Motoyomi_IL_Engine::weighted('料理', []),'url'=>'/three/']];
$r = Motoyomi_IL_Engine::suggest(1, '内部リンク', '<p>内部リンクの設計を紹介。</p>', $docs, [], 5, 10, 3);
check(count($r['related']) === 1 && $r['related'][0]['id'] === 2, 'related excludes self and zero overlap');
check($r['links'][0]['anchor_text'] === '内部リンクの設計', 'longest phrase');
$r = Motoyomi_IL_Engine::suggest(1, '内部リンク', '<a href="/two/">既存</a>', $docs, [], 5, 10, 3);
check(count($r['related']) === 0, 'existing link excluded');
$r = Motoyomi_IL_Engine::suggest(1, '内部リンク', '', $docs, ['/two/'], 5, 10, 3);
check(count($r['related']) === 0, 'excluded path');
check(Motoyomi_IL_Engine::path('https://example.test/?p=42') !== Motoyomi_IL_Engine::path('https://example.test/?p=43'), 'plain permalink identity');
check(Motoyomi_IL_Engine::anchor('AB12000', ['AB-1200'], 3) === null, 'model number boundary');
check(Motoyomi_IL_Engine::anchor('AB 1200', ['AB-1200'], 3) === null, 'space does not join model');
check(Motoyomi_IL_Engine::anchor('製品AB1200を使う', ['AB-1200'], 3) === 'AB1200', 'model adjacent to Japanese');
