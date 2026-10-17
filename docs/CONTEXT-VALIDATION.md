# Context upgrade validation

Verified in this workspace on 17 October 2026 IST. See `CONTEXT-VALIDATION.json` for exact test-group counts and scoped results. These are implementation checks, not a 95+ judge score, a production certification or evidence of real customer outcomes.

## Execution environment

- Java 21, Maven 3.9.16, Node 24, Vite/React and Playwright Chromium.
- Actual FalkorDB 4.22.1 module loaded into a local Redis process. Its build matches the pinned database image; the Docker image itself was not run here.
- Browser tests use an isolated portable Chromium and fallback fonts. Five routes additionally ran axe-core WCAG A/AA tags after contrast and visible-label fixes.
- PowerShell 7.6.7 on Linux for installer/rollback scenarios. Windows PowerShell execution remains a user-machine acceptance step.
- No real Google, GitHub or Groq credentials were supplied. Live model calls: **zero**.

## Backend and access checks

The default Maven run passes **88 tests**, with two opt-in provider integration classes skipped by default. Those two classes also pass separately with local providers and actual Spring Security filters/FalkorDB.

The local GitHub-style provider checks authorization state, PKCE, callback/session rotation, CSRF logout, saved re-login and two-account isolation. The local Google OIDC provider signs RS256 ID tokens, serves JWKS, and tests saved re-login, account isolation and rejection of wrong nonce, wrong audience and expired tokens. Unit checks also distinguish provider/subject namespaces and reject a plain OAuth principal masquerading as a Google OIDC identity.

This validates the implemented protocol path under controlled providers. It does not establish successful configuration, provider-console audience approval, consent or credentials on actual Google/GitHub. Those external callback tests are documented in `LOGIN-SETUP.md`.

Real API/database checks cover:

- Immutable source capture, exact quote containment, source ownership and size/source caps.
- Stale-version and concurrent writes; one winner for the same expected version.
- Retried source/note submissions reusing the original result instead of duplicating data.
- A new source revision requiring a new review while preserving the old resolved task and earlier notes.
- A “still unknown” reply remaining open; an explicit manual explanation covering only its reviewed revision.
- Foreign-case pickup/source rejection and isolation across guest sessions.
- A current brief retaining full original text, source IDs, versions and the actual seven-link ownership proof.
- Read-only exclusion returning remaining actual paths; no source deletion, version increment, task resolution or model request.
- Saved-memory coverage derived from the recorded Action→REFERENCES edges.
- A healthy graph participating in readiness; after stopping the graph process, readiness is DOWN/503 while liveness remains UP/200.

All concurrency guarantees assume supported application writes update the version counters. Direct out-of-band database edits do not receive those guarantees.

## Browser and visual checks

The workspace, inbox and Context lab suites use real Spring/FalkorDB API responses. Separate browser-contract and auth UI suites use explicitly mocked API responses to exercise failure/recovery states. Counts in the JSON are assertion groups, not unique people or production sessions.

Checks include case-specific navigation/deep-link reload, source filters, returned paths, unknown/explicit replies, export/print, post-save refresh failure recovery, new context, CSRF/logout UI, independent provider availability and safe rendering of script-shaped source/profile text.

Existing workspace routes are checked at 320, 390, 768, 1024 and 1440 pixels. Context lab checks 320/390/768 pixels. Lamp states check 320/390/768/1440 pixels, pointer pull, keyboard toggling, guest access with the lamp off and no sign-in WebGL bundle request. Current Context lab desktop/tablet and lamp screenshots were inspected locally.

Five representative routes (`/signin`, overview, Context lab, Case brief and Investigation for CASE-004) have **zero serious/critical axe findings** in the tested state. This does not cover every route, screen reader, keyboard path, zoom combination, browser, provider-enabled state or assistive technology; no full WCAG certification is claimed.

## Build, metadata and dependencies

- Frontend lint, 12 Node unit/API/draft tests and production build pass.
- The built frontend is embedded in a Spring production JAR and served on the same origin. Its root metadata, static public guides, private SPA deep link/noindex header, public-only sitemap and immutable hashed-asset cache headers are tested.
- Metadata tests use a deliberately invalid example HTTPS hostname. The user's real public origin must be set before a deployed build; no claim of domain registration or Google indexing is made.
- Production `npm audit --omit=dev` reports zero known vulnerabilities in its registry response at check time. This is not a complete dependency/application security audit.
- Java 21 test instrumentation is explicitly configured for Mockito, rather than relying on dynamic JVM attachment. The test agent is not part of the running application command.
- WebGL is lazy loaded, and sign-in does not request it. No Lighthouse, Core Web Vitals, production load, CPU or memory benchmark score is claimed.

## Installer verification

Ten isolated Git-worktree scenarios cover install/byte-exact restore, repeated install, CRLF input, unknown local edits, corrupt payload, edits after install, three earlier update baselines and binary artwork protection. Git index/history and unrelated files are preserved in these scenarios.

Installer verification runs with `-SkipChecks` on Linux PowerShell; the equivalent Maven/npm commands are checked separately. It is not Windows execution. The default installer runs a fresh npm install and checks on the user's machine. Source rollback does not restore database records, credentials or node_modules; run `npm ci` after reverting dependency source.

## Still needs external evidence

1. Actual Google callback and saved re-login on the user's final origin.
2. One real Groq investigation with the returned tool trace.
3. Docker/Caddy build, HTTPS, persistence and consistent backup/restore on the chosen host; one replica remains supported.
4. The first hosted GitHub Actions run after the user commits and pushes.
5. Five nontechnical-user observations, a clean-checkout teammate walkthrough and the final demonstration video.
6. Any claims about demand, competitors, commercial value, search ranking or real-world accuracy require their own evidence.

See `QUALITY-GATES.md` for the unchanged weighted five-phase target and `RESOURCE-RESEARCH.md` for official material actually inspected.
