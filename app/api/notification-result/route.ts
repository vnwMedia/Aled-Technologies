import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const uid=req.headers.get('oai-authenticated-user-id');if(!uid)return Response.json({error:'Sign in required'},{status:401});
 if(req.headers.get('Origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 try{const raw=await req.text();if(raw.length>1024)return new Response('Request too large',{status:413});const {id,attempt,state}=JSON.parse(raw);
 if(typeof id!=='string'||id.length>64||typeof attempt!=='string'||attempt.length>64||!['submitted','accepted','activation_required','rate_limited','failed','unknown'].includes(state))return Response.json({error:'Invalid notification result'},{status:400});
 const db=(env as any).DB;const result=await db.prepare("UPDATE appointments SET notification_state=?,notification_attempt=NULL WHERE id=? AND user_id=? AND notification_attempt=? AND notification_state='sending'").bind(state,id,uid,attempt).run();
 return Response.json({recorded:result.meta.changes===1},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to record notification result'},{status:503})}
}
