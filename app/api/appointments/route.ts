import { env } from 'cloudflare:workers';
import { notifyAppointment } from '../../form-email';
import { normalizeApartment, validDate, validateBooking } from '../../booking-domain';
export const dynamic='force-dynamic';
function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
function user(req:Request){return req.headers.get('oai-authenticated-user-id')}
function sameOrigin(req:Request){return req.headers.get('Origin')===new URL(req.url).origin}
function db(){const binding=(env as any).DB;if(!binding)throw new Error('Database unavailable');return binding}
async function list(userId:string){return (await db().prepare(`SELECT a.id,a.date,a.slot,a.name,a.apartment,a.units,a.email,a.phone,a.canceled_at,a.notification_state,
 (SELECT COUNT(*) FROM appointments b WHERE b.date=a.date AND b.canceled_at IS NULL) AS day_count
 FROM appointments a WHERE a.user_id=? ORDER BY a.created_at DESC LIMIT 100`).bind(userId).all()).results}
export async function GET(req:Request){
 if(!user(req))return json({error:'Please sign in to manage appointments.'},401);
 const date=new URL(req.url).searchParams.get('date');
 try{if(date){if(!validDate(date))return json({error:'Choose a valid appointment date.'},400);const r=await db().prepare('SELECT slot FROM appointments WHERE date=? AND canceled_at IS NULL').bind(date).all();return json({occupied:r.results.map((x:any)=>x.slot),count:r.results.length})}
 return json({appointments:await list(user(req)!)});
 }catch{return json({error:'Appointments could not be loaded. Please try again.'},503)}
}
export async function POST(req:Request){
 const uid=user(req);if(!uid)return json({error:'Please sign in to request an appointment.'},401);
 if(!sameOrigin(req))return json({error:'Invalid request origin.'},403);
 let body:any;try{if(Number(req.headers.get('content-length')||0)>8192)return json({error:'Request too large.'},413);const raw=await req.text();if(raw.length>8192)return json({error:'Request too large.'},413);body=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}
 const error=validateBooking(body);if(error)return json({error},400);
 try{
 const existing=await db().prepare('SELECT id FROM appointments WHERE user_id=? AND request_key=?').bind(uid,body.requestKey).first();if(existing)return json({id:existing.id,appointments:await list(uid)});
 const id=crypto.randomUUID();
 await db().prepare('INSERT INTO appointments (id,user_id,request_key,date,slot,name,apartment,apartment_key,units,email,phone,created_at,notification_state) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,uid,body.requestKey,body.date,body.slot,body.name.trim(),body.apartment.trim(),normalizeApartment(body.apartment),body.units,body.email.trim(),body.phone.trim(),new Date().toISOString(),'pending').run();
 await notifyAppointment(db(), env as any, id, new URL(req.url).origin);
 return json({id,appointments:await list(uid)},201);
 }catch(e){if(String(e).includes('UNIQUE constraint failed')){const repeated=await db().prepare('SELECT id FROM appointments WHERE user_id=? AND request_key=?').bind(uid,body.requestKey).first();if(repeated)return json({id:repeated.id,appointments:await list(uid)});return json({error:'That time or apartment already has a request for this day. Select another time or review your appointments.'},409);}return json({error:'Your request could not be saved. Please try again.'},503)}
}
export async function DELETE(req:Request){
 const uid=user(req);if(!uid)return json({error:'Please sign in to manage appointments.'},401);
 if(!sameOrigin(req))return json({error:'Invalid request origin.'},403);
 try{const {id}=await req.json() as {id:string};if(typeof id!=='string'||id.length>64)return json({error:'Invalid appointment.'},400);
 const found=await db().prepare('SELECT id FROM appointments WHERE id=? AND user_id=?').bind(id,uid).first();if(!found)return json({error:'Appointment not found.'},404);
 await db().prepare('UPDATE appointments SET canceled_at=? WHERE id=? AND user_id=? AND canceled_at IS NULL').bind(new Date().toISOString(),id,uid).run();return json({appointments:await list(uid)});
 }catch{return json({error:'Your request could not be canceled. Please try again.'},503)}
}
