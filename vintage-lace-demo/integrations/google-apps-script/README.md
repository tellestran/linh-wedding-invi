# Set up the wedding Sheet web app

This script targets the existing `KhachMoi`, `PhanHoi`, and `LoiChuc` tabs. It does not change the website or its existing Cloudflare D1 connection.

1. Open the prepared Google spreadsheet and select **Extensions > Apps Script**.
2. Replace the default `Code.gs` contents with the adjacent `Code.gs` file and save.
3. Open **Project Settings > Script Properties** and add these properties.

| Property | Value |
| --- | --- |
| `SPREADSHEET_ID` | `1G3BZhHUv1Tv8rpadrCn4bVkvaTpPgVGR3oCHUv8P5D0` |
| `GUEST_LOOKUP_SECRET` | A private random value with at least 32 bytes of randomness, shared only with the website server. |

4. Select `checkSetup` in the function selector and run it. Authorize the script with the account that can edit the spreadsheet. The function verifies the headers without creating response records.
5. Select **Deploy > New deployment > Web app**. Set **Execute as** to your account and **Who has access** to **Anyone**. If your account policy does not offer anonymous access, this integration requires a different deployment or authentication approach.
6. Copy the deployed URL ending in `/exec`. The `/dev` URL is restricted to script editors and is unsuitable for the website server.
7. Open `/exec` in an incognito browser. Expect `{"ok":true,"service":"wedding-sheet","version":1}`. This checks reachability only. Test authenticated POST requests from the website server separately.
8. In the website hosting environment, set `GUEST_LOOKUP_URL` to the `/exec` URL and `GUEST_LOOKUP_SECRET` to the same secret. These must be server-only environment values.

The website reads these server environment names for `GET /api/guest?id=1`. The existing Worker and the Vercel entry at `api/guest.js` use the same lookup handler. Set the Vercel project root to `vintage-lace-demo` when preparing deployment. The existing Sites build remains a Worker build, so deploying all static assets on Vercel still needs the appropriate output configuration. Do not set the browser's RSVP fetch URL directly to Apps Script or expose the secret in browser code. RSVP storage still uses the existing D1 endpoint and has not been migrated to Sheets.

For local preview, copy `.env.example` to `.env.local` and enter the two server values. Run `npm run build`, then `node --env-file=.env.local scripts/preview.mjs`. Open `http://127.0.0.1:5500/?id=1`. A Python static server cannot provide the lookup API.

An `id` parameter takes precedence over literal `khach` and `guest` names. Missing, invalid, repeated, or unknown IDs keep the generic greeting. Without `id`, legacy name links still work. A successful lookup updates the envelope, its accessible label, and invitation greetings. The latest frontend uses that resolved name when submitting RSVP. A response arriving during or after submission does not replace the name for that submission.

## Server request contract

Send JSON by POST and follow Google Content Service redirects. Parse the returned JSON `ok` field even when HTTP status is 200.

For name lookup, send this shape with the real secret substituted only on the server.

```json
{"action":"guest","secret":"SERVER_SECRET","guest_id":"1"}
```

For RSVP, keep the current frontend fields and add `action`, `secret`, and `guest_id`.

```json
{
  "action": "rsvp",
  "secret": "SERVER_SECRET",
  "guest_id": "1",
  "id": "0d7afcc8-dff4-4337-a282-18f5f4ada0a3",
  "name": "Guest name",
  "attendance": "both",
  "guests": 2,
  "note": "Wedding wishes"
}
```

`guest_id` is the stable numeric invitation ID. `id` is the current frontend's submission UUID. Keep the two distinct. Attendance values remain `both`, `party`, `ceremony`, and `no`. Absence uses zero guests. The current UI's value 5 means five or more people.

The script keeps one current response per guest. A nonempty wish is stored separately with the submission UUID as `wish_id`. A repeated current submission returns success without another write. Changing the form creates a new submission UUID and can create another wish. A script lock coordinates simultaneous script writes. The wish is written before the response marker so a retry can recover a partial write. The two tabs do not form a database transaction. Concurrent manual edits are outside the script lock. Replaying an older submission after a newer one can replace the current response; ordered historical replay is not supported.

The script treats submitted names and wishes as literal cell text. It validates tab headers before writing. No real test responses were submitted during local preparation.

## Update a deployment

After changing script code, use **Deploy > Manage deployments > Edit > New version > Deploy** to update the existing `/exec` endpoint. Saving source alone does not update a versioned production deployment.

## Verification limits

Local verification covers JavaScript syntax and simulated Apps Script services. Google authorization, anonymous POST behavior, redirects, and writes to the actual Sheet require deployment verification in your account. The public health response does not establish that the shared secret or Sheet permissions are correct.

See Google's [Web Apps guide](https://developers.google.com/apps-script/guides/web), [Content Service guide](https://developers.google.com/apps-script/guides/content), and [Lock Service reference](https://developers.google.com/apps-script/reference/lock/lock-service).
