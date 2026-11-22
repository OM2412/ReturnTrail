# ReturnTrail OAuth production release gate

**Status: NO-GO — do not merge PR #2 or enable `AUTH_ENABLED` yet.**

The feature branch contains cryptographic identity verification, one-time OAuth
handshakes, callback routes, revocable sessions, CSRF logout, and explicit
customer/support-agent provisioning primitives. This is not full application
authentication. The original Java deployment and D1 guest preview are separate.

## Blockers before rollout

1. **Database safety:** confirm whether the old customer profile/data is in
   Java/FalkorDB and export it with backups. D1 migration files 0004, 0005,
   0006 have not been applied to remote. Prior 0001–0003 were applied manually,
   so reconcile Wrangler migration bookkeeping before any apply.
2. **Provider configuration:** register two HTTPS callback URLs, one for Google
   and one for GitHub: `https://<preview-host>/api/oauth/google/callback`
   and `https://<preview-host>/api/oauth/github/callback`.
   Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET` as Worker environment secrets, never in Git/chat.
3. **Identity migration:** verify original customer provider + stable provider
   subject and explicitly link it to the migrated D1 account. Do not use email
   equality to claim an account. Support Agent must be a distinct identity,
   created through a trusted administrator workflow.
4. **Authorization:** `/api/cases` remains guest-only. Account-scoped case
   listing, snapshot, evidence reads and synthetic evidence import now enforce
   server-side membership; writes require MEMBER role and CSRF. Other
   account-owned case mutations, data migration and full parity remain pending. Do not
   leak customer cases to an agent solely because the agent's persona is
   `SUPPORT_AGENT`.
5. **Frontend compatibility:** the React API client now exposes account case
   read methods, but `SignIn.jsx` still uses legacy
   `/oauth2/authorization/{google,github}` URLs, and `AuthContext` expects a
   specific `/api/auth/session` profile shape. The new Worker account routes
   are under `/api/account/*`. Implement and test an explicit contract adapter
   and complete account-case parity before switching sign-in links.
6. **Lifecycle:** implement account bootstrap/admin provisioning CLI or secured
   admin operation, account data migration, account-to-case ownership, workspace
   switching (if required), provider auth error UI, logout/UI refresh and
   session expiry behavior.
7. **Security review:** test tampered callbacks, code replay, concurrent
   transactions, CSRF, session fixation, tenant-boundary access, duplicate
   identity creation and suspended-account behavior. Run dependency review.
8. **Browser smoke:** Google and GitHub real logins on a private staging
   hostname; ensure customer and agent cannot see each other's cases without
   explicit membership, verify guest isolation, logout and persisted data.
9. **Operations:** backups, retention, migration rollback plan, rate limiting,
   logs without OAuth tokens/PII, incident response and quota monitoring.
10. **Deploy:** only after sign-off, deploy to an isolated staging Worker with
    `AUTH_ENABLED=true`. Promote to production after rollback rehearsal and
    measured end-to-end validation.

## Verified local coverage

`node --test cloudflare/test/*.test.js` currently passes 24 tests. Local
SQLite mocks and provider stub responses do not replace live provider tests.

## Privacy and identity rule

The existing customer account belongs to its original provider subject.
`SUPPORT_AGENT` and `CUSTOMER` personas never merge through matching email.
No customer evidence or old account data is migrated by this PR.
