# linh-wedding-invi

Wedding invitation for Thùy Linh and Đức Tuấn.

## Current invitation

`vintage-lace-demo/` contains the current invitation, its API, and Google Apps Script integration. It uses plain HTML, CSS, and JavaScript.

Use Node.js 23 or newer.

```sh
cd vintage-lace-demo
npm run check
npm test
npm run build
npm run dev
```

The default local preview is `http://127.0.0.1:5500`.

For guest name lookup through `?id=1`, follow [Apps Script setup](vintage-lace-demo/integrations/google-apps-script/README.md). Configure server secrets through environment variables. On Vercel and configured local preview, RSVP and wishes are saved to Google Sheets. See [Vercel setup](vintage-lace-demo/VERCEL.md).

`wedding-invitation/` contains the earlier invitation. Its `dist/` directory is the editable source for that version and is tracked intentionally.

Generated Vintage Lace builds, preview databases, local secrets, and image generation output are ignored by Git.
