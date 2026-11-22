# ReturnTrail Cloudflare migration (experimental)

This is **not** the current production app. The D1 Worker is deployed only at
`https://returntrail-preview-api.omjadon242-67c.workers.dev`.
The experimental React SPA is configured to be served as static assets on that
same Worker origin; it must be built before deployment. Do not replace the live
recruiter-facing website until browser regression testing and feature parity are complete.

An isolated Cloudflare D1 preview database named `returntrail-preview` has
been created. `wrangler.preview.jsonc` targets it exclusively, under the
preview Worker name `returntrail-preview-api`; neither the main config nor
the live frontend has been changed. **On November 22, 2026, all statements
in migrations 0001, 0002 and 0003 were manually applied through the D1
dashboard console.** The six application tables and index were verified via
`sqlite_master`; all nine `ALTER TABLE` queries reported success. A synthetic guest session was created on the live preview Worker and four
case records were successfully fetched from D1.

**Important:** manual dashboard migrations do not automatically populate
Wrangler's migration bookkeeping. Do **not** blindly re-apply `wrangler d1
migrations apply --remote` to this preview database; reconcile the migration
history first to avoid duplicate-column/table errors.

## Preview build and deployment

The dedicated Cloudflare Worker build uses the feature branch
`feat/cloudflare-d1-migration-foundation` and runs:

```sh
git fetch origin feat/cloudflare-d1-migration-foundation && git checkout feat/cloudflare-d1-migration-foundation && npm ci --prefix frontend --no-audit --no-fund && npm run build --prefix frontend
cd cloudflare && npx wrangler deploy --config wrangler.preview.jsonc
```

`assets.not_found_handling` serves the React SPA; `/api/*` routes execute the
Worker first, so HttpOnly CSRF/session cookies work on the same origin.
The deployed preview remains guest-only: OAuth, AI investigation, and any
unported endpoints explicitly return 501. Do not advertise full parity.

## Why

The existing Java application uses FalkorDB-specific Cypher across six graph
repositories. FalkorDB Cloud Free is ephemeral. D1 supports durable relational
data, but is not a drop-in graph driver replacement.

## Current status

- Relational schema for guest sessions, cases, evidence, graph relationships,
  actions and clarifications.
- Guest session/CSRF endpoints. Guest creation inserts four synthetic cases and
  seven evidence records in a single D1 batch transaction before returning
  READY; `/api/cases` lists only the current session's cases.
- `/api/cases/{id}/evidence` and `/api/cases/{id}/proof` use session-scoped SQL;
  proof nodes/edges preserve the existing frontend format with a `D1_QUERY_PATHS`
  source label.
- `/api/cases/{id}/snapshot` and `/brief` recreate the Java conflict detector,
  canonical SHA-256 evidence revisions, Java-compatible UUIDv3 finding IDs,
  pending-clarification policy and four seeded scenario assessments. A second
  SQL migration adds read-model fields for seeded follow-up history.
- Guest follow-up creation and manual clarification endpoints now support
  CSRF checks, source-version guards, transaction-scoped workflow revisions,
  deterministic task keys and reply-idempotency. These paths are still
  **experimental** and need browser/concurrent-worker integration tests.
- Synthetic evidence import now validates literal source quotes, strict schema,
  existing pickup ownership, the 30-record bound, expected evidence version,
  SHA-256 idempotency hash and request ID. A third migration stores the hash.
- Deterministic `/findings` and read-only `/context?exclude=...` endpoints are
  ported, including source-set coverage and non-destructive counterfactuals.
- AI investigation and OAuth remain unported and intentionally return `501`.
- OAuth, Groq, rate limits and per-account
  authorization are **not yet ported**. Do not claim feature parity.

## Before any deployment

1. Reproduce the remaining mutation graph queries in `docs/GRAPH-QUERIES.cypher` as
   parameterized SQL, including context and task evidence revisions.
2. Add cross-session isolation, optimistic versioning, idempotency, write
   budgets and evidence revision tests.
4. Implement the required auth/case APIs with byte-compatible responses.
5. Run frontend API-contract/browser tests against the Worker locally.
6. Configure actual D1 `database_id` in `wrangler.jsonc` and apply migrations
   only to a dedicated test database first.
7. Wire a preview-only Pages route; do not change the existing recruiter URL
   until full regression and load tests pass.

The existing Render Java deployment and FalkorDB configuration were not edited.
