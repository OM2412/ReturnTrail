# The 95+ acceptance target

This is a quality target, not a claimed score or a promise of winning. The earlier audit used five weighted phases: product 20%, UI 20%, graph/backend 30%, trust 20%, delivery 10%. This update does not change those weights to make its own score look better. The organizer's public page did not publish those percentages.

Software checks establish a bounded implementation. They cannot establish customer demand, real-world refund outcomes, public uptime or Google ranking. A 95+ claim across every phase is not justified while those external facts remain unverified.

## Phase 1 — Product and market

1. A specific user and job are clear: a shopper preparing an evidence-linked conversation about a disputed pickup.
2. At least five nontechnical observations are recorded, including misunderstandings and failed tasks; do not invent results.
3. The prototype is compared with a notes-document baseline on the same task. Report sample size, completion and actual time; do not generalize to population accuracy.
4. Supported inputs and outcomes match the marketing. Current release is fictional, not arbitrary receipt ingestion or refund recovery.
5. A buyer/channel hypothesis is grounded in actual interviews before commercial value is scored highly. A support-team product remains a hypothesis, not current validated revenue.

## Phase 2 — Frontend and comprehension

1. Each feature opens on its own route and survives a direct link/reload.
2. Every main page has an understandable next action; advanced implementation details can be inspected without dominating the flow.
3. Keyboard, reduced motion, 200% zoom and mobile 320/390/768px are checked. Automated axe scans complement manual contrast/focus/screen-reader inspection, not replace it.
4. Production loading and interaction are measured on a modest device. No Lighthouse/Core Web Vitals result is invented.
5. At least four of five observed users complete the intended brief workflow without assistance before claiming this internal usability target is met.

## Phase 3 — Graph and backend

1. Actual FalkorDB paths explain why a source belongs to the selected case and pickup, including negative different-attempt examples.
2. New source context does not silently inherit an old explanation. Old records remain, and task coverage can be inspected.
3. Counterfactual exclusion is read-only, authorized and version checked. No-result/no-evidence states do not become “verified” or “case resolved.”
4. Idempotency, stale/concurrent write handling, case/account isolation and source limits pass meaningful tests on the actual pinned DB build.
5. An actual Groq run is recorded with its returned trace before claiming external AI works. Local mock/provider results are labeled as such. Current rule scope is narrow and synthetic.

## Phase 4 — Access and trust

1. Real Google credentials complete sign-in on the final origin; configured guest entry remains usable. Email OTP is not implemented in this update.
2. OIDC state/nonce/signature/issuer/audience/expiry, session rotation, CSRF logout and provider-subject isolation are checked. Provider API tokens are not kept after sign-in; the OIDC identity remains in server session state.
3. Saved-account re-login, database persistence and a backup/restore exercise are verified on the intended host. One backend replica remains the supported limit.
4. The privacy/retention/deletion approach matches the release. Current synthetic-only prototype has no self-service deletion or arbitrary real-data intake; do not present it as a production personal-case service.
5. Dependency review, secrets handling, least privilege, abuse budgets and failure behavior are checked for the actual deployment. Passing tests alone is not a security certification.

## Phase 5 — Delivery, SEO and submission

1. A stable public HTTPS origin works, or the organizer-permitted local setup/video alternative is fully reproducible. Docker/CI files alone are not proof of deployment.
2. A partner starts a clean checkout using README without hidden local files or secrets.
3. Public metadata, sharing image and sitemap match the real origin. Private case data stays authenticated; noindex is supplementary, not access control.
4. The final video matches the final build, shows a graph-dependent changed action, and every submission link is checked.
5. README, current validation, architecture, limitations and AI assistance/asset attribution agree. Do not claim search rank, users, benchmark accuracy or official integrations that were not established.

## Remaining external gates

- Actual Google account configuration and a real external callback.
- One real Groq/model run using the operator's key.
- Target-host Docker/Caddy/TLS/backup and persistence validation; no Docker daemon or hosting credentials were available in this workspace.
- A hosted GitHub Actions run after the user pushes; local command equivalents are tested separately.
- Human comprehension observations, commercial validation and final demo video.
- Domain availability/ownership, Search Console and eventual search performance.

## Keep scope under control before 18 October

A source-linked, reliable, explainable demonstration has more value than untested OCR, payments, phone OTP or a multi-agent label. Freeze features with enough time for a fresh walkthrough, current docs and an accurate submission. Do not assign 95+ until the evidence supports it.
