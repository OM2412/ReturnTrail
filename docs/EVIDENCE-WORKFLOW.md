> Evidence-workflow milestone. The current cumulative release also includes optional Google/GitHub saved sign-in, Context lab, rule review and draft/production source. See [CONTEXT-UPDATE.md](CONTEXT-UPDATE.md).

# Evidence workflow — submission update

This is a bounded synthetic demo, not a production returns platform. The visible
workflow now demonstrates something beyond replaying two hard-coded claims:
a new source can change which context needs review without erasing prior work.

## The demo to show

1. Start a fresh practice workspace; open CASE-004. Its prewritten manual reply
   covers the initial source set, and the original disagreement remains visible.
2. Open Evidence inbox. Load the fictional example, confirm it is fictional,
   review the exact quote and pickup link, then save.
3. Overview now shows a new evidence version and a pending question. The earlier
   task remains RESOLVED in history; that status is not a conclusion about new evidence.
4. Run an investigation to prepare the current task. The actual Groq workflow
   requires the configured backend key; no-key integration tests prepare tasks
   through the deterministic `/actions` endpoint instead.
5. Save a "Still unknown" note. The current task and pending question remain OPEN.
6. Save an explicit manual explanation if the fictional scenario supplies one.
   This resolves only the task for that source set and is labelled unverified.
7. Open Case brief. Download JSON or print/save PDF. Original text, exact quotes,
   source links, pending questions, earlier tasks and manual notes travel together.

## Why the graph matters here

Sources are traversed through Case → ReturnRequest ← PickupAttempt ←
SupportStatement → EvidenceDocument, with the owned order/item path required
for reads. Different attempts are compared separately. Follow-up tasks reference
the exact source documents reviewed; manual notes reference those tasks.

A stable semantic finding ID identifies the same question for a pickup. A SHA-256
revision identifies its complete source set: case, pickup, document ID, recorded
claim, quote and original text, in deterministic order. Adding even an UNKNOWN
source changes that revision. A resolved note suppresses only the matching
finding ID **and revision**. New tasks include the revision in their identity;
earlier tasks are retained rather than silently reopened or overwritten.

This is evidence identity, not a model confidence or authenticity score.

## Write and read guarantees

| Operation | Behavior |
| --- | --- |
| Source save | One parameterized Cypher query validates pickup ownership, expected version and source cap, then saves source/statement/links/counters atomically |
| Identical source retry | Same request ID and contents returns existing receipt; no duplicate and no version increment |
| Changed retry / stale new write | 409, no partial save |
| Concurrent writes | Two new imports with the same expected version cannot both commit |
| Reply save | Requires the current task source revision and expected case evidence version |
| Old identical reply retry | Returns the immutable original note, including its status at recording |
| Snapshot / brief | Compare evidence and workflow counters around reads; retry once, then 409 if changing |
| Manual DB changes | Outside counter guarantees; use application endpoints during the demo |
| Save succeeded, refresh failed | Keep the acknowledgement and disable further edits until refresh succeeds |

The browser does not infer a claim from a quote. A human selects the claim and
pickup; exact substring validation only proves that those quoted characters occur
in the saved text. It does not establish that the label is correct.

## Targeted performance changes

| Area | Change | Practical limit |
| --- | --- | --- |
| Evidence-only reads | Read result rows directly instead of constructing proof maps | Proof endpoint still constructs the requested paths |
| Case lookup | Parameterized single-case lookup replaces library scan | Four seed cases; no pagination is needed for this demo |
| Browser refresh | Cache static case catalogue for the guest; refresh only snapshot after the initial read | Evidence/tasks/notes are never cached across refreshes |
| Model context | Send IDs, pickup, claim and supporting quote rather than entire 4,000-character sources | Three/four forced model requests remain; this is not autonomous planning |
| 3D startup | Load near viewport and keep the Three.js module separate | The 3D chunk remains large and is an optional visual |
| 3D activity | Pause offscreen/hidden; demand rendering after completion/reduced motion | Orbit interactions may request frames; not a universal GPU/CPU benchmark |
| Scene size | At most six source cards, including the selected document | Complete records and actual links remain in reader/proof |
| Input budget | 4,000-character source, 500-character quote, 20 KB body, 30 records per case | Not a bulk dataset importer |

## Dataset decision

Keep the 20 manually labelled synthetic rule fixtures and four visible scenarios.
They check the detector's stated behavior and counterexamples; they are not a
real-world accuracy result or training set. A random shopping dataset without
same-pickup source provenance would not validate this workflow. More examples
should vary attempt identity, missing context, new evidence after a reply and
retry/concurrent behavior. Do not invent benchmark percentages.

## Remaining priorities before submission

| Priority | Work | Why |
| --- | --- | --- |
| Required | Run actual key-backed investigation after installing; capture a successful tool trace | Live Groq calls were not made in this validation environment |
| Required | Rehearse demo and record a short fallback video | Local runtime/network failures should not consume judging time |
| Required | Confirm submission link, rules, deadline timezone and teammate credit with the event page | Do not rely on dates copied into sample data |
| High | Choose and verify deployment, or clearly document local Docker demo | This update does not restore Railway credits or deploy services |
| Implemented | GitHub account sign-in and saved workspaces | Configure the OAuth app and verify external GitHub login; see LOGIN-SETUP.md. Guest import remains separate |
| Later | PDF/OCR and AI extraction with editable source-linked review | Requires file validation, extraction limits, provenance and separate evaluation |
| Later | Broader return/refund rules and genuine labelled documents | Current detector covers only the documented pickup-reason conditions |

Authentication should follow durable ownership design: account → workspace →
cases, while retaining guest preview. Use managed OAuth/OIDC rather than storing
passwords for a deadline demo. GitHub provider configuration and deployment remain open;
the current implementation adds real OAuth wiring with account graph persistence,
while guest work remains temporary. See LOGIN-SETUP.md.

## Verification

See the accompanying `validation.json` and test commands in README. Backend unit,
frontend contract, real database/API, real browser and installer checks are
reported separately. Real browser tests use fresh guest workspaces and the
no-model action endpoint; one read failure is deliberately injected to verify
successful-save recovery. No claim of live model availability is made.


Checked on 2026-10-16 UTC: 71 backend tests passed; frontend lint/build and eight
domain/API tests passed. Browser checks passed in 23 mocked contract groups, ten
real workspace groups and six real Inbox/brief groups. The live database suite
passed eight extended groups; the reproducible `test:api` suite passed five
overlapping groups. Seven isolated PowerShell install/rollback scenarios passed
on Linux with checks skipped; this is not a Windows execution claim.

The completed WebGL scene rendered real frames, then its native draw-call counter
remained unchanged for a one-second observation after settling. The A4 brief was
rendered and visually inspected, and extracted text retained the full original.
Live Groq calls were not made. Run a real investigation with your configured key
before recording the submission demo.
