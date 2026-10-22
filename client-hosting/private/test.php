<?php
declare(strict_types=1);
require __DIR__.'/portal.php';
$db=portal_db(':memory:');
function check($yes,$message){if(!$yes)throw new RuntimeException($message);}
function sample($n,$slot=0,$date=null){return ['date'=>$date??max('2026-11-02',(new DateTimeImmutable('now',new DateTimeZone('America/New_York')))->format('Y-m-d')),'slot'=>$slot,'name'=>'Sample Resident','apartment'=>'TEST'.$n,'units'=>2,'email'=>'sample@example.com','phone'=>'2125550100','comments'=>"Test comment\nsecond line",'requestKey'=>'test-request-key-'.$n];}
$first=null;
for($i=0;$i<3;$i++){[$s,$r]=portal_handle($db,'owner'.$i,'POST','bookings',null,sample($i));check($s===201,'three bookings per window');if($i===0)$first=$r;}
check(portal_handle($db,'fourth','POST','bookings',null,sample(4))[0]===409,'fourth booking rejected');
check(portal_handle($db,'owner0','POST','bookings',null,sample(0))[0]===200,'idempotency');
check(portal_handle($db,'other','POST','bookings',null,sample(0,1))[0]===409,'duplicate unit across time windows');
check(portal_handle($db,'other','POST','bookings',null,sample(9,0,'2000-01-01'))[0]===400,'weekends disabled');
check(portal_handle($db,'other','POST','bookings',null,sample(9,0,'2000-02-02'))[0]===400,'other months disabled');
check(portal_handle($db,'stranger','DELETE','bookings',null,['id'=>$first['id']])[0]===404,'ownership enforced');
check(count(portal_handle($db,'stranger','GET','bookings',null,[])[1]['appointments'])===0,'private own list');
check(portal_handle($db,'owner0','DELETE','bookings',null,['id'=>$first['id']])[0]===200,'own cancellation');
check(portal_handle($db,'newowner','POST','bookings',null,sample(5))[0]===201,'cancellation releases capacity');
check($first['notification']['payload']['_replyto']==='sample@example.com'&&isset($first['notification']['payload']['_autoresponse']),'owner and resident email handoff');
check(portal_handle($db,'owner0','POST','notification',null,['id'=>$first['id'],'attempt'=>$first['notification']['attempt'],'state'=>'submitted'])[1]['recorded']===true,'notification attempt');
for($slot=1;$slot<4;$slot++)for($i=0;$i<3;$i++)check(portal_handle($db,'owner-'.$slot.'-'.$i,'POST','bookings',null,sample(100+$slot*3+$i,$slot))[0]===201,'all four windows');
check(portal_handle($db,'owner1','GET','bookings',null,[])[1]['appointments'][0]['day_count']===12,'daily count');
echo "PASS: capacity, cancellation, idempotency, date restrictions, ownership, comments and email payload.\n";

check(valid_date('2026-12-01','2026-12-01'),'December activates');
check(!valid_date('2026-12-01','2026-11-30'),'future month blocked');
check(valid_date('2027-01-01','2027-01-01'),'year rollover');
check(!valid_date('2026-12-31','2027-01-01'),'past year blocked');
check(!valid_date('2027-01-02','2027-01-01'),'weekend blocked');
check(!valid_date('2028-02-30','2028-02-01'),'invalid date blocked');
check(valid_date('2028-02-29','2028-02-01'),'leap year weekday');
echo "PASS: month/year rollover, weekends, past dates and leap year.\n";

check(!valid_date('2026-10-22','2026-10-22'),'October blocked before launch');
check(valid_date('2026-11-02','2026-10-22'),'November available before launch');
check(!valid_date('2026-11-01','2026-10-22'),'November 1 Sunday blocked');
check(!valid_date('2026-11-02','2026-12-01'),'November closed in December');
echo "PASS: November start, October blocked and later-month rollover.\n";
