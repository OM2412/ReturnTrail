# ReturnTrail OAuth production release gate

**Status: NO-GO — do not merge PR #2 or enable `AUTH_ENABLED` yet.**

The feature branch contains cryptographic identity verification, one-time OAuth
handshakes, callback routes, revocable sessions, CSRF logout, and explicit
customer provisioning primitives. This is not full application
authentication. The original Java deployment and D1 guest preview are separate.

## Verified staging checkpoint — 22 November 2026

- Isolated Worker `returntrail-auth-staging` is deployed at
  `https://returntrail-auth-staging.omjadon242-67c.workers.dev`.
- Isolated D1 database `returntrail-auth-staging` has migrations 0001–0005
  applied. The original preview Worker and database are separate.
- Separate **ReturnTrail Staging** OAuth clients exist on Google and GitHub,
  with provider callbacks pointing to this staging Worker. Neither legacy
  `ReturnTrail Local` client was changed.
- Four runtime variables are present on the staging Worker. Both client-secret
  values are configured as encrypted Cloudflare secrets. Never copy values
  into repository files or diagnostics.
- Live `/api/health` responded with `status=ok`, `database=ready`, and
  `mode=guest-preview`. This is an infrastructure smoke test, **not** evidence
  of successful OAuth sign-in.
- `AUTH_ENABLED` and `ACCOUNT_FRONTEND_ENABLED` have **not** been enabled.
  The staging site continues to serve guest mode until verified account
  ownership, browser login, tenant isolation and rollback checks are complete.
- Local `node --test cloudflare/test/*.test.js`: 25/25 passed.

### Optional verified Google customer onboarding (feature branch only)

`GOOGLE_CUSTOMER_SIGNUP=true` permits a first-time, server-verified Google
OAuth subject to receive a **new isolated D1 workspace containing fictional
practice records**. This flag is OFF by default and must remain OFF on public
deployments until a staging browser signup, logout, tenant-isolation, and
repeat-login review passes. Google email equality is never used to attach an
old account. This does not recover expired FalkorDB graphs or migrate legacy
account data. Never call it an existing-account migration.

New local coverage: 27/27 Worker tests pass, including opt-in signup, replay
rejection, default-off behavior, and Google/GitHub provider-mismatch rejection.

## Blockers before rollout

1. **Database safety:** the user confirmed that the expired FalkorDB free
   instance held synthetic demo cases only, not real customer records. Keep
   original identity ownership separate and retain backups where available.
   Migrations 0004 and 0005 are applied **only in isolated staging**. The
   unused persona migration 0006 was removed. Reconcile migration bookkeeping
   independently on every other target before applying migrations there.
2. **Provider configuration:** staging callback URLs and credentials are
   configured. Confirm consent-screen test-user eligibility, correct provider
   scope, and real browser sign-in. Keep the four OAuth secrets out of Git/chat.
3. **Identity migration:** verify original customer provider + stable provider
   subject and explicitly link it to the migrated D1 account. Do not use email
   equality to claim an account. ReturnTrail currently has customer accounts,
   not a Support Agent product persona (which belongs to OnceTold).
4. **Authorization:** `/api/cases` remains guest-only unless both
   `AUTH_ENABLED` and `ACCOUNT_FRONTEND_ENABLED` are explicitly `true`.
   In account mode, the frontend session, CSRF, case listing and snapshot
   routes use account sessions. Account-scoped case
   listing, snapshot, evidence reads and synthetic evidence import now enforce
   server-side membership; writes require MEMBER role and CSRF. Other
   account-owned case mutations, data migration and full parity remain pending.
   Workspace authorization is based on explicit membership, not an app persona.
5. **Frontend compatibility:** the React API client exposes account case
   reads. `SignIn.jsx` uses Worker OAuth start URLs when its session contract
   declares `authFlow: 'CLOUDFLARE'`; otherwise it retains legacy Java URLs.
   A Worker adapter now returns the frontend's expected auth session shape.
   The adapter is locally integration-tested, but full browser validation and
   account-case mutation parity are pending.
6. **Lifecycle:** implement account bootstrap/admin provisioning CLI or secured
   admin operation, account data migration, account-to-case ownership, workspace
   switching (if required), provider auth error UI, logout/UI refresh and
   session expiry behavior.
7. **Security review:** test tampered callbacks, code replay, concurrent
   transactions, CSRF, session fixation, tenant-boundary access, duplicate
   identity creation and suspended-account behavior. Run dependency review.
8. **Browser smoke:** Google and GitHub real logins on a private staging
   hostname; ensure separate customers cannot see one another's cases without
   explicit membership, verify guest isolation, logout and persisted data.
9. **Operations:** backups, retention, migration rollback plan, rate limiting,
   logs without OAuth tokens/PII, incident response and quota monitoring.
10. **Deploy:** isolated staging is already live in guest mode. Enable
    `AUTH_ENABLED=true` on staging only after identity verification and initial
    provisioning have a tested recovery path. Enable
    `ACCOUNT_FRONTEND_ENABLED=true` after account UX and tenant tests; promote
    to production only after rollback rehearsal and measured validation.

## Verified local coverage

`node --test cloudflare/test/*.test.js` currently passes 27 tests. Local
SQLite mocks and provider stub responses do not replace live provider tests.

## Privacy and identity rule

The existing customer account belongs to its original provider subject.
No account is linked through matching email, and ReturnTrail has no Support Agent persona.
No customer evidence or old account data is migrated by this PR.
