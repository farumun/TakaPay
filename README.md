# Takapay

Takapay is a Next.js App Router starter for a configurable payment platform. It now includes authenticated merchant and admin surfaces, a Prisma/PostgreSQL schema, database-driven landing content, OTP and TOTP auth flows, and tenant-scoped API foundations.

## Local setup

1. Copy `.env.example` to `.env`. The example uses a local SQLite database at `prisma/dev.db`; no database server is needed for a local preview.
2. Keep the example `DATABASE_URL` for local development, or set a PostgreSQL URL to select the production PostgreSQL schema.
3. Generate independent secrets; never use the example blank values:
   - `AUTH_SECRET`: at least 32 random bytes.
   - `OTP_PEPPER` and `RATE_LIMIT_PEPPER`: independent high-entropy secrets, at least 32 characters each.
   - `CREDENTIAL_ENCRYPTION_KEY`: base64 of exactly 32 random bytes. Production should use KMS/envelope encryption and a rotation plan.
4. Configure an OTP sender (`RESEND_API_KEY` + `OTP_EMAIL_FROM`, and optionally Twilio variables for phone OTP).
5. Optional social sign-in: set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` and/or `AUTH_FACEBOOK_ID`/`AUTH_FACEBOOK_SECRET`. Register `http://localhost:3000/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/facebook` as the matching provider callback URLs. The buttons stay disabled until their provider credentials are configured.
6. Set `APP_BASE_URL`; in production it must be the canonical HTTPS origin. Configure `PRIVATE_UPLOAD_DIR` to a private persistent volume outside `public/`.
7. Install and generate: `npm install`, `npm run db:generate`.
8. Apply schema and seed initial content: `npm run db:push`, then `npm run db:seed`. SQLite is for local development/preview; production PostgreSQL deployments should use reviewed, versioned migrations.
9. To provision the first super admin, set `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` (minimum 16 characters) before seeding. The seed creates the account only if that email is not already present.
10. Start with `npm run dev`.

`npm run db:push` is for local bootstrap. The Prisma config selects a SQLite-compatible schema when `DATABASE_URL` starts with `file:` and preserves `prisma/schema.prisma` as the PostgreSQL production schema. Use reviewed, versioned Prisma migrations in production. Do not share local or production data between test and live provider environments.

## Implemented surfaces

- CMS-backed public hero, feature list, integrations, pricing, brand text, and database-managed header/footer navigation. Admin editors are under `/admin`.
- Credentials + optional Google/Facebook OAuth using Auth.js; Resend email and Twilio phone OTP; password reset; bcrypt password hashes; authenticator-app TOTP; active/suspended state and auth-version session revocation.
- Merchant registration, verification, admin approval, role-protected dashboard, analytics, transaction filtering/CSV, gateway credential storage, sandbox/live key records, webhook endpoint settings, payment links, invoices, and encrypted private KYC upload/review.
- Admin CMS, public global settings, navigation, feature flags, gateway enablement/commission settings, merchant controls, KYC review, and audit log.
- `POST /api/v1/payments` API-key authentication, tenant checks, idempotency key, fee calculation, and the gateway adapter contract.
- `POST /api/webhooks/[gateway]` bounded-body parsing, provider-verification contract, amount/currency matching, event idempotency, and guarded payment-state transitions.
- Original Takapay SVG branding in `public/assets/takapay-mark.svg`. The reference website's proprietary images/logos were not copied; replace/add assets only when you have rights to use them.

## Explicitly not production-ready

This code does **not** activate real bKash, Nagad, Rocket, Upay, or bank-transfer processing. The adapter registry is empty by design: no provider API details or credentials were supplied, and implementing undocumented signatures, token flows, settlement rules, or refund behavior would be unsafe. Payment creation returns `503` until a verified adapter is registered. Refunds return `501`. The public payment-link page is a non-collecting preview.

Also required before live payments:

- Implement and test official provider adapters against provider sandboxes; validate signature canonicalization, replay rules, timeouts, refunds, reconciliation, and idempotent retry behavior.
- Build a durable background worker/outbox for outbound merchant webhooks, exponential retries, dead-letter handling, and SSRF-safe DNS/IP validation at delivery time. Endpoint setup and the delivery schema exist, but the dispatcher does not.
- Deploy KYC storage on a private durable encrypted volume or object store, add malware scanning, retention/erasure workflows, access monitoring, and key rotation.
- Configure production secrets, trusted proxy/IP handling, database backups, alerting, operational runbooks, legal/regulatory checks, and load/security testing.
- The current rate limiter is PostgreSQL-backed and expects the schema to be applied. Expired rate-limit rows need scheduled cleanup.
- Admin-managed feature flags are stored dynamically; each flag only affects the parts of the application that explicitly check it.
- The dependency audit still reports high advisories in the Prisma CLI/config and Tailwind 3 build-tool dependency trees. A major toolchain migration should be evaluated before production; the non-breaking fixes did not eliminate these findings.

Never put raw API credentials in logs, client bundles, CMS records, URLs, or support tickets. Gateway and MFA secrets are encrypted at rest, while API-key secrets are only returned once and stored as password hashes.
