# ALED Technologies · 99 Hudson maintenance

A working resident maintenance scheduling prototype. The contact bar, logo, hero, content, confirmation notice, and footer use one shared 1120px container with 24px gutters.

## Features

- Four arrival windows with three apartments per window (twelve appointments total) every day from November 2, 2026: 8–10 AM, 10 AM–noon, noon–2 PM, and 2–4 PM Eastern.
- Availability counts are hidden from residents. Existing bookings retain their originally scheduled times.
- Required name, apartment number, number of units, email, and phone fields.
- Shared Cloudflare D1 storage, server validation, atomic capacity enforcement (maximum three apartments per arrival window), one active request per apartment per day, and retry-safe submissions.
- Account-scoped appointment history and cancellation; canceled slots become available again.
- Daily status is calculated from active, distinct apartment requests: fewer than five is pending; five or more is confirmed. Cancellation can return a day to pending.
- Calendar downloads reflect the status at download time. Their 30-minute end time is a placeholder; downloaded calendar events do not auto-update after changes.
- New submissions use FormSubmit’s documented browser AJAX integration to send a sample notification to `dispatch@aledtechnologies.com` using FormSubmit. The recipient completed inbox activation and confirmed receipt of a sample test. Reply-To uses the submitted email; no automatic email is sent to the resident.
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
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_smart_princess_powerful.sql
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

The integration test refuses non-loopback targets. It checks validation, authentication, same-origin writes, retry safety, duplicate apartments, simultaneous booking conflicts, twelve-appointment capacity, the five-apartment threshold, account isolation, cancellation, and reopened slots. Test records are canceled in a finally block and stay in local storage only.

## Deployment

The existing private Site is declared in `.openai/hosting.json`. Deploy through Sites so it provisions D1, applies the checked-in Drizzle migration, and provides authentication. GitHub is source hosting; GitHub Pages cannot run this database-backed application.

Hosted runtime configuration: `FORM_EMAIL_ENABLED=true` and `FORM_NOTIFICATION_TO=dispatch@aledtechnologies.com`. These are set through Sites environment settings, not checked-in secrets. Local tests keep email sending disabled unless explicitly configured.

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

## GitHub Pages frontend

`docs/` is the static frontend for `https://vnwmedia.github.io/Aled-Technologies/`.
Regenerate it with `python3 scripts/build-pages.py` after changing shared page content.
Configure GitHub Pages to publish `main` → `/docs`.

GitHub Pages serves the interface. The Sites Worker continues to own shared D1 availability and records, so capacity is shared across browsers. The backend must allow public visits for the Pages API to be reachable; the existing account-owned endpoints still require sign-in. No booking records, environment values, session tokens, or database files are published in the repository.

The Pages API accepts only the approved GitHub origin in browsers. A cryptographically random browser token is hashed into a separate record owner namespace; it never grants access to previous account-owned appointments. A visitor can view and cancel only requests made with that browser token. Clearing browser storage loses that management session. There are no tokens or secrets embedded in the static frontend. Email delivery still uses the explicit form submission and fixed notification inbox.

Run `node scripts/test-pages-api.mjs` against the local built Worker to verify origin checks, session isolation, shared storage and cancellation.

### Comments and two email recipients
Optional additional comments (up to 2,000 characters) are saved with the request and included in the receipt and notification. FormSubmit receives a standard browser POST after the booking is saved. Its spam check stays enabled because autoresponses do not work with AJAX or disabled reCAPTCHA. It sends the owner notification to dispatch@aledtechnologies.com and an acknowledgment with a copy of the submission to the resident email, then redirects to the local thank-you page. Acknowledgments explain that the five-apartment minimum still applies. The stored `submitted` notification state records a handoff, not proven inbox delivery; abandoned spam checks may leave a booking saved without email. Existing AJAX-era requests are not automatically emailed again.

### October 22 scheduling update
New requests use four two-hour arrival windows: 8–10 AM, 10 AM–noon, noon–2 PM, and 2–4 PM Eastern Time. Each supports three distinct apartments (12 daily). Existing requests keep their recorded times; their start times count toward the containing window. Remaining capacities and daily progress counts are hidden from the customer interface. The sidebar includes the Association preventive maintenance charge and access requirements.

### Condominium wording and booking dates
The portal, receipts, calendar files and email notifications use Unit for the residence and Heat Pumps (HVACs) for the equipment count. New bookings are restricted to weekdays November 2–30, 2026, in the date selector and server validation. Existing saved requests remain available for review and cancellation. The supplied ALED logo is used unchanged.
