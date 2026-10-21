import { TIMES } from './booking-domain';
type MailEnv={FORM_NOTIFICATION_TO?:string;FORM_EMAIL_ENABLED?:string};
export type NotificationState='accepted'|'activation_required'|'failed'|'unknown'|'not_configured';
export function notificationResult(ok:boolean,body:any):NotificationState{
 const message=typeof body?.message==='string'?body.message:'';
 if(/needs activation|activate form|activation required/i.test(message))return 'activation_required';
 return ok&&(body?.success===true||body?.success==='true')?'accepted':'failed';
}
export async function sendFormEmail(config:MailEnv,appointment:any,origin:string,transport:typeof fetch=fetch):Promise<NotificationState>{
 const to=config.FORM_NOTIFICATION_TO;
 if(config.FORM_EMAIL_ENABLED!=='true'||!to||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))return 'not_configured';
 const formatted=new Date(appointment.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 try{
 const response=await transport('https://formsubmit.co/ajax/'+encodeURIComponent(to),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Origin':origin,'Referer':origin+'/'},signal:AbortSignal.timeout(10000),body:JSON.stringify({
 name:appointment.name,email:appointment.email,
 'Apartment Number':appointment.apartment,'Number of Units':String(appointment.units),
 'Phone Number':appointment.phone,'Requested Date':formatted,'Requested Time':TIMES[appointment.slot]+' Eastern Time',
 'Request Reference':appointment.id,
 'Appointment Status':'Appointment requested; confirmation requires at least 5 apartments scheduled for the same day. Check the portal for current status.',
 _subject:'ALED 99 Hudson – Maintenance request – Apartment '+appointment.apartment,
 _template:'table',_replyto:appointment.email,_url:origin+'/'
 })});
 let body;try{body=await response.json()}catch{return 'unknown'}
 return notificationResult(response.ok,body);
 }catch{return 'unknown'}
}
export async function notifyAppointment(db:any,config:MailEnv,id:string,origin:string){
 // A conditional claim ensures retries and competing requests cannot send twice.
 // Provider timeouts are ambiguous: do not automatically resend an uncertain email.
 try{
 const claim=await db.prepare("UPDATE appointments SET notification_state='sending' WHERE id=? AND notification_state='pending'").bind(id).run();
 if(claim.meta.changes!==1)return;
 const appointment=await db.prepare('SELECT * FROM appointments WHERE id=?').bind(id).first();
 if(!appointment)return;
 const state=await sendFormEmail(config,appointment,origin);
 await db.prepare('UPDATE appointments SET notification_state=? WHERE id=?').bind(state,id).run();
 }catch{
 // Email failures must never hide a successfully saved appointment from the resident.
 try{await db.prepare("UPDATE appointments SET notification_state='unknown' WHERE id=? AND notification_state IN ('pending','sending')").bind(id).run()}catch{}
 }
}
