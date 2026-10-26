<?php
declare(strict_types=1);
// Keep this file and mail-config.json outside the document root.
function hudson_mail_config(): array {
    $path=__DIR__.'/mail-config.json';
    if(!is_file($path))return [];
    $c=json_decode(file_get_contents($path),true);
    if(!is_array($c)||empty($c['enabled']))return [];
    if(!filter_var($c['from_email']??'',FILTER_VALIDATE_EMAIL))throw new RuntimeException('Email configuration is incomplete.');
    return $c;
}
function hudson_mail_schema(SQLite3 $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS mail_jobs (
      id TEXT PRIMARY KEY,appointment_id TEXT NOT NULL,kind TEXT NOT NULL,
      recipient TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,
      provider_id TEXT,last_error TEXT,updated_at INTEGER NOT NULL,
      UNIQUE(appointment_id,kind))");
}
function hudson_mail_kick(array $config): void {
    if(!function_exists('exec')||empty($config['php_cli']))return;
    $command='nohup '.escapeshellarg($config['php_cli']).' '.escapeshellarg(__DIR__.'/mail-worker.php').' > /dev/null 2>&1 < /dev/null &';
    exec($command);
}
function hudson_mail_rate(SQLite3 $db,string $source): bool {
    $db->exec('CREATE TABLE IF NOT EXISTS mail_submissions(source TEXT NOT NULL,created_at INTEGER NOT NULL)');
    query($db,'DELETE FROM mail_submissions WHERE created_at<?',[time()-3600]);
    $total=(int)query($db,'SELECT COUNT(*) AS n FROM mail_submissions')->fetchArray(SQLITE3_ASSOC)['n'];
    $perSource=(int)query($db,'SELECT COUNT(*) AS n FROM mail_submissions WHERE source=?',[$source])->fetchArray(SQLITE3_ASSOC)['n'];
    if($total>=100||$perSource>=30)return false;
    query($db,'INSERT INTO mail_submissions(source,created_at) VALUES(?,?)',[$source,time()]);return true;
}
function hudson_mail_messages(array $a,array $config): array {
    $date=(new DateTimeImmutable($a['date']))->format('l, F j, Y');
    $time=time_text((int)$a['start_minutes']).' – '.time_text((int)$a['end_minutes']).' Eastern Time';
    $details="Name: {$a['name']}\nUnit: {$a['apartment']}\nNumber of Heat Pumps (HVACs) in Your Unit: {$a['units']}\nEmail: {$a['email']}\nPhone: {$a['phone']}\nRequested date: $date\nRequested time: $time\nReference: {$a['id']}\nAdditional comments: ".($a['comments']?:'None provided');
    $pending="This is a maintenance request, not an appointment confirmation. Appointments will only be confirmed if at least 5 units are scheduled for the same day.";
    $base=['From'=>'ALED Technologies <'.$config['from_email'].'>','MessageStream'=>'outbound','TrackOpens'=>false,'TrackLinks'=>'None','Metadata'=>['appointment_id'=>$a['id']]];
    return [
      'owner'=>array_merge($base,['To'=>'dispatch@aledtechnologies.com','ReplyTo'=>$a['email'],'Subject'=>'ALED 99 Hudson – Maintenance request – Unit '.$a['apartment'],'TextBody'=>"New maintenance request from https://99hudsoncondos.aled.tech/\n\n$details\n\n$pending"]),
      'resident'=>array_merge($base,['To'=>$a['email'],'ReplyTo'=>'dispatch@aledtechnologies.com','Subject'=>'99 Hudson – Your maintenance request has been received','TextBody'=>"Thank you for requesting heat pump preventive maintenance at 99 Hudson Condominiums.\n\n$details\n\n$pending\n\nManage your request using the same browser at https://99hudsoncondos.aled.tech/#my-bookings\n\nPreventive maintenance costs $105 per heat pump, per service, charged by the Association. Please ensure all heat pumps are accessible; technicians cannot move furniture."])
    ];
}
// Called inside the booking transaction: neither email can be lost after saving.
function hudson_mail_enqueue(SQLite3 $db,array $a,array $config): void {
    foreach(hudson_mail_messages($a,$config) as $kind=>$payload){
        query($db,'INSERT OR IGNORE INTO mail_jobs(id,appointment_id,kind,recipient,payload,updated_at) VALUES(?,?,?,?,?,?)',[uuid(),$a['id'],$kind,$payload['To'],json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),time()]);
    }
}
function hudson_mail_send(array $payload,array $config): array {
    $headers=['From'=>$payload['From'],'Reply-To'=>$payload['ReplyTo'],'MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8','Content-Transfer-Encoding'=>'base64','X-Hudson-Request'=>$payload['Metadata']['appointment_id']];
    $subject='=?UTF-8?B?'.base64_encode($payload['Subject']).'?=';
    $ok=mail($payload['To'],$subject,chunk_split(base64_encode($payload['TextBody'])),$headers,'-f'.$config['from_email']);
    return $ok?['state'=>'accepted']:['state'=>'retry','error'=>'Hosting relay did not accept message'];
}
function hudson_mail_run(SQLite3 $db,array $config,?callable $send=null,int $limit=20): array {
    $send=$send??'hudson_mail_send';$summary=[];
    // Interrupted sending attempts require provider-log review, never automatic duplication.
    query($db,"UPDATE mail_jobs SET state='unknown',last_error='Worker interrupted; review provider activity before retrying' WHERE state='sending' AND updated_at<?",[time()-300]);
    for($i=0;$i<$limit;$i++){
        $db->exec('BEGIN IMMEDIATE');
        try{
            $job=query($db,"SELECT * FROM mail_jobs WHERE state IN ('queued','retry') AND next_attempt<=? ORDER BY updated_at,id LIMIT 1",[time()])->fetchArray(SQLITE3_ASSOC);
            if(!$job){$db->exec('COMMIT');break;}
            query($db,"UPDATE mail_jobs SET state='sending',attempts=attempts+1,updated_at=? WHERE id=?",[time(),$job['id']]);$db->exec('COMMIT');
        }catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
        try{$result=$send(json_decode($job['payload'],true,512,JSON_THROW_ON_ERROR),$config);}catch(Throwable $e){$result=['state'=>'unknown','error'=>'Worker exception; review provider activity'];}
        $state=$result['state'];$attempt=(int)$job['attempts']+1;
        if(!in_array($state,['accepted','retry','failed','unknown'],true))$state='unknown';
        if($state==='retry'&&$attempt>=6)$state='failed';
        query($db,'UPDATE mail_jobs SET state=?,provider_id=?,last_error=?,next_attempt=?,updated_at=? WHERE id=?',[$state,$result['provider_id']??null,$result['error']??null,time()+min(3600,60*(2**($attempt-1))),time(),$job['id']]);
        $states=array_column(rows(query($db,'SELECT state FROM mail_jobs WHERE appointment_id=?',[$job['appointment_id']])),'state');
        $overall=count(array_filter($states,fn($s)=>$s==='accepted'))===2?'email_accepted':(count(array_intersect($states,['failed','unknown']))?'email_attention':'email_queued');
        query($db,'UPDATE appointments SET notification_state=? WHERE id=?',[$overall,$job['appointment_id']]);
        $summary[$state]=($summary[$state]??0)+1;
    }
    return $summary;
}
