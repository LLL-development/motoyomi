import {useEffect,useState} from 'react';
import {Form} from 'react-router';
import type {RuleDraft} from './shipping-service.server';
import limits from '../config/free-limits.json';
import './shipping.css';
export interface EditorData {draft:RuleDraft;revision:number;appliedRevision:number;customizationId:string|null;appliedAt:string|null}
export function RuleEditor({data,error,notice,busy=false,demo=false}:{data:EditorData;error?:string;notice?:string;busy?:boolean;demo?:boolean}){
 const [draft,setDraft]=useState(data.draft);
 useEffect(()=>setDraft(data.draft),[data.revision]);
 const dirty=JSON.stringify(draft)!==JSON.stringify(data.draft);
 const count=draft.ranges.split(/\r?\n/).filter(x=>x.trim()).length;
 return <div className="shipping-app">
 <header><div className="eyebrow">MOTOYOMI · LLL Inc.</div><h1>配送ルール</h1><p>地域ごとに、通常用と離島用の配送方法を切り替えます。</p></header>
 {demo&&<div className="demo-notice" role="note">ローカルデモ — 保存先はテスト用DBです。Shopifyへの反映は実行しません。</div>}
 {error&&<div role="alert" className="alert error">{error}</div>}{notice&&<div role="status" className="alert success">{notice}</div>}
 <div className="status-row"><span className="pill">無料 · 1ルール</span><span>{data.revision===0?'まだ保存されていません':dirty?'未保存の変更があります':data.appliedRevision<data.revision?'保存済み · Shopifyへ未反映':'Shopifyへ反映済み'}</span>{data.appliedAt&&<span>最終反映: {new Date(data.appliedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}（日本時間）</span>}</div>
 <Form method="post" onKeyDown={e=>{if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT')e.preventDefault();}}>
 <input type="hidden" name="revision" value={data.revision}/>
 <section className="card"><h2>1. 配送方法の名前</h2><p className="muted">Shopifyの配送設定で作成した名前を、そのまま入力してください。完全一致で判定します。</p>
 <div className="two-columns"><label>通常用の配送方法<input required name="normal" maxLength={limits.maxMethodChars} value={draft.normal} onChange={e=>setDraft({...draft,normal:e.target.value})} placeholder="例: 宅急便（通常）" autoComplete="off"/></label><label>離島用の配送方法<input required name="island" maxLength={limits.maxMethodChars} value={draft.island} onChange={e=>setDraft({...draft,island:e.target.value})} placeholder="例: 宅急便（離島）" autoComplete="off"/></label></div>
 <div className="direction"><span>指定地域の中</span><strong>通常用を隠す → 離島用を表示</strong><span>指定地域の外</span><strong>離島用を隠す → 通常用を表示</strong></div>
 </section>
 <section className="card"><h2>2. 切り替える地域</h2><p className="muted" id="ranges-help">運送会社と確認した郵便番号の範囲を、1行に1つ入力してください。7桁の番号、または「開始7桁-終了7桁」。住所のハイフンではなく、範囲の区切りとしてハイフンを使います。</p>
 <label htmlFor="ranges">郵便番号の範囲<textarea id="ranges" name="ranges" required rows={8} maxLength={20000} aria-describedby="ranges-help range-count" value={draft.ranges} onChange={e=>setDraft({...draft,ranges:e.target.value})} spellCheck={false} placeholder="運送会社の表にある番号・範囲を入力"/></label>
 <div id="range-count" className={count>limits.maxRanges?'range-count invalid':'range-count'}>{count} / {limits.maxRanges} 範囲{count>limits.maxRanges?' — 無料版の上限を超えています':''}</div>
 <p className="muted">離島の内蔵表はまだ同梱していません。運送会社によって対象地域は異なります。</p>
 </section>
 <section className="card"><h2>3. 有効・無効</h2><label className="checkbox"><input type="checkbox" name="enabled" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>この配送ルールを有効にする</label><p className="muted">無効にする場合も、保存してからShopifyへ反映してください。</p></section>
 <div className="save-bar"><div><strong>{dirty?'未保存の変更':data.appliedRevision<data.revision?'Shopifyへ未反映の設定':'設定を確認'}</strong><p>保存した後に「Shopifyに反映する」を押すと、チェックアウトに適用されます。</p></div><div className="buttons"><button type="submit" name="intent" value="save" className="secondary" disabled={busy||count>limits.maxRanges}>保存する</button><button type="submit" name="intent" value="apply" className="primary" disabled={busy||dirty||data.revision===0||demo}>Shopifyに反映する</button></div></div>
 </Form>
 <section className="help"><h2>ご利用の前に</h2><details><summary>配送料金も変更できますか？</summary><p>料金は変更しません。Shopifyの配送設定で、通常用と離島用の料金を別々に作成してください。</p></details><details><summary>住所の入力途中や、全ての配送方法が消える場合は？</summary><p>必要な住所が不明な間は、どちらも隠しません。1つの配送グループで全てが隠れる場合も、何も隠さず選択肢を残します。</p></details><details><summary>どの店舗で使えますか？</summary><p>Basic以上を対象にしています。配送先の郵便番号を使うため、アプリの公開前にShopifyの住所データアクセスと開発ストアでの検証が必要です。カート画面ではなく、チェックアウトで動作します。</p></details><details><summary>買い物客の住所は保存されますか？</summary><p>住所はShopify Function内だけで判定します。このアプリは買い物客の住所・氏名・注文を取得、送信、保存しません。アプリに保存するのは店舗のルール設定と認証情報です。</p></details></section>
 <footer>Motoyomi 配送ルール · LLL Inc. · 無料ベータ / 店舗接続の実機検証待ち</footer>
 </div>;
}
