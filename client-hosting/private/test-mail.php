<?php
declare(strict_types=1);
require __DIR__.'/portal.php';
function verify($ok,$message){if(!$ok)throw new RuntimeException($message);}
$config=['enabled'=>true,'from_email'=>'notifications@aled.tech'];
file_put_contents(__DIR__.'/mail-config.json',json_encode($config));chmod(__DIR__.'/mail-config.json',0600);
try{
 $db=portal_db(':memory:');
 $b=['date'=>'2026-11-30','slot'=>3,'name'=>'Queue Test','apartment'=>'QUEUETEST','units'=>1,'email'=>'resident@example.com','phone'=>'2125550100','comments'=>'Private comments','requestKey'=>'queue-test-key-123456'];
 [$status,$saved]=portal_handle($db,'test-owner','POST','bookings',null,$b);
 verify($status===201&&$saved['notification']===null,'server queued booking has no external form handoff');
 verify($saved['appointments'][0]['notification_state']==='email_queued','receipt queue state');
 verify(count(rows(query($db,'SELECT id FROM mail_jobs')))===2,'exactly two email jobs');
 portal_handle($db,'test-owner','POST','bookings',null,$b);
 verify(count(rows(query($db,'SELECT id FROM mail_jobs')))===2,'duplicate submission cannot queue more emails');
 $messages=hudson_mail_messages(query($db,'SELECT * FROM appointments')->fetchArray(SQLITE3_ASSOC),$config);
 verify($messages['owner']['To']==='dispatch@aledtechnologies.com','owner recipient');
 verify($messages['resident']['To']==='resident@example.com','resident recipient');
 verify(strpos($messages['resident']['TextBody'],'Private comments')!==false,'comments preserved');
 $sent=[];
 hudson_mail_run($db,$config,function($payload)use(&$sent){$sent[]=$payload['To'];return $payload['To']==='resident@example.com'?['state'=>'retry','error'=>'Provider rate limit']:['state'=>'accepted','provider_id'=>'test-provider-id'];});
 verify(count($sent)===2,'both messages attempted independently');
 query($db,"UPDATE mail_jobs SET next_attempt=0 WHERE state='retry'");
 hudson_mail_run($db,$config,function($payload)use(&$sent){$sent[]=$payload['To'];return ['state'=>'accepted','provider_id'=>'resident-test-id'];});
 verify(count($sent)===3&&$sent[2]==='resident@example.com','only failed recipient is retried');
 verify(query($db,'SELECT notification_state FROM appointments')->fetchArray(SQLITE3_ASSOC)['notification_state']==='email_accepted','both accepted recorded');
 hudson_mail_run($db,$config,function(){throw new RuntimeException('Unexpected resend');});
 verify(count($sent)===3,'accepted emails never resent');
 echo "PASS: atomic two-message queue, correct recipients, idempotent booking, independent retry, no duplicate accepted messages.\n";
}finally{unlink(__DIR__.'/mail-config.json');}
