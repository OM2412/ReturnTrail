# Release checklist and supporting evidence

Updated 18 October 2026. This is an internal acceptance checklist, not an official judging rubric or a claimed score. The preparation weights were product 20%, UI 20%, graph/backend 30%, trust 20% and delivery 10%; the organizer did not publish those percentages.

Software checks establish a bounded implementation. They cannot establish customer demand, real-world refund outcomes, public uptime or Google ranking. A 95+ claim across every phase is not justified while those external facts remain unverified.

## Completed checks and remaining scope

| Gate | Recorded status |
| --- | --- |
| Public guest deployment | [Render preview](https://returntrail-api.onrender.com) is live; [five public API workflow groups passed](PUBLIC-VALIDATION.md). |
| Public metadata | The combined image was rebuilt with its actual public origin. Canonical/share metadata, PNG, robots declaration and four-page sitemap passed the live check; see [Public validation](PUBLIC-VALIDATION.md). |
| Actual model investigation | One hosted Groq run completed four model requests and all four required tools in order. This does not establish continuous model availability or general accuracy. |
| Default hosted CI | [Run at `6b17316`](https://github.com/OM2412/ReturnTrail/actions/runs/39095246684) passed: 90 backend tests successful, two provider checks skipped; frontend lint/tests/build and browser contracts passed. |
| Production container checks | [Combined deployment](https://github.com/OM2412/ReturnTrail/actions/runs/39093978200) and [backend-only deployment](https://github.com/OM2412/ReturnTrail/actions/runs/39093978115) passed at `efabfdc`. Runner persistence checks do not establish persistence on FalkorDB Cloud Free. |
| Provider sign-in | Both public registrations are enabled; authorization redirects target the real providers with the correct public callbacks. Completed Google/GitHub login, logout, re-login and account isolation still require real-browser acceptance. |
| Human validation and video | User observations, commercial validation and the final working demo video remain pending. |
| Production durability | The public free graph has no TLS, persistence or backups. Durable saved accounts and real customer data are outside this preview. |

The five phases below describe acceptance criteria; they are not a claim that every item has passed.

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

## Remaining release work

- Record and link the final working demo video.
- Observe nontechnical users using the brief workflow and record actual results in [USER-VALIDATION.md](USER-VALIDATION.md).
- Complete a clean-checkout walkthrough on a teammate's machine.
- Retain and recheck public metadata when changing the deployment origin; the current origin's canonical/share/sitemap checks have passed.
- Complete Google and GitHub browser sign-in, cancellation, logout, re-login and account isolation checks on the final origin.
- Recheck the final public UI on mobile, keyboard and reduced motion; prior API checks are not a new browser audit.
- For a future saved-account release: enable TLS and durable graph storage, test backup/restore and complete real provider callback/account-isolation checks.
- A custom domain and Search Console are optional future work, not evidence of search ranking.

## Keep scope under control before 18 October

A source-linked, reliable, explainable demonstration has more value than untested OCR, payments, phone OTP or a multi-agent label. Freeze features with enough time for a fresh walkthrough, current docs and an accurate submission. Do not assign 95+ until the evidence supports it.
