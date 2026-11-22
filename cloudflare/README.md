# ReturnTrail Cloudflare migration (experimental)

This is **not** the current production app. It is a separate, un-deployed
Worker/D1 migration foundation. Do not route the live frontend here yet.

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
- Remaining case workflows (including snapshots) intentionally respond `501`.
- OAuth, Groq, source comparisons, idempotency, rate limits and per-account
  authorization are **not yet ported**. Do not claim feature parity.

## Before any deployment

1. Reproduce the remaining graph queries in `docs/GRAPH-QUERIES.cypher` as
   parameterized SQL, including findings, context and task evidence revisions.
3. Add cross-session isolation, optimistic versioning, idempotency, write
   budgets and evidence revision tests.
4. Implement the required auth/case APIs with byte-compatible responses.
5. Run frontend API-contract/browser tests against the Worker locally.
6. Configure actual D1 `database_id` in `wrangler.jsonc` and apply migrations
   only to a dedicated test database first.
7. Wire a preview-only Pages route; do not change the existing recruiter URL
   until full regression and load tests pass.

The existing Render Java deployment and FalkorDB configuration were not edited.
