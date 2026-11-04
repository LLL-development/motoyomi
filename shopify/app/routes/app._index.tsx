import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {useActionData,useLoaderData,useNavigation,data as responseData} from 'react-router';
import {authenticate} from '../shopify.server';
import db from '../db.server';
import {applySavedRule,loadDraft,saveDraft,RuleError} from '../shipping-service.server';
import {RuleEditor} from '../components.RuleEditor';
import {requireSameOrigin} from '../mutation-security.server';
export async function loader({request}:LoaderFunctionArgs){const {session}=await authenticate.admin(request);return loadDraft(db,session.shop);}
export async function action({request}:ActionFunctionArgs){
 requireSameOrigin(request);const {session,admin}=await authenticate.admin(request);
 if(!session.scope?.split(',').includes('write_delivery_customizations'))return responseData({error:'配送設定を変更する権限がありません。Shopifyでアプリを再承認してください。'},{status:403});
 const form=await request.formData();const intent=form.get('intent');const revision=Number(form.get('revision'));
 if(!Number.isSafeInteger(revision)||revision<0)return responseData({error:'画面を再読み込みしてから操作してください。'},{status:400});
 try{
 if(intent==='save'){await saveDraft(db,session.shop,{normal:String(form.get('normal')??''),island:String(form.get('island')??''),ranges:String(form.get('ranges')??''),enabled:form.get('enabled')==='on'},revision);return {notice:'保存しました。Shopifyへ反映するまで、チェックアウトの設定は変わりません。'};}
 if(intent==='apply'){
 const saved=await loadDraft(db,session.shop);if(saved.revision!==revision)throw new RuleError('別の画面で設定が更新されました。再読み込みして確認してください。');
 const applied=await applySavedRule(db,session.shop,(query,options)=>admin.graphql(query,options),process.env.SHOPIFY_API_KEY??'');
 return {notice:applied.enabled?'Shopifyへ反映しました。開発ストアで配送方法が切り替わることを確認してください。':'Shopifyで配送ルールを無効にしました。'};
 }
 return responseData({error:'操作を確認してください。'},{status:400});
 }catch(error){if(error instanceof RuleError||error instanceof Error&&error.message.match(/入力|設定|範囲|行目|配送方法名/))return responseData({error:error.message},{status:400});throw error;}
}
export default function ShippingHome(){const data=useLoaderData<typeof loader>();const result=useActionData<typeof action>();const navigation=useNavigation();return <RuleEditor data={data} error={result&&'error' in result?result.error:undefined} notice={result&&'notice' in result?result.notice:undefined} busy={navigation.state!=='idle'}/>;}
