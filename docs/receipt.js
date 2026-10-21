(async()=>{
 const box=document.getElementById('receipt'),id=new URLSearchParams(location.search).get('id');
 const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
 function back(){const a=el('a','View or manage your appointments →');a.href='./#my-bookings';a.className='submit';a.style.cssText='display:block;text-align:center;text-decoration:none;margin-top:25px';return a}
 try{
 if(!id)throw Error('No request selected. Submit the form to see your receipt here.');
 const response=await window.aledApiFetch('/api/pages-bookings');const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load your request.');
 const a=data.appointments.find(x=>x.id===id);if(!a)throw Error('This request was not found in your browser session. Please use the browser where you submitted it.');
 const minutes=a.start_minutes??510+a.slot*30,h=Math.floor(minutes/60),time=`${h%12||12}:${String(minutes%60).padStart(2,'0')} ${h<12?'AM':'PM'}`;
 const date=new Date(a.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 const state=a.canceled_at?'Canceled':a.day_count>=5?'Confirmed':'Pending daily minimum';
 box.replaceChildren(el('h2',a.canceled_at?'This request has been canceled':'Thank you. Your request is saved.'),el('p',date+' · '+time+' ET'),el('p','Status: '+state));
 const list=el('dl','');list.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px 20px';for(const [label,value] of [['Name',a.name],['Apartment',a.apartment],['Number of units',a.units],['Reference',a.id.slice(0,8).toUpperCase()]]){const dd=el('dd',String(value));dd.style.margin='0';list.append(el('dt',label),dd)}box.append(list);if(a.comments){const comment=el('p',a.comments);comment.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';box.append(el('h3','Additional comments'),comment)}
 const mail={submitted:'Your request was saved and handed to the email service, which sends a notification to contactus@vnwmedia.com and a receipt to your email address after its spam check. Check your inbox and spam folder. Delivery is not verified here.',accepted:'A notification was submitted to the email service for contactus@vnwmedia.com. Inbox delivery is not yet verified.',activation_required:'Your request is saved. Email delivery is awaiting inbox activation by the site team.',rate_limited:'Your request is saved. The email service is temporarily busy and did not accept its notification.',failed:'Your request is saved, but its email notification could not be sent.',unknown:'Your request is saved. Email acceptance could not be verified; please avoid submitting your appointment again.',not_configured:'Your request is saved. Email notifications are not configured.',sending:'Your request is saved. Email notification status could not yet be verified.',pending:'Your request is saved. Its email notification is pending.'};
 box.append(el('p',mail[a.notification_state]||'Your request is saved.'),el('p',a.canceled_at?'Canceled requests do not count toward the daily minimum.':a.day_count>=5?'The minimum of five apartments has been met.':`${Math.max(0,5-a.day_count)} more apartment(s) are needed to confirm this day.`),back());
 }catch(error){box.replaceChildren(el('h2','Check your request'),el('p',error.message),back())}
})();
