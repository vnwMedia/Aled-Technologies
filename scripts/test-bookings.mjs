import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8766';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Integration tests must run against local storage only.');
const run=crypto.randomUUID(),uid='test-'+run,other='other-'+run,date='2027-03-02',created=[];
async function request(method,path='',body,actor=uid,origin=base){const r=await fetch(base+'/api/appointments'+path,{method,headers:{...(actor?{'oai-authenticated-user-id':actor}:{}),'Content-Type':'application/json',Origin:origin},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
const booking=(slot,apt=String(9000+slot))=>({date,slot,name:'Integration Resident',apartment:apt,units:2,email:'resident@example.com',phone:'2015550123',requestKey:crypto.randomUUID()});
try{
 assert.equal((await request('GET','',undefined,null)).status,401);
 assert.equal((await request('POST','',booking(0),uid,'https://untrusted.example')).status,403);
 assert.equal((await request('POST','',{...booking(0),date:'2026-11-01'})).status,400);
 assert.equal((await request('POST','',{...booking(0),date:'2027-02-30'})).status,400);
 assert.equal((await request('POST','',{...booking(0),units:1.5})).status,400);
 assert.equal((await request('POST','',{...booking(0),slot:10})).status,400);
 const first={...booking(0),name:'<sample resident>'};let r=await request('POST','',first);assert.equal(r.status,201);created.push(r.body.id);assert.equal(r.body.appointments[0].day_count,1);assert.equal(r.body.appointments[0].notification_state,'not_configured');
 const receipt=await fetch(base+'/thank-you?id='+r.body.id,{headers:{'oai-authenticated-user-id':uid}});assert.equal(receipt.status,200);const html=await receipt.text();assert.ok(html.includes('Thank you. Your request is saved.'));assert.ok(html.includes('&lt;sample resident&gt;'));assert.ok(!html.includes('<sample resident>'));assert.equal((await fetch(base+'/thank-you?id='+r.body.id,{headers:{'oai-authenticated-user-id':other}})).status,404);assert.equal((await fetch(base+'/thank-you?id='+r.body.id)).status,401);
 r=await request('POST','',first);assert.equal(r.status,200);assert.equal(r.body.id,created[0]);
 assert.equal((await request('POST','',booking(1,'9000'))).status,409);
 const competing=await Promise.all([request('POST','',booking(1,'A-9001')),request('POST','',booking(1,'A9002'))]);assert.deepEqual(competing.map(x=>x.status).sort(),[201,409]);created.push(competing.find(x=>x.status===201).body.id);
 for(let slot=2;slot<10;slot++){r=await request('POST','',booking(slot));assert.equal(r.status,201);created.push(r.body.id);if(slot===4)assert.equal(r.body.appointments.every(a=>a.day_count>=5),true)}
 assert.equal((await request('GET','?date='+date)).body.count,10);
 assert.equal((await request('POST','',booking(0,'9999'))).status,409);
 assert.equal((await request('GET','',undefined,other)).body.appointments.length,0);
 assert.equal((await request('DELETE','',{id:created[0]},other)).status,404);
 for(const id of created.slice(0,6)){assert.equal((await request('DELETE','',{id})).status,200)}
 r=await request('GET');assert.equal(r.body.appointments.filter(a=>!a.canceled_at).every(a=>a.day_count===4),true);
 r=await request('POST','',booking(0));assert.equal(r.status,201);created.push(r.body.id);
 console.log('PASS: validation, authentication, origin checks, idempotency, duplicate apartments, concurrent booking, 10-slot capacity, five-apartment threshold, account isolation, cancellation, reopened slots, protected thank-you receipt and HTML escaping.');
}finally{for(const id of created)await request('DELETE','',{id});}
