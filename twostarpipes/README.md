# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Quotation configuration and checks

Copy .env.example to a local ignored .env and configure the same-project Supabase public URL/key, public Turnstile site key, server-only Turnstile secret/hostname allowlist, persistent Redis REST credentials, HMAC secret, and expiring dedicated quote_writer JWT. Never use service-role credentials or put server secrets in VITE variables. The form fails closed until these dependencies are configured. Restart/rebuild after changing VITE values.

See [security/REVIEW.md](security/REVIEW.md) for the Phase 1 inventory, limits, all manual setup steps, validation results, SQL review and coordinated staging cutover. SQL files under security/ are review drafts outside the automatic migration directory; none has been applied to a connected database. Drafts are exercised only in disposable embedded PostgreSQL tests. Production SQL and deployment require a later authorized operational step.

Run npm test, npx tsc --noEmit, npm run lint and npm run build (use npm.cmd/npx.cmd in PowerShell if script execution is disabled).

For local development, load server-only variables explicitly: `node --env-file=.env node_modules/vite/bin/vite.js`. Vite loads VITE variables itself; do not assume `npm run dev` loads non-VITE server secrets from .env. The production Worker uses configured runtime secrets instead.

## Admin and managed catalogue

Open /admin for Supabase Auth sign-in. Every admin operation verifies the Auth token and database allowlist. Configure and test the versioned SQL drafts before using the dashboard. Managed products are opt-in; import and verify the existing catalogue before enabling MANAGED_CATALOGUE. Notifications remain disabled until an approved provider, recipients and scheduled worker are configured.

Use npm ci with package-lock.json for this branch (Playwright and PGlite are development-only additions). See [docs/STATUS.md](docs/STATUS.md), [docs/LAUNCH.md](docs/LAUNCH.md) and [security/CHANGES.md](security/CHANGES.md). Checks: npm run typecheck, npm run lint, npm test, npm run test:e2e, npm run build, npm run test:bundle-security. Playwright defaults to installed Edge; override PLAYWRIGHT_CHANNEL or install its supported browser in CI. Local browser tests use placeholders, block external traffic and never send real enquiries.
