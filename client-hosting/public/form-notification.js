// Standard FormSubmit POST is required for resident autoresponses.
// Keep the provider spam check enabled. It redirects to our receipt afterward.
window.sendFormNotification=async(notification,nextUrl)=>{
 if(!notification)return false;
 const next=new URL(nextUrl,window.location.href);
 if(next.origin!==window.location.origin)throw Error('Invalid receipt URL.');
 const form=document.createElement('form');form.method='POST';form.action=notification.endpoint;form.hidden=true;
 const payload={...notification.payload,_next:next.href};
 for(const [name,value] of Object.entries(payload)){const field=document.createElement('input');field.type='hidden';field.name=name;field.value=String(value);form.append(field)}
 document.body.append(form);
 // This records handoff, not delivery. Only the provider can verify email delivery.
 if(notification.id&&notification.attempt){try{await window.aledApiFetch('/api/notification-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:notification.id,attempt:notification.attempt,state:'submitted'}),signal:AbortSignal.timeout(5000)})}catch{}}
 form.submit();return true;
};
