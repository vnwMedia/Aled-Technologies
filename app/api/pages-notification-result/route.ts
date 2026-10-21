import {POST as recordResult} from '../notification-result/route';
import {pagesRequest,withCors} from '../../pages-access';
export const dynamic='force-dynamic';
async function handle(req:Request){const adapted=await pagesRequest(req,'/api/notification-result');if(adapted.error)return adapted.error;if(req.method!=='POST')return withCors(new Response('Method not allowed',{status:405}),adapted.origin!);return withCors(await recordResult(adapted.request!),adapted.origin!)}
export {handle as POST,handle as OPTIONS};
