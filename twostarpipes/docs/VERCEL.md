# Existing Vercel deployment

Requested site: https://twostarpipes-otf9.vercel.app/.

Use the existing Vercel project, with Root Directory **twostarpipes** (this repository stores the app in that subdirectory). The checked-in `vercel.json` uses `npm ci` and `NITRO_PRESET=vercel npm run build`; Nitro generates the Vercel Build Output API server and static assets. Do not use a static SPA fallback or set the output to Cloudflare `.output/public`. Framework preset is Other/null; let the generated `.vercel/output` configuration handle server routes.

Set the same environment variables listed in `.env.example` in the appropriate Vercel environment. `VITE_*` values are public build-time configuration; all other credentials stay server-only. Do not print values or commit `.vercel` linkage files. Keep notifications, analytics and managed catalogue disabled until separately configured and verified. The existing schema/service approval gates still apply; deployment approval does not authorize executing SQL.

The app notification worker accepts authenticated POST only. Do not enable a Vercel GET cron against `/api/notifications`; preserve the separately approved POST scheduler workflow.

After an authorized Git push, inspect the Vercel preview deployment first. Promote the reviewed deployment to the existing production site only using authorized Vercel access. Do not merge the feature branch solely to trigger a production deployment unless separately instructed.

Local PowerShell build: set `$env:NITRO_PRESET='vercel'`, run `npm.cmd run build`, then remove that environment variable. Check the public Vercel bundle using `node scripts/check-public-bundle.mjs .vercel/output/static`.

Deployment is not proof that Supabase migrations, scoped writer credentials, Turnstile, Redis, admin membership or email delivery are operational. Verify synthetic staging flows before accepting live enquiries.

Reference: https://nitro.build/deploy/providers/vercel.
