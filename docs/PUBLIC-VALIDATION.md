# Public deployment validation — 18 October 2026

Public guest preview: https://returntrail-api.onrender.com

These are observations from a bounded check of the deployed application, not an
uptime guarantee or a real-world accuracy benchmark. The application and UI are
served from the same Render origin. This deployment uses an external FalkorDB
Cloud Free instance; Vercel is not needed to access this current preview.

## Public HTTP observations

- `GET /actuator/health/readiness`: HTTP 200, `{"status":"UP"}`.
- `GET /`: HTTP 200, HTML containing the React root.
- `GET /api/auth/session` without a session: HTTP 200, unauthenticated,
  workspace mode NONE, Google and GitHub sign-in both disabled.
- Public browser rendering and accessibility were not re-audited in this check.

## Live synthetic guest workflow

Ran `frontend/tests/evidence-api.mjs` with `API_URL` set to the actual public
Render origin. All five API workflow groups passed against the external graph:

1. An immutable source retry preserves one source; new evidence requires fresh
   review while the historical task is retained.
2. Stale task/revision checks reject unsupported writes; unknown and explanation
   outcomes preserve immutable note history.
3. Wrong pickup ownership, stale versions, unsupported quotes, missing fictional
   consent and oversized input cannot write.
4. Two concurrent imports allow one version commit; an earlier identical note
   retry remains safe.
5. A fresh case brief carries exact source/proof paths; the second guest does
   not see the first guest's imported source.

The suite used disposable guest workspaces with fictional fixture records.
It closed both test sessions. It made zero model requests.

## One actual AI investigation

A separate fresh guest ran `POST /api/cases/CASE-001/investigate`.

| Observed field | Result |
| --- | --- |
| Method | AI_TOOL_CALLING |
| Model | openai/gpt-oss-120b |
| Model requests | 4 |
| Tools, in order | get_case_evidence → get_case_clarifications → get_case_findings → prepare_followup_action |
| Pending findings | 1 |
| Prepared action | One OPEN local follow-up |
| External courier/customer message | None |

The report is rendered from executed tool results in Java. This confirms one
actual hosted provider workflow; it does not establish model quality for other
inputs or continuous provider availability. No API key or session credential is
stored in this validation record. The separate test guest was closed afterward.

## Hosting boundaries

- Render Free can sleep after inactivity and can restart; in-memory sessions reset.
- FalkorDB Free has no TLS, persistence or backups; database credentials travel
  without transport encryption on that tier. It can stop/delete inactive instances.
- Keep this deployment guest-only and synthetic. Do not use it for real customer
  records or claim durable saved accounts. Export a brief before leaving.
- No uptime monitor, Google login or YouTube video was configured by these checks.
- A passing readiness response checks the graph, not the model. The AI request
  above was a separate acceptance check.

See [Vercel/Render setup and provider references](VERCEL-RENDER.md) and
[the production deployment route](DEPLOYMENT.md) for alternatives with persistent
private graph storage.
