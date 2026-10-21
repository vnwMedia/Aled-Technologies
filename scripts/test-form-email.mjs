import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const dataUrl=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const domain=ts.transpileModule(await readFile(new URL('../app/booking-domain.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const source=(await readFile(new URL('../app/form-email.ts',import.meta.url),'utf8')).replace("'./booking-domain'",JSON.stringify(dataUrl(domain)));
const {createFormNotification,notificationResult,prepareNotification}=await import(dataUrl(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText));
const config={FORM_NOTIFICATION_TO:'contactus@vnwmedia.com',FORM_EMAIL_ENABLED:'true'},appointment={name:'Sample Resident',email:'resident@example.com',apartment:'1204',units:2,phone:'2015550123',date:'2026-11-02',slot:0,id:'test-reference'};
assert.equal(createFormNotification({},appointment,'https://example.test'),null);
const notification=createFormNotification(config,appointment,'https://example.test');assert.equal(notification.endpoint,'https://formsubmit.co/ajax/contactus%40vnwmedia.com');assert.equal(notification.payload['Apartment Number'],'1204');assert.equal(notification.payload['Requested Time'],'8:30 AM Eastern Time');assert.equal(notification.payload._replyto,'resident@example.com');assert.equal(createFormNotification(config,{...appointment,slot:4,start_minutes:930},'https://example.test').payload['Requested Time'],'3:30 PM Eastern Time');assert.equal(createFormNotification(config,{...appointment,slot:2},'https://example.test').payload['Requested Time'],'9:30 AM Eastern Time');
assert.equal(notificationResult(true,{success:'true'}),'accepted');assert.equal(notificationResult(false,{success:false},429),'rate_limited');assert.equal(notificationResult(true,{success:'false',message:'This form needs Activation.'}),'activation_required');
assert.equal(await prepareNotification({prepare(){return {bind(){return this},first:async()=>appointment,run:async()=>({meta:{changes:0}})}}},config,'test-reference','test-user','https://example.test'),null);
const browserSource=await readFile(new URL('../public/form-notification.js',import.meta.url),'utf8');
for(const [provider,expected] of [[()=>Response.json({success:'true'}),'accepted'],[()=>Response.json({success:false},{status:429}),'rate_limited'],[()=>Response.json({success:'false',message:'This form needs Activation.'}),'activation_required'],[()=>new Response('bad gateway',{status:502}),'unknown'],[()=>{throw Error('network')},'unknown']]){
 const calls=[];const context=vm.createContext({window:{},AbortSignal,fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return url.startsWith('/api/')?Response.json({recorded:true}):provider()}});vm.runInContext(browserSource,context);
 const state=await context.window.sendFormNotification({...notification,id:'test-id',attempt:'test-attempt'});assert.equal(state,expected);assert.equal(calls.length,2);assert.equal(calls[1].url,'/api/notification-result');assert.equal(calls[1].body.state,expected);assert.equal(calls[1].body.attempt,'test-attempt');
}
console.log('PASS: fixed email recipient and complete payload, one-attempt claim, browser delivery, result reporting, activation, rate limits, invalid provider responses and network failure.');
