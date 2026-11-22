# ReturnTrail account foundation — gated rollout

The Cloudflare preview is **guest-only**. Adding `0004_account_foundation.sql`
does **not** enable login, persistence for real customers, subscriptions or AI.
Keep existing guest session flows and the original production deployment intact.

## Trust model

1. Verify OAuth authorization code using provider token endpoint, strict redirect
   URI, PKCE S256 and one-time state/nonce stored with a short expiry. Never
   trust email or account ID supplied by the browser.
2. Fetch provider identity from GitHub/Google, and anchor accounts to immutable
   `(provider, provider_subject)`. Email is display/contact metadata only;
   matching email is **not** sufficient to link accounts.
3. After verified login, generate 32 random bytes for the bearer cookie and a
   separate random CSRF secret. Only store SHA-256 hashes in D1. Use
   `HttpOnly; Secure; SameSite=Lax` cookies, rotate sessions after login and
   on privilege change; revoke on logout. No localStorage bearer tokens.
4. Resolve a session and active account on every authenticated request, then
   enforce active workspace membership and minimum role in the SQL query path.
   Never accept a user-selected workspace ID as authorization proof.
5. Use database transactions for account/identity link, workspace creation,
   membership creation and audit event; reject conflicting provider subjects.
6. Login callback, account linking, workspace ownership transfer and deletion
   require dedicated negative tests (state replay, CSRF, session fixation,
   provider identity collisions, revoked membership and cross-tenant reads).
7. Rate-limit login start/callback and session issuance at Cloudflare's edge;
   capture privacy-safe logs, retention policies and deletion procedures before
   real customer data is accepted.

## Current implemented pieces

- Additive D1 tables for accounts, provider identities, workspaces,
  memberships, hashed sessions and metadata-only audit events.
- `accountFoundation.js` includes fail-closed account-session lookup and
  tenant/role authorization checks. No account session is minted yet.
- SQLite tests cover identity collisions, suspension, expiry, revocation,
  role boundaries, workspace suspension and cross-tenant access denial.

## Migration operations

The preview D1 database already received migrations 0001–0003 manually.
Wrangler migration history was **not** populated by those manual statements.
Do not run `wrangler d1 migrations apply --remote` blindly. Backup/inspect the
dedicated preview D1 first, reconcile migration bookkeeping and apply 0004
only after reviewing the migration plan. Do not apply it to production.

## Unblocked by code vs. still blocked

- **Code ready:** relational foundation, role boundaries, hashed-token lookup.
- **Blocked:** OAuth client IDs/secrets and allowlisted callback URLs, verified
  provider exchange, session creation/revocation endpoints for account users,
  account-owned case migration, UI account switch, recovery, data export/delete.
- **Not part of authentication foundation:** Groq/AI, payment processor,
  subscription entitlement enforcement and production load/abuse review.
