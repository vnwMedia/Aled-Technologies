const PUBLIC_ORIGINS=new Set(['https://vnwmedia.github.io','https://99hudsoncondos.aled.tech']);
export function allowedOrigin(req:Request){
 const origin=req.headers.get('Origin');
 if(origin&&PUBLIC_ORIGINS.has(origin))return origin;
 // Loopback origins are accepted only by a loopback development server.
 const host=new URL(req.url).hostname;
 if(['localhost','127.0.0.1'].includes(host)&&origin&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))return origin;
 return null;
}
export function withCors(response:Response,origin:string){const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Max-Age','600');headers.set('Cache-Control','private, no-store');return new Response(response.body,{status:response.status,headers})}
export async function pagesRequest(req:Request,target:string){
 const origin=allowedOrigin(req);
 if(!origin)return {error:Response.json({error:'This prototype is available only from the approved preview website.'},{status:403})};
 if(req.method==='OPTIONS')return {error:withCors(new Response(null,{status:204}),origin)};
 const match=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('Authorization')||'');
 if(!match)return {error:withCors(Response.json({error:'Your browser session is missing. Please reload the page.'},{status:401}),origin)};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
 const user='github-pages:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const url=new URL(req.url);url.pathname=target;
 const headers=new Headers({'Origin':url.origin,'oai-authenticated-user-id':user});
 const contentType=req.headers.get('Content-Type');if(contentType)headers.set('Content-Type',contentType);
 let body:string|undefined;
 if(req.method!=='GET'&&req.method!=='HEAD'){if(Number(req.headers.get('content-length')||0)>8192)return {error:withCors(Response.json({error:'Request too large'},{status:413}),origin)};body=await req.text();if(body.length>8192)return {error:withCors(Response.json({error:'Request too large'},{status:413}),origin)}}
 return {origin,request:new Request(url,{method:req.method,headers,body})};
}
