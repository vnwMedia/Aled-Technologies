import * as appointments from '../appointments/route';
import {pagesRequest,withCors} from '../../pages-access';
export const dynamic='force-dynamic';
async function handle(req:Request){const adapted=await pagesRequest(req,'/api/appointments');if(adapted.error)return adapted.error;const handler={GET:appointments.GET,POST:appointments.POST,DELETE:appointments.DELETE}[req.method as 'GET'|'POST'|'DELETE'];if(!handler)return withCors(new Response('Method not allowed',{status:405}),adapted.origin!);return withCors(await handler(adapted.request!),adapted.origin!)}
export {handle as GET,handle as POST,handle as DELETE,handle as OPTIONS};
