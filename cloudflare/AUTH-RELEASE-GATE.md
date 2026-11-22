# ReturnTrail OAuth production release gate

**Status: NO-GO — do not merge PR #2 or enable `AUTH_ENABLED` yet.**

The feature branch contains cryptographic identity verification, one-time OAuth
handshakes, callback routes, revocable sessions, CSRF logout, and explicit
customer provisioning primitives. This is not full application
authentication. The original Java deployment and D1 guest preview are separate.

## Blockers before rollout

1. **Database safety:** the user confirmed that the expired FalkorDB free
   instance held synthetic demo cases only, not real customer records. Keep
   original identity ownership separate and retain backups where available. D1 migrations 0004 and 0005
   have not been applied remotely. The unused persona migration 0006 was removed.
   Prior 0001–0003 were applied manually, so reconcile Wrangler migration
   bookkeeping before any apply.
2. **Provider configuration:** register two HTTPS callback URLs, one for Google
   and one for GitHub: `https://<preview-host>/api/oauth/google/callback`
   and `https://<preview-host>/api/oauth/github/callback`.
   Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET` as Worker environment secrets, never in Git/chat.
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
10. **Deploy:** only after sign-off, deploy to an isolated staging Worker with
    `AUTH_ENABLED=true`. Promote to production after rollback rehearsal and
    measured end-to-end validation.

## Verified local coverage

`node --test cloudflare/test/*.test.js` currently passes 25 tests. Local
SQLite mocks and provider stub responses do not replace live provider tests.

## Privacy and identity rule

The existing customer account belongs to its original provider subject.
No account is linked through matching email, and ReturnTrail has no Support Agent persona.
No customer evidence or old account data is migrated by this PR.
