# ReturnTrail legacy-account migration: read-only audit

**Status: BLOCKED on source database access. No export or migration has run.**

## Verified from the Java source

- `AccountWorkspaceRepository.open()` stores the provider-derived identity key
  and a private graph name in `returntrail_identity_registry`.
- Saved account graphs are named `returntrail_account_<32 lowercase hex>`.
- Account workspaces are initialized with `graph/seed-demo-workspace.cypher`.
  The seed is synthetic; successful seed initialization does **not** prove that
  an account contains user-created evidence.
- `WorkspaceAccess.authorizedGraph()` checks both the authenticated provider
  identity and the session's bound account graph.
- `CaseCatalogRepository` reads cases from the authorized graph. The new D1
  preview keeps cases under a relational `workspace_id`.

## Required pre-migration evidence (read-only)

1. Confirm the legacy FalkorDB instance is still reachable by the original
   Java deployment. Do not copy passwords, connection URLs or access tokens
   into chat, screenshots, or Git.
2. Back up the legacy identity registry and each account graph using a trusted
   administrative export method. Encrypt backups and restrict access.
3. Record a non-secret inventory per graph: graph identifier, case count,
   evidence count, action count, clarification count, source dataset version,
   and export timestamp. Do not expose raw user evidence in logs.
4. Verify identity binding using provider + stable provider subject; **never**
   match accounts by email alone. Preserve the existing account/graph binding.
5. For each graph, verify referential paths such as
   `Case -> ReturnRequest -> PickupAttempt -> SupportStatement -> EvidenceDocument`.
   These are evidence node labels, not a ReturnTrail Support Agent user role.
6. Compare the exported graph to the D1 target model in migrations 0001–0003:

   | Legacy graph data | D1 target | Required check |
   | --- | --- | --- |
   | `Case` | `cases` | exact case IDs per account workspace |
   | `EvidenceDocument` + `SupportStatement` | `evidence` | source text, quote, claim, versions, source lineage |
   | order/item/return/pickup edges | `evidence` relationship columns and `evidence_relationships` | source paths are preserved |
   | case actions | `case_actions` | IDs, revision, status, timestamps |
   | clarifications | `clarifications` | action references, status, idempotency |
   | identity registry graph binding | `accounts`, `account_identities`, `account_workspaces`, `workspace_memberships` | provider subject -> correct private workspace |

## Release gate

- First import into a **new isolated D1 staging database**, never directly to
  the existing guest preview or a live customer workspace.
- Verify counts, checksums, relationship integrity, and sample complete case
  snapshots for every account before considering a cutover.
- Compare source and target query responses including evidence revisions and
  contradiction findings. A zero-mismatch result is required.
- Rehearse rollback while the legacy source stays intact.
- If the source database has expired, stop and establish the available backup
  or export before creating a fresh account. Never represent seeded demos as
  recovered customer data.

## What was not done

No FalkorDB connection was opened; no private customer records were read,
exported, migrated, or changed. No Cloudflare migration, deployment, or
account linkage was performed.
