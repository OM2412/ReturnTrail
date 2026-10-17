# Context upgrade — 17 October 2026

This update extends the existing lamp/workspace/evidence release. It does not create a second application, rewrite Git history or change commit authors. The supplied installer preserves an exact local backup and refuses to overwrite unrecognized edits.

## What changes for the person using ReturnTrail

1. **Enter without GitHub.** Guest exploration is the first action on the lamp page. Google saved sign-in is available when the operator configures its Web OAuth client; GitHub is an optional developer alternative. Turning off the lamp never hides access controls.
2. **Understand why context matters.** Each case has a separate **Context lab** route. Set aside one source in a read-only preview and inspect the remaining actual graph paths. A disappearing rule disagreement does not mean the remaining claim is true.
3. **See what an old explanation covers.** Saved tasks show their recorded source IDs, current source IDs and any additions. A historical resolved task stays historical when new evidence requires a fresh review.
4. **Proceed when AI is unavailable.** **Review rules & prepare question** is an explicit deterministic operation. It can prepare/reuse a local follow-up task without a Groq request and is labeled separately from AI investigation.
5. **Leave with something useful.** The fresh Case brief can prepare a fictional support-message draft containing exact source text and references. Copying is explicit. ReturnTrail does not send it, contact a courier or recover a refund.

The existing animated parcel experience, separate feature routes, source inbox, original-text inspection, manual replies, trace and export workflows remain part of the application.

## The graph-dependent demonstration

Use a new guest workspace so the practice cases start from their seed data:

| Step | Visible result | What to explain |
| --- | --- | --- |
| CASE-001 → Connections | Both source statements lead to the same pickup | The ownership path, rather than similar wording, establishes which records can be compared |
| CASE-001 → Context lab → set aside DOC-001 | One remaining source path; supported disagreement disappears | This is a read-only diagnostic preview, not deletion or proof that DOC-002 is correct |
| CASE-001 → Investigation → Review rules & prepare question | One real local task, source-linked | This route uses deterministic rules and no model; demonstrate AI separately if a key is configured |
| CASE-002 → Context lab | Different attempts do not become a same-attempt conflict | A negative example matters as much as the positive example |
| CASE-004 → Context lab | Earlier explanation covers its reviewed sources | A saved explanation has a bounded context |
| CASE-004 → Add source → add a fictional new source to PICKUP-004 | New source appears outside the earlier task's references; previous task retains its historical state | New context reopens review, rather than silently inheriting an old answer |
| CASE-004 → Case brief → Prepare a support message | A current, source-linked fictional draft | A manual explanation is not independently verified; zero pending questions does not establish whole-case resolution |

For the AI portion, run **AI investigation** with the operator's configured Groq key and show the actual returned tool trace. A deterministic review or local provider test is not proof that the external model call worked.

## Delivery and performance changes

- FalkorDB participates in readiness. The process liveness endpoint stays separate from database availability.
- Provider user-info/token HTTP calls have bounded timeouts. Investigation has a deadline checked between calls; it is not a hard in-flight cancellation guarantee.
- Known private SPA routes reload from the combined Spring application. Hashed assets have immutable caching; 3D remains lazy loaded.
- Public how-it-works/privacy pages and share artwork are included. Build-time `VITE_PUBLIC_URL` can produce metadata and a public-only sitemap for the actual HTTPS origin. Private pages are noindex, with session authorization enforced independently.
- A Docker/Caddy configuration and a GitHub Actions workflow are supplied. They need verification on the chosen host/remote service; local source checks are not a deployment claim.
- Test instrumentation is explicit for Java 21, so Mockito tests do not depend on dynamic agent self-attachment.

## Read before the final submission

- [Current validation](CONTEXT-VALIDATION.md): exact check counts and their scope.
- [Organizer resources](RESOURCE-RESEARCH.md): inspected official material and implementation decisions.
- [Login setup](LOGIN-SETUP.md): exact Google callback and optional GitHub setup.
- [Deployment](DEPLOYMENT.md): one-instance boundaries and host acceptance steps.
- [Quality gates](QUALITY-GATES.md): five weighted phases and evidence needed before claiming 95+.
- [User observations](USER-VALIDATION.md): blank template to record real results.

This is a synthetic prototype for a narrowly defined pickup-record review task. It does not yet accept arbitrary receipts/PDFs, independently verify a courier's claim, merge account providers, provide email/phone OTP, guarantee a refund, or establish product-market fit. Larger datasets and additional frameworks should follow an evaluated use case rather than a deadline-driven feature list.
