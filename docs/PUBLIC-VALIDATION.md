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

## Repository verification and public metadata review

The [default hosted run at `6b17316`](https://github.com/OM2412/ReturnTrail/actions/runs/39095246684)
passed on 18 October 2026: 92 backend tests total, 90 successful and two
opt-in provider checks skipped; zero failures/errors. Frontend lint/tests/build
and the browser contract job also passed. These CI checks do not replace a
public browser audit.

A subsequent read-only public check found the homepage and readiness still HTTP
200, with readiness UP. The homepage source had no canonical/Open Graph image
tags, `robots.txt` had no sitemap declaration and `/sitemap.xml` returned 404.
The missing build-time origin was then configured as
`PUBLIC_SITE_URL=https://returntrail-api.onrender.com` and the combined image
was rebuilt. The subsequent live checks confirmed:

- Homepage canonical and `og:url` use the actual public HTTPS origin.
- `og:image` points to `/share-card.png`; the PNG returns HTTP 200.
- `robots.txt` declares the public sitemap.
- `/sitemap.xml` returns HTTP 200 XML with only `/`, `/about`,
  `/how-it-works.html` and `/privacy.html`.
- Homepage and graph readiness remain HTTP 200, with readiness UP.

These are configuration/output checks, not a promise of indexing or search rank.

The operator separately configured UptimeRobot monitoring and confirmed one
monitor targets the readiness endpoint. The supplied 18 October dashboard showed
three UP monitors at five-minute intervals. Alert delivery was not independently
tested. No monitor was created by the API/model acceptance tests above.

## Hosting boundaries

- Render Free can sleep after inactivity and can restart; in-memory sessions reset.
- FalkorDB Free has no TLS, persistence or backups; database credentials travel
  without transport encryption on that tier. It can stop/delete inactive instances.
- Keep this deployment guest-only and synthetic. Do not use it for real customer
  records or claim durable saved accounts. Export a brief before leaving.
- Google login and a YouTube demo video were not configured by these checks.
- A passing readiness response checks the graph, not the model. The AI request
  above was a separate acceptance check.

See [current deployment and alternatives](DEPLOYMENT.md), [optional split hosting
and provider references](VERCEL-RENDER.md), and the [documentation index](README.md).
