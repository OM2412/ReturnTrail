> Historical milestone report. This describes the earlier workspace update, not the latest feature set or test aggregate. See [CONTEXT-UPDATE.md](CONTEXT-UPDATE.md), [LOGIN-SETUP.md](LOGIN-SETUP.md) and the delivered validation JSON for the current release.

# Case workspace verification

This update was developed against public commit `a3a8249`. It adds the first
multi-case/proof/reply improvement batch; it does not implement the entire roadmap.

Verified on Java 21 with the project target unchanged, Maven 3.9.16 and Node 24.
The earlier Java 17 compatibility run also passed; the final backend/database run
used Java 21. No target-version override is needed on the user machine.

## Completed checks

| Layer | Result | What it establishes |
| --- | --- | --- |
| Backend JUnit | 60 passing tests | Tool guards/order, separate-case checks, missing-context rules, explicit reply validation, pending policy, lifecycle and budgets |
| Labelled synthetic rule set | 20 fixtures included in the 60 tests | Expected outputs for the bounded detector; not real-world accuracy |
| Frontend domain/API | 6 passing tests | Pending filtering, stored-event ordering, same-origin credentials and no automatic write retry |
| Frontend lint/build | Passed | Source checks and production bundle compilation |
| Mock API browser contract suite | 23 passing groups | Existing navigation, AI result presentation, reply workflow, expiry, responsive routes and real WebGL fallback/reduced motion |
| Real API/database verification | 13 passing groups | Four seeds, actual query paths, task/source links, reply idempotency, ownership, validation and two-guest isolation |
| Real API browser workflow | 10 passing groups | Case cards, graph proof, pickup-only comparison, unknown/resolved replies, case switching, deep links and responsive views |
| Installer/rollback | 7 passing checks | Exact file copies, unchanged staging, complete rollback, CRLF handling, edited-file and corrupt-payload protection |

The database verification ran real Spring Boot HTTP endpoints against **FalkorDB
4.22.1**, extracted from the exact pinned image used by `compose.yaml`. The proof
and write queries executed on that database. Two extra admin-level probes inspected
actual REFERENCES edges and inserted a misleading cross-case item edge; explicit
case ownership still excluded the unrelated evidence.

The live browser suite did not mock API responses. To avoid external/provider
charges, it prepared tasks through the deterministic `/actions` endpoint. Groq
responses were mocked in agent tests and the contract browser suite. **No live Groq
request was made by this verification.** Run the AI workflow with your own key
before recording the final demo.

Browser checks used Chromium, Node 24 and viewports 320, 390, 768, 1024 and 1440
pixels. Page error collection was empty. Screenshots were inspected internally and
are not shipped in the update. Three.js emits a dependency Clock deprecation
warning. The intentionally disabled-WebGL contract test exercises a caught renderer
error and the usable fallback.

## Reproduce on the target machine

Use Java 21+ and the project Maven target unchanged:

```powershell
Set-Location "$env:USERPROFILE\Projects\returntrail\backend"
mvn test
Set-Location ../frontend
npm.cmd run lint
npm.cmd run build
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Stop a separate Vite server on 5174 before `test:browser`; its runner starts one.
The mock suite does not require FalkorDB or Groq.

For real API/browser checks, start Docker/FalkorDB, the backend and frontend in
separate terminals. Then, from frontend:

```powershell
npm.cmd run test:workspace
```

That suite creates an isolated synthetic guest. It does not send messages, issue
refunds or call Groq. Local preparation and reply operations create saved demo data
in that guest only. Guest creation rate limits still apply.

## Manual acceptance walkthrough

1. Open `/cases`. Four cards should be available after explicit guest creation.
2. CASE-001: two source claims, one disagreement; run the AI check once and inspect
   the real returned 4-step trace and source-linked task.
3. CASE-002: the source claims describe separate pickup attempts. Connections shows
   why the other attempt is excluded. A bounded check finds no disagreement.
4. CASE-003: the original reason is UNKNOWN. Run investigation to prepare a missing
   context task. Save **Still unknown**; pending question stays. Explicitly record
   an explanation; task resolves, original source and both notes remain.
5. CASE-004: the seeded reply is clearly labelled synthetic/unverified. Investigation
   reads it, preserves history and does not prepare another task (3 model calls).
6. Refresh a case-specific URL and switch cases. Notes/tasks remain in their case.
7. End/reset a guest. The new guest has independent copies. Old guest workspaces are
   not migrated and the development graph is not overwritten.

## Current limits and follow-on work

- Saved account/login flows, arbitrary evidence ingestion, AI extraction, report
  export and cloud deployment remain unimplemented.
- Findings apply only to the supported status rules. They are context requests,
  not factual fault determinations or refund decisions.
- A user explicitly reports whether their note supplies an explanation. The server
  validates the chosen outcome; it does not independently verify free text.
- The initial CASE-004 task/reply timestamps are illustrative, prewritten values.
- Guest sessions and lifecycle coordination remain in one backend instance. Restart
  or expiry can end access; do not claim durable account memory or use replicas.
- The combined read endpoint is not a transactionally consistent snapshot across
  concurrent writes. Each task/reply mutation is a single graph query.
- Database readiness and provider readiness still need deployment checks.

## Installer verification environment

The apply/restore scripts were executed in PowerShell 7.6.7 on Linux against an
isolated checkout of a3a8249, including a CRLF input fixture. The 50 payload files
matched exactly; rollback restored original bytes and removed all added files.
Local edits, transfer corruption and post-install changes were rejected before
mutations. Git staging remained unchanged. Windows PowerShell 5.1 itself was not
executed here; the installer uses compatible syntax and runs checks on the target
machine. Use the exact printed backup path for rollback.
