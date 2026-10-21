import { appointmentTime } from './booking-domain';
type MailEnv={FORM_NOTIFICATION_TO?:string;FORM_EMAIL_ENABLED?:string};
export type NotificationState='accepted'|'activation_required'|'rate_limited'|'failed'|'unknown'|'not_configured';
export function notificationResult(ok:boolean,body:any,status=200):NotificationState{
 if(status===429)return 'rate_limited';
 const message=typeof body?.message==='string'?body.message:'';
 if(/needs activation|activate form|activation required/i.test(message))return 'activation_required';
 return ok&&(body?.success===true||body?.success==='true')?'accepted':'failed';
}
export function createFormNotification(config:MailEnv,appointment:any,origin:string){
 const to=config.FORM_NOTIFICATION_TO;
 if(config.FORM_EMAIL_ENABLED!=='true'||!to||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))return null;
 const date=new Date(appointment.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 return {endpoint:'https://formsubmit.co/ajax/'+encodeURIComponent(to),payload:{
 name:appointment.name,email:appointment.email,'Apartment Number':appointment.apartment,'Number of Units':String(appointment.units),'Phone Number':appointment.phone,'Requested Date':date,'Requested Time':appointmentTime(appointment)+' Eastern Time','Request Reference':appointment.id,
 'Appointment Status':'Appointment requested; confirmation requires at least 5 apartments scheduled for the same day. Check the portal for current status.',
 _subject:'ALED 99 Hudson – Maintenance request – Apartment '+appointment.apartment,_template:'table',_replyto:appointment.email,_url:origin+'/'}};
}
export async function prepareNotification(db:any,config:MailEnv,id:string,uid:string,origin:string){
 const appointment=await db.prepare('SELECT * FROM appointments WHERE id=? AND user_id=?').bind(id,uid).first();
 if(!appointment)return null;
 const notification=createFormNotification(config,appointment,origin);
 if(!notification){await db.prepare("UPDATE appointments SET notification_state='not_configured' WHERE id=? AND user_id=? AND notification_state='pending'").bind(id,uid).run();return null}
 const attempt=crypto.randomUUID();
 const claim=await db.prepare("UPDATE appointments SET notification_state='sending', notification_attempt=? WHERE id=? AND user_id=? AND notification_state='pending'").bind(attempt,id,uid).run();
 if(claim.meta.changes!==1)return null;
 return {...notification,id,attempt};
}
