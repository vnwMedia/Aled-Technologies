from pathlib import Path
import json, shutil
root=Path(__file__).resolve().parent.parent
out=root/'docs';out.mkdir(exist_ok=True)
html=json.loads((root/'app/site-html.ts').read_text()[len('export default '):].strip().removesuffix(';'))
html=html.replace('made with this signed-in account.','made in this browser. Keep your browser data to manage them here.')
html=html.replace('<script src="/form-notification.js" defer></script>','<script src="pages-config.js" defer></script><script src="form-notification.js" defer></script>').replace('<script src="/booking.js?v=calendar-1" defer></script>','<script src="booking.js?v=calendar-1" defer></script>')
html=html.replace('src="/aled-logo.png"','src="aled-logo.png"')
shutil.copyfile(root/'public/aled-logo.png',out/'aled-logo.png')
(out/'index.html').write_text(html)
(out/'.nojekyll').write_text('')
config='''window.ALED_BACKEND_ORIGIN='https://aled-99-hudson-maintenance.vnwmedia.chatgpt.site';
window.aledSessionToken=function(){const key='aled-hudson-session-v1';let token=localStorage.getItem(key);if(!/^[a-f0-9]{64}$/.test(token||'')){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,token)}return token};
window.aledApiFetch=async function(path,options={}){let token;try{token=window.aledSessionToken()}catch{throw new Error('Browser storage is unavailable. Please allow website storage to manage your appointments.')}return fetch(window.ALED_BACKEND_ORIGIN+path,{...options,headers:{...options.headers,Authorization:'Bearer '+token}})};
'''
(out/'pages-config.js').write_text(config)
booking=(root/'public/booking.js').read_text().replace("fetch('/api/appointments'+path,options)","window.aledApiFetch('/api/pages-bookings'+path,options)").replace("const receipt='/thank-you?id='","const receipt='thank-you.html?id='")
(out/'booking.js').write_text(booking)
notify=(root/'public/form-notification.js').read_text().replace("fetch('/api/notification-result',","window.aledApiFetch('/api/pages-notification-result',")
(out/'form-notification.js').write_text(notify)
head=html[:html.index('<main class="wrap">')].replace('<title>99 Hudson Condominiums – Heat Pump Preventive Maintenance</title>','<title>Thank you | ALED Technologies</title>').replace('<h1>99 Hudson Condominiums<br>Heat Pump Preventive Maintenance</h1>','<h1>Your maintenance request</h1>').replace('A little maintenance. A lot of peace of mind.<br>Choose a convenient appointment and leave your details below.','99 Hudson Condominiums<br>Review your request details and manage your appointment below.')
tail=html[html.index('<div class="notice">'):html.index('<script')]
receipt=head+'<main style="max-width:1120px;margin:40px auto 56px;padding:0 24px"><section id="receipt" class="panel" style="max-width:760px;margin:auto" aria-live="polite">Loading your request…</section></main>'+tail+'<script src="pages-config.js"></script><script src="receipt.js"></script></body></html>'
(out/'thank-you.html').write_text(receipt)
print('Built GitHub Pages frontend in docs/.')

(out/'receipt.js').write_text((root/'public/pages-receipt.js').read_text())
