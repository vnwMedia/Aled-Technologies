import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8766';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local tests only');
const origin='http://127.0.0.1:8770',a=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),b=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
let id;
async function call(method,path='',body,token=a,from=origin){const r=await fetch(base+'/api/pages-bookings'+path,{method,headers:{Origin:from,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {r,data:r.status===204?null:await r.json()}}
try{
 assert.equal((await call('GET','',undefined,a,'https://untrusted.example')).r.status,403);
 assert.equal((await call('GET','',undefined,null)).r.status,401);
 const pre=await call('OPTIONS');assert.equal(pre.r.status,204);assert.equal(pre.r.headers.get('Access-Control-Allow-Origin'),origin);
 const created=await call('POST','',{date:'2027-07-06',slot:3,name:'Pages Local Test',apartment:'PAGES1',units:1,email:'sample@example.com',phone:'2015550123',requestKey:crypto.randomUUID()});assert.equal(created.r.status,201);id=created.data.id;assert.equal(created.data.appointments[0].start_minutes,840);
 assert.equal((await call('GET')).data.appointments.some(x=>x.id===id),true);assert.equal((await call('GET','',undefined,b)).data.appointments.length,0);
 assert.equal((await call('DELETE','',{id},b)).r.status,404);
 const forged=await fetch(base+'/api/appointments',{headers:{'oai-authenticated-user-id':'not-a-pages-session'}});assert.equal((await forged.json()).appointments.some(x=>x.id===id),false);
 assert.equal((await call('DELETE','',{id})).r.status,200);
 console.log('PASS: approved-origin CORS, missing-token rejection, preflight, shared booking creation, 2:00–4:00 PM persistence, browser-session isolation and cancellation.');
}finally{if(id)await call('DELETE','',{id})}
