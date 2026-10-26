<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$method=$_SERVER['REQUEST_METHOD'];
$origin=$_SERVER['HTTP_ORIGIN']??'';
if($method!=='GET'&&$origin!=='https://99hudsoncondos.aled.tech'){http_response_code(403);echo json_encode(['error'=>'Invalid request origin.']);exit;}
$auth=$_SERVER['HTTP_AUTHORIZATION']??($_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'');
if(!preg_match('/^Bearer ([a-f0-9]{64})$/D',$auth,$m)){http_response_code(401);echo json_encode(['error'=>'Browser session required.']);exit;}
$raw=file_get_contents('php://input',false,null,0,8193);
if(strlen($raw)>8192){http_response_code(413);echo json_encode(['error'=>'Request too large.']);exit;}
$body=$raw===''?[]:json_decode($raw,true);
if(!is_array($body)){http_response_code(400);echo json_encode(['error'=>'Invalid request.']);exit;}
try{
 require dirname(__DIR__,2).'/99hudson-private/portal.php';
 $body['_source_key']=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown');
 [$status,$value]=portal_handle(portal_db(),'browser:'.hash('sha256',$m[1]),$method,($_GET['action']??'')==='notification'?'notification':'bookings',$_GET['date']??null,$body);
 http_response_code($status);echo json_encode($value,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
 if($status===201&&empty($value['notification'])){try{hudson_mail_kick(hudson_mail_config());}catch(Throwable $ignored){error_log('99 Hudson email wake-up deferred to scheduled worker.');}}
}catch(Throwable $e){error_log('99 Hudson portal error: '.$e->getMessage());http_response_code(503);echo json_encode(['error'=>'Your request could not be completed. Please try again.']);}
