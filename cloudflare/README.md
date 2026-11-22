# ReturnTrail Cloudflare migration (experimental)

This is **not** the current production app. It is a separate, un-deployed
Worker/D1 migration foundation. Do not route the live frontend here yet.

An isolated, empty Cloudflare D1 preview database named `returntrail-preview`
has been created. `wrangler.preview.jsonc` targets it exclusively, under the
preview Worker name `returntrail-preview-api`; neither the main config nor
the live frontend has been changed. **Schema migrations and runtime tests
have not yet been run against that cloud database.**

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
