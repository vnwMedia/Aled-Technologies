<?php
declare(strict_types=1);
// Loaded from outside the subdomain's document root. No credentials are required.
function portal_db(?string $path=null): SQLite3 {
    umask(0077);
    $db = new SQLite3($path ?? __DIR__ . '/appointments.sqlite');
    $db->enableExceptions(true);
    $db->busyTimeout(10000);
    $db->exec('PRAGMA journal_mode=WAL');
    $db->exec('CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL,request_key TEXT NOT NULL,date TEXT NOT NULL,
      slot INTEGER NOT NULL,start_minutes INTEGER,end_minutes INTEGER,capacity_position INTEGER DEFAULT 0,
      name TEXT NOT NULL,apartment TEXT NOT NULL,apartment_key TEXT NOT NULL,units INTEGER NOT NULL,
      email TEXT NOT NULL,phone TEXT NOT NULL,comments TEXT,created_at TEXT NOT NULL,canceled_at TEXT,
      notification_state TEXT DEFAULT "pending",notification_attempt TEXT,
      UNIQUE(user_id,request_key))');
    $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS active_unit ON appointments(date,apartment_key) WHERE canceled_at IS NULL');
    return $db;
}
function query(SQLite3 $db,string $sql,array $args=[]): SQLite3Result {
    $s=$db->prepare($sql);
    foreach(array_values($args) as $i=>$v)$s->bindValue($i+1,$v,is_int($v)?SQLITE3_INTEGER:($v===null?SQLITE3_NULL:SQLITE3_TEXT));
    return $s->execute();
}
function rows(SQLite3Result $r): array {$out=[];while($a=$r->fetchArray(SQLITE3_ASSOC))$out[]=$a;return $out;}
function own(SQLite3 $db,string $uid): array {
    return rows(query($db,'SELECT a.id,a.date,a.slot,COALESCE(a.start_minutes,510+a.slot*30) AS start_minutes,a.end_minutes,a.name,a.apartment,a.units,a.email,a.phone,a.comments,a.canceled_at,a.notification_state,(SELECT COUNT(*) FROM appointments b WHERE b.date=a.date AND b.canceled_at IS NULL) AS day_count FROM appointments a WHERE user_id=? ORDER BY created_at DESC LIMIT 100',[$uid]));
}
function valid_date($v): bool {
    if(!is_string($v)||!preg_match('/^2026-11-\d{2}$/D',$v)||$v<'2026-11-02'||$v>'2026-11-30')return false;
    $d=DateTimeImmutable::createFromFormat('!Y-m-d',$v,new DateTimeZone('America/New_York'));
    return $d&&$d->format('Y-m-d')===$v&&(int)$d->format('N')<=5&&$v>=(new DateTimeImmutable('now',new DateTimeZone('America/New_York')))->format('Y-m-d');
}
function uuid(): string {$h=bin2hex(random_bytes(16));return substr($h,0,8).'-'.substr($h,8,4).'-4'.substr($h,13,3).'-'.dechex((hexdec($h[16])&3)|8).substr($h,17,3).'-'.substr($h,20);}
function time_text(int $m): string {$h=intdiv($m,60);return ($h%12?:12).':'.str_pad((string)($m%60),2,'0',STR_PAD_LEFT).' '.($h<12?'AM':'PM');}
function notification(array $a): array {
    $d=(new DateTimeImmutable($a['date']))->format('l, F j, Y');
    return ['id'=>$a['id'],'attempt'=>$a['notification_attempt'],'endpoint'=>'https://formsubmit.co/dispatch%40aledtechnologies.com','payload'=>[
      'name'=>$a['name'],'email'=>$a['email'],'Unit Number'=>$a['apartment'],
      'Number of Heat Pumps (HVACs) in Your Unit'=>(string)$a['units'],'Phone Number'=>$a['phone'],
      'Requested Date'=>$d,'Requested Time'=>time_text((int)$a['start_minutes']).' – '.time_text((int)$a['end_minutes']).' Eastern Time',
      'Request Reference'=>$a['id'],'Additional Comments'=>$a['comments']?:'None provided',
      'Appointment Status'=>'Appointment requested; confirmation requires at least 5 units scheduled for the same day. Check the portal for current status.',
      '_autoresponse'=>'Thank you for requesting maintenance at 99 Hudson Condominiums. Your request details are included below. Appointments are only confirmed once at least 5 units are scheduled for the same day. This email acknowledges receipt and does not confirm the appointment. Please keep your request reference and check the booking portal for current status.',
      '_subject'=>'ALED 99 Hudson – Maintenance request – Unit '.$a['apartment'],'_template'=>'table','_replyto'=>$a['email'],'_url'=>'https://99hudsoncondos.aled.tech/']];
}
function text_length(string $s): int {return preg_match_all('/./us',$s) ?: strlen($s);}
function validate_booking(array $b): ?string {
    if(!valid_date($b['date']??null))return 'Choose a weekday in November 2026, from November 2 through November 30, that is not in the past.';
    if(!is_int($b['slot']??null)||$b['slot']<0||$b['slot']>3)return 'Choose one of the 4 appointment windows.';
    foreach(['name','apartment','email','phone','requestKey'] as $key)if(!is_string($b[$key]??null))return 'Please complete all required fields.';
    if(text_length(trim($b['name']))<2||text_length($b['name'])>120)return 'Enter your full name (2–120 characters).';
    if(!preg_match('/^[a-zA-Z0-9 -]{1,20}$/D',trim($b['apartment']))||!preg_replace('/[^A-Z0-9]/','',strtoupper($b['apartment'])))return 'Enter a valid unit number.';
    if(!is_int($b['units']??null)||$b['units']<1||$b['units']>100)return 'Number of Heat Pumps (HVACs) in Your Unit must be a whole number from 1 to 100.';
    if(strlen($b['email'])>254||!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/D',trim($b['email'])))return 'Enter a valid email address.';
    $n=strlen(preg_replace('/\D/','',$b['phone']));if(strlen($b['phone'])>40||$n<10||$n>15)return 'Enter a valid phone number.';
    if(isset($b['comments'])&&(!is_string($b['comments'])||text_length($b['comments'])>2000))return 'Additional comments must be 2,000 characters or fewer.';
    if(!preg_match('/^[\w-]{16,64}$/D',$b['requestKey']))return 'Invalid request identifier. Please refresh and try again.';
    return null;
}
function portal_handle(SQLite3 $db,string $uid,string $method,string $action,?string $date,array $b): array {
    if($action==='notification'){
        if($method!=='POST')return [405,['error'=>'Method not allowed.']];
        if(!is_string($b['id']??null)||strlen($b['id'])>64||!is_string($b['attempt']??null)||strlen($b['attempt'])>64||!in_array($b['state']??null,['submitted','accepted','activation_required','rate_limited','failed','unknown'],true))return [400,['error'=>'Invalid notification result.']];
        query($db,"UPDATE appointments SET notification_state=?,notification_attempt=NULL WHERE id=? AND user_id=? AND notification_attempt=? AND notification_state='sending'",[$b['state'],$b['id'],$uid,$b['attempt']]);
        return [200,['recorded'=>$db->changes()===1]];
    }
    if($method==='GET'){
        if($date!==null){if(!valid_date($date))return [400,['error'=>'Choose a valid appointment date.']];
            $r=rows(query($db,'SELECT COALESCE(start_minutes,510+slot*30) AS m FROM appointments WHERE date=? AND canceled_at IS NULL',[$date]));$counts=[];$occupied=[];
            foreach([480,600,720,840] as $i=>$m){$counts[$i]=count(array_filter($r,fn($a)=>$a['m']>=$m&&$a['m']<$m+120));if($counts[$i]>=3)$occupied[]=$i;}
            return [200,['occupied'=>$occupied,'booking_counts'=>$counts,'count'=>count($r)]];}
        return [200,['appointments'=>own($db,$uid)]];
    }
    if($method==='DELETE'){
        if(!is_string($b['id']??null)||strlen($b['id'])>64)return [400,['error'=>'Invalid appointment.']];
        if(!query($db,'SELECT id FROM appointments WHERE id=? AND user_id=?',[$b['id'],$uid])->fetchArray(SQLITE3_ASSOC))return [404,['error'=>'Appointment not found.']];
        query($db,'UPDATE appointments SET canceled_at=? WHERE id=? AND user_id=? AND canceled_at IS NULL',[gmdate('c'),$b['id'],$uid]);return [200,['appointments'=>own($db,$uid)]];
    }
    if($method!=='POST')return [405,['error'=>'Method not allowed.']];
    if($error=validate_booking($b))return [400,['error'=>$error]];
    $db->exec('BEGIN IMMEDIATE');
    try{
        $prior=query($db,'SELECT id FROM appointments WHERE user_id=? AND request_key=?',[$uid,$b['requestKey']])->fetchArray(SQLITE3_ASSOC);
        if($prior){$db->exec('COMMIT');return [200,['id'=>$prior['id'],'appointments'=>own($db,$uid)]];}
        $active=rows(query($db,'SELECT apartment_key,COALESCE(start_minutes,510+slot*30) AS m FROM appointments WHERE date=? AND canceled_at IS NULL',[$b['date']]));
        $key=preg_replace('/[^A-Z0-9]/','',strtoupper($b['apartment']));$start=[480,600,720,840][$b['slot']];
        if(array_filter($active,fn($a)=>$a['apartment_key']===$key)){$db->exec('ROLLBACK');return [409,['error'=>'That time or unit already has a request for this day. Select another time or review your appointments.']];}
        if(count($active)>=12||count(array_filter($active,fn($a)=>$a['m']>=$start&&$a['m']<$start+120))>=3){$db->exec('ROLLBACK');return [409,['error'=>'That appointment window is no longer available. Choose another window or day.']];}
        $id=uuid();$attempt=uuid();
        query($db,"INSERT INTO appointments(id,user_id,request_key,date,slot,start_minutes,end_minutes,name,apartment,apartment_key,units,email,phone,comments,created_at,notification_state,notification_attempt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'sending',?)",[$id,$uid,$b['requestKey'],$b['date'],$b['slot'],$start,$start+120,trim($b['name']),trim($b['apartment']),$key,$b['units'],trim($b['email']),trim($b['phone']),trim($b['comments']??''),gmdate('c'),$attempt]);
        $db->exec('COMMIT');
        $a=query($db,'SELECT * FROM appointments WHERE id=?',[$id])->fetchArray(SQLITE3_ASSOC);
        return [201,['id'=>$id,'notification'=>notification($a),'appointments'=>own($db,$uid)]];
    }catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
}
