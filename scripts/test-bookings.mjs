import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8766';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Integration tests must run against local storage only.');
const run=crypto.randomUUID(),uid='test-'+run,other='other-'+run,date='2026-11-23',created=[];
async function request(method,path='',body,actor=uid,origin=base){const r=await fetch(base+'/api/appointments'+path,{method,headers:{...(actor?{'oai-authenticated-user-id':actor}:{}),'Content-Type':'application/json',Origin:origin},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
const booking=(slot,apt=String(9000+slot))=>({date,slot,name:'Integration Resident',apartment:apt,units:2,email:'resident@example.com',phone:'2015550123',requestKey:crypto.randomUUID()});
try{
 assert.equal((await request('GET','',undefined,null)).status,401);
 assert.equal((await request('POST','',booking(0),uid,'https://untrusted.example')).status,403);
 assert.equal((await request('POST','',{...booking(0),date:'2026-11-01'})).status,400);
 assert.equal((await request('POST','',{...booking(0),date:'2027-02-30'})).status,400);
 assert.equal((await request('POST','',{...booking(0),units:1.5})).status,400);
 assert.equal((await request('POST','',{...booking(0),slot:4})).status,400);
 assert.equal((await request('POST','',{...booking(0),comments:'x'.repeat(2001)})).status,400);
 assert.equal((await request('POST','',{...booking(0),comments:123})).status,400);
 for(const blocked of ['2026-10-30','2026-11-01','2026-11-07','2026-11-08','2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-28','2026-11-29','2026-12-01','2027-11-02'])assert.equal((await request('POST','',{...booking(0),date:blocked})).status,400,blocked);
 const noAuthResult=await fetch(base+'/api/notification-result',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{}'});assert.equal(noAuthResult.status,401);
 const forgedResult=await fetch(base+'/api/notification-result',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'oai-authenticated-user-id':uid},body:JSON.stringify({id:'unowned',attempt:'fake',state:'accepted'})});assert.equal((await forgedResult.json()).recorded,false);
 const first={...booking(0),name:'<sample resident>',comments:'Check bedroom unit.\n<script>alert(1)</script>'};let r=await request('POST','',first);assert.equal(r.status,201);created.push(r.body.id);assert.equal(r.body.appointments[0].start_minutes,480);assert.equal(r.body.appointments[0].day_count,1);assert.equal(r.body.appointments[0].comments,first.comments);assert.equal(r.body.appointments[0].notification_state,'not_configured');
 const receipt=await fetch(base+'/thank-you?id='+r.body.id,{headers:{'oai-authenticated-user-id':uid}});assert.equal(receipt.status,200);const html=await receipt.text();assert.ok(html.includes('Thank you. Your request is saved.'));assert.ok(html.includes('&lt;sample resident&gt;'));assert.ok(!html.includes('<sample resident>'));assert.ok(html.includes('8:00 AM – 10:00 AM'));assert.ok(html.includes('Check bedroom unit.'));assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.equal((await fetch(base+'/thank-you?id='+r.body.id,{headers:{'oai-authenticated-user-id':other}})).status,404);assert.equal((await fetch(base+'/thank-you?id='+r.body.id)).status,401);
 r=await request('POST','',first);assert.equal(r.status,200);assert.equal(r.body.id,created[0]);
 assert.equal((await request('POST','',booking(1,'9000'))).status,409);
 const competing=await Promise.all([request('POST','',booking(0,'A-9001')),request('POST','',booking(0,'A9002')),request('POST','',booking(0,'A9003'))]);assert.deepEqual(competing.map(x=>x.status).sort(),[201,201,409]);created.push(...competing.filter(x=>x.status===201).map(x=>x.body.id));
 for(let slot=1;slot<4;slot++){for(let seat=0;seat<3;seat++){r=await request('POST','',booking(slot,`B${slot}${seat}`));assert.equal(r.status,201);created.push(r.body.id);assert.equal(r.body.appointments.find(a=>a.id===r.body.id).start_minutes,[480,600,720,840][slot]);assert.equal(r.body.appointments.find(a=>a.id===r.body.id).end_minutes,[600,720,840,960][slot]);if(created.length===5)assert.equal(r.body.appointments.every(a=>a.day_count>=5),true)}}
 assert.deepEqual((await request('GET','?date='+date)).body.booking_counts,[3,3,3,3]);
 assert.equal((await request('GET','?date='+date)).body.count,12);
 assert.equal((await request('POST','',booking(0,'9999'))).status,409);
 assert.equal((await request('GET','',undefined,other)).body.appointments.length,0);
 assert.equal((await request('DELETE','',{id:created[0]},other)).status,404);
 for(const id of created.slice(0,8)){assert.equal((await request('DELETE','',{id})).status,200)}
 r=await request('GET');assert.equal(r.body.appointments.filter(a=>!a.canceled_at).every(a=>a.day_count===4),true);
 r=await request('POST','',booking(0));assert.equal(r.status,201);created.push(r.body.id);
 console.log('PASS: validation, authentication, origin checks, idempotency, duplicate apartments, concurrent booking, four two-hour windows with three apartments each, twelve-appointment capacity, five-apartment threshold, account isolation, cancellation, reopened slots, protected thank-you receipt and HTML escaping.');
}finally{for(const id of created)await request('DELETE','',{id});}
