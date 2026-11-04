export function requireSameOrigin(request:Request){
 const origin=request.headers.get('Origin');
 const expected=new URL(process.env.SHOPIFY_APP_URL||request.url).origin;
 if((origin&&origin!==expected)||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Response('操作元の画面を確認してください。',{status:403});
}
