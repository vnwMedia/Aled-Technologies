from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
out=root/'client-hosting/public'
for name in ['index.html','thank-you.html','booking.js','form-notification.js','receipt.js','aled-logo.png']:
    shutil.copyfile(root/'docs'/name,out/name)
config=(root/'docs/pages-config.js').read_text()
config=config[config.index('window.aledSessionToken'):]
config=config.replace("return fetch(window.ALED_BACKEND_ORIGIN+path,", "const endpoint=path.startsWith('/api/pages-notification-result')?'api/index.php?action=notification':'api/index.php'+path.replace('/api/pages-bookings','');return fetch(endpoint,")
(out/'portal-config.js').write_text(config)
for name in ['index.html','thank-you.html']:
    p=out/name;p.write_text(p.read_text().replace('pages-config.js','portal-config.js'))
for p in out.glob('*.js'):
    p.write_text(p.read_text().replace('/api/pages-bookings','/api/bookings').replace('/api/pages-notification-result','/api/notification-result'))
print('Built standalone client hosting files. No external booking backend required.')
