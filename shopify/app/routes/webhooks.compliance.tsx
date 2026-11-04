import type { ActionFunctionArgs } from "react-router";
import { verifyWebhook } from "../webhook-security.server";
import db from "../db.server";
export async function action({request}:ActionFunctionArgs) {
 const raw=Buffer.from(await request.arrayBuffer());
 if(!verifyWebhook(raw,request.headers.get('X-Shopify-Hmac-Sha256'),process.env.SHOPIFY_API_SECRET??''))return new Response(null,{status:401});
 const shop=request.headers.get('X-Shopify-Shop-Domain');
 const topic=request.headers.get('X-Shopify-Topic');
 if(!shop||!/^([a-z0-9][a-z0-9-]*)\.myshopify\.com$/.test(shop))return new Response(null,{status:400});
 if(!['customers/data_request','customers/redact','shop/redact'].includes(topic??''))return new Response(null,{status:400});
 let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{return new Response(null,{status:400});}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return new Response(null,{status:400});
 if(topic==='shop/redact'){
  if(Object.keys(payload).some(key=>!['shop_id','shop_domain'].includes(key))||!Number.isSafeInteger(payload.shop_id)||payload.shop_id<=0)return new Response(null,{status:400});
  if(payload.shop_domain!==shop)return new Response(null,{status:400});
  await db.$transaction([db.session.deleteMany({where:{shop}}),db.shippingShop.deleteMany({where:{shop}})]);
 }
 // No customer data is collected or persisted by this application.
 return new Response(null,{status:200});
}
