# Client-owned deployment

Live portal: https://99hudsoncondos.aled.tech/

Deployed October 22, 2026 to the existing client GoDaddy cPanel hosting account. The subdomain has its own document root, `/home/aledtech/99hudsoncondos.aled.tech`, outside the existing main website's `/home/aledtech/public_html`. Its API library and SQLite data live in `/home/aledtech/99hudson-private`, outside all web document roots. No changes to the main website, shared PHP configuration, main database, root/www DNS, nameservers, or email DNS were made.

The new subdomain's A record points to 68.178.192.113. HTTPS certificate validation and HTTP-to-HTTPS redirection passed. The previous GitHub Pages custom-domain binding was removed; GitHub retains the source backup and original prototype, and serves no files for the client subdomain. The deployed public assets contain no GitHub links or external booking-backend dependency.

All five prototype appointment records (two active, three canceled) were copied into the private client database. Request IDs, dates, time windows, comments and status were preserved. Existing prototype records remain retained in the original database as well; subsequent bookings at the client address use the client database. Browser-based management is scoped to the browser and domain used to submit a request.

Validation on the client server passed: three bookings per window; fourth booking rejected; duplicate unit prevention; idempotency; cancellation releases capacity; November weekday restrictions; own-request isolation; comments and dual email payload; all four windows and 12 daily capacity. A separate live HTTPS API check saved and canceled a temporary DEPLOYCHECK request without sending email. Browser checks verified November availability, December view-only mode and all four appointment windows returning when November is selected.

An SHA-256 manifest comparison confirmed the existing main website's files were unchanged after the portal installation. The private server deployment folder stores the comparison baseline and staged source archive.

Email uses the previously configured FormSubmit browser POST to dispatch@aledtechnologies.com with a resident autoresponse. Visitors complete the provider spam check before the thank-you page. Inbox delivery/activation at the new dispatch recipient was not verified during deployment. Do not equate saved requests or provider handoff with delivered email.

To update: build the existing frontend with `python3 scripts/build-pages.py`, then `python3 scripts/build-client-hosting.py`. Upload only `client-hosting/public/` to the subdomain document root and `private/portal.php` to the private sibling directory. Keep the production SQLite database and its journal files out of public directories and source control. Run `private/test.php` in staging with `portal.php`; it uses an in-memory database. Never overwrite the main website's public_html folder or replace the production database with an empty file.

## Current-month scheduling update — October 22, 2026

The live portal now opens to the actual current month/year in Eastern Time. Only today and later weekdays in that month accept bookings. Other months remain viewable. The eligible month advances automatically, including December-to-January year changes; an open tab refreshes its calendar when the Eastern date changes. This replaces the earlier November-only campaign rule. Existing requests are retained. The four arrival windows, three bookings per window, and five-unit daily minimum are unchanged. The working-prototype banner and obsolete November start-date sidebar fact were removed from both the booking page and thank-you page. Server checks cover month/year rollover, leap years, past dates and weekends.
