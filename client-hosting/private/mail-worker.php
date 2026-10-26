<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/portal.php';
$config=hudson_mail_config();
if(!$config){fwrite(STDERR,"Email sender is not enabled.\n");exit(1);}
$lock=fopen(__DIR__.'/mail-worker.lock','c');
if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit;
try{echo json_encode(hudson_mail_run(portal_db(),$config))."\n";}catch(Throwable $e){error_log('99 Hudson mail worker failed: '.$e->getMessage());exit(1);}finally{flock($lock,LOCK_UN);fclose($lock);}
