// FormSubmit's documented browser AJAX integration. A submission is attempted once;
// rate limits and uncertain results are never automatically replayed.
window.sendFormNotification=async function(notification){
 if(!notification)return 'not_configured';
 let state='unknown';
 try{
  const response=await fetch(notification.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},signal:AbortSignal.timeout(12000),body:JSON.stringify(notification.payload)});
  let body;try{body=await response.json()}catch{body=null}
  const message=typeof body?.message==='string'?body.message:'';
  if(response.status===429)state='rate_limited';
  else if(/needs activation|activate form|activation required/i.test(message))state='activation_required';
  else if(body)state=response.ok&&(body.success===true||body.success==='true')?'accepted':'failed';
 }catch{state='unknown'}
 if(notification.id&&notification.attempt){
  try{await window.aledApiFetch('/api/pages-notification-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:notification.id,attempt:notification.attempt,state})})}catch{}
 }
 return state;
};
