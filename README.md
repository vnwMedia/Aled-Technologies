# ALED Technologies · 99 Hudson maintenance

A working resident maintenance scheduling prototype. The contact bar, logo, hero, content, confirmation notice, and footer use one shared 1120px container with 24px gutters.

## Features

- Ten slots every day from November 2, 2026, starting at 8:30 AM Eastern.
- Thirty-minute start intervals are a prototype assumption pending client confirmation.
- Required name, apartment number, number of units, email, and phone fields.
- Shared Cloudflare D1 storage, server validation, atomic prevention of double bookings, one active request per apartment per day, and retry-safe submissions.
- Account-scoped appointment history and cancellation; canceled slots become available again.
- Daily status is calculated from active, distinct apartment requests: fewer than five is pending; five or more is confirmed. Cancellation can return a day to pending.
- Calendar downloads reflect the status at download time. Their 30-minute end time is a placeholder; downloaded calendar events do not auto-update after changes.
- Email notifications are not configured. The interface states this explicitly. Residents check the portal for current status.

## Run locally

Requires Node.js >=22.13.0 and npm.

```sh
npm run install:ci
npm run db:generate # only after changing db/schema.ts
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_organic_the_captain.sql
npm run dev
```

Run the migration only once per fresh local database. Open the displayed loopback URL and visit `/signin-with-chatgpt?return_to=/` for the starter's local test identity. Hosted access uses the Sites platform's sign-in gate and trusted identity headers.

## Verify

```sh
npm start -- --port 8766
# In another terminal:
node scripts/test-bookings.mjs
```

The integration test refuses non-loopback targets. It checks validation, authentication, same-origin writes, retry safety, duplicate apartments, simultaneous booking conflicts, ten-slot capacity, the five-apartment threshold, account isolation, cancellation, and reopened slots. Test records are canceled in a finally block and stay in local storage only.

## Deployment

The existing private Site is declared in `.openai/hosting.json`. Deploy through Sites so it provisions D1, applies the checked-in Drizzle migration, and provides authentication. GitHub is source hosting; GitHub Pages cannot run this database-backed application.

Before resident launch, confirm the appointment duration, eligible service days, year, meaning of “units,” and email delivery workflow. No resident email or SMS messages are sent by this prototype.

## Source map

- `app/site-html.ts`: page content and responsive styling.
- `public/booking.js`: form, availability, history, cancellation, calendar export.
- `app/api/appointments/route.ts`: authenticated database API.
- `app/booking-domain.ts`: validation and slot definitions.
- `db/schema.ts`, `drizzle/`: persistent schema and migration.
- `scripts/test-bookings.mjs`: local integration verification.

Never commit credentials, local databases, runtime directories, or resident records.
