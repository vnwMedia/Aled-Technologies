# Client-hosted portal

Live page: https://99hudsoncondos.aled.tech/

Updated October 26, 2026. Bookings are saved on the client's hosting and the browser goes directly to the local thank-you page. Two independent background email jobs send the dispatch notification and resident receipt through the email relay included with hosting. No external form service, signup or paid email account is required.

A live test reached its thank-you page in 2.268 seconds. The resident receipt was verified in the test inbox and the client confirmed receipt of the dispatch notification. The temporary test booking was canceled. Existing bookings, calendar rules, four time windows and layout were preserved. Main-website file checksums were unchanged after deployment.

Runtime data, mail configuration, logs, operational deployment instructions and backups are retained privately on the client's hosting and must not be committed to this repository. Do not deploy test scripts to a live runtime directory. Test the email queue in an isolated staging copy with mocked transport before updates.
