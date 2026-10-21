# ALED Technologies · 99 Hudson maintenance

A working resident maintenance scheduling prototype. The contact bar, logo, hero, content, confirmation notice, and footer use one shared 1120px container with 24px gutters.

## Features

- Five time choices with two apartments per time (ten appointments total) every day from November 2, 2026, at 8:30, 9:00, 9:30, 10:00, and 10:30 AM Eastern.
- Thirty-minute start intervals are a prototype assumption pending client confirmation.
- Required name, apartment number, number of units, email, and phone fields.
- Shared Cloudflare D1 storage, server validation, atomic capacity enforcement (maximum two apartments per start time), one active request per apartment per day, and retry-safe submissions.
- Account-scoped appointment history and cancellation; canceled slots become available again.
- Daily status is calculated from active, distinct apartment requests: fewer than five is pending; five or more is confirmed. Cancellation can return a day to pending.
- Calendar downloads reflect the status at download time. Their 30-minute end time is a placeholder; downloaded calendar events do not auto-update after changes.
- New submissions use FormSubmit’s documented browser AJAX integration to send a sample notification to `contactus@vnwmedia.com` using FormSubmit. The recipient completed inbox activation and confirmed receipt of a sample test. Reply-To uses the submitted email; no automatic email is sent to the resident.
- After a successful save, the form redirects to an authenticated `/thank-you?id=…` receipt with appointment details and notification status. Email failures do not discard the booking.
- Notification attempts use an atomic database claim to avoid duplicate sends. A one-use attempt token and the signed-in account protect result reporting. Timeouts and rate limits are recorded without automatic replay; email failures do not remove saved appointments.

## Run locally

Requires Node.js >=22.13.0 and npm.

```sh
npm run install:ci
npm run db:generate # only after changing db/schema.ts
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_organic_the_captain.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_overrated_lady_ursula.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_amused_romulus.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_opposite_leopardon.sql
npm run dev
```

Run the migration only once per fresh local database. Open the displayed loopback URL and visit `/signin-with-chatgpt?return_to=/` for the starter's local test identity. Hosted access uses the Sites platform's sign-in gate and trusted identity headers.

## Verify

```sh
npm start -- --port 8766
# In another terminal:
node scripts/test-bookings.mjs
node scripts/test-form-email.mjs
```

The integration test refuses non-loopback targets. It checks validation, authentication, same-origin writes, retry safety, duplicate apartments, simultaneous booking conflicts, ten-slot capacity, the five-apartment threshold, account isolation, cancellation, and reopened slots. Test records are canceled in a finally block and stay in local storage only.

## Deployment

The existing private Site is declared in `.openai/hosting.json`. Deploy through Sites so it provisions D1, applies the checked-in Drizzle migration, and provides authentication. GitHub is source hosting; GitHub Pages cannot run this database-backed application.

Hosted runtime configuration: `FORM_EMAIL_ENABLED=true` and `FORM_NOTIFICATION_TO=contactus@vnwmedia.com`. These are set through Sites environment settings, not checked-in secrets. Local tests keep email sending disabled unless explicitly configured.

Before resident launch, confirm appointment duration, eligible service days, year, meaning of “units,” and the final notification inbox. FormSubmit activation is required when changing the recipient. Provider acceptance does not guarantee inbox delivery. No resident autoresponse or SMS is sent by this prototype.

## Source map

- `app/site-html.ts`: page content and responsive styling.
- `public/booking.js`: form, availability, history, cancellation, calendar export.
- `app/api/appointments/route.ts`: authenticated database API.
- `app/booking-domain.ts`: validation and slot definitions.
- `app/form-email.ts`: server-owned notification payload and duplicate-send protection.
- `public/form-notification.js`: browser delivery and result reporting.
- `app/api/notification-result/route.ts`: protected one-use result recording.
- `app/thank-you/route.ts`: private appointment receipt.
- `db/schema.ts`, `drizzle/`: persistent schema and migration.
- `scripts/test-bookings.mjs`: local integration verification.

Never commit credentials, local databases, runtime directories, or resident records.
