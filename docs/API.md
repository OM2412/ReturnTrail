# ReturnTrail API reference

[Back to the project](../README.md) · [Authentication setup](LOGIN-SETUP.md) · [Graph queries](GRAPH-QUERIES.cypher)

These endpoints operate on the current authorized synthetic workspace. They do not send courier messages or perform refunds.


Create the CSRF/session check with `GET /api/auth/csrf`, send its token as
`X-CSRF-TOKEN` on unsafe requests, then `POST /api/guest-sessions`. Preserve the
`RTSESSION` cookie. Account sessions use the same case APIs after verified sign-in.
See [LOGIN-SETUP.md](LOGIN-SETUP.md) for direct PowerShell examples.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/auth/session` | Current account/guest status and sign-in availability |
| GET | `/api/auth/csrf` | Masked session check for unsafe requests |
| POST | `/api/auth/logout` | Sign out; saved account data remains |
| GET | `/oauth2/authorization/google` | Begin configured Google OIDC sign-in |
| GET | `/oauth2/authorization/github` | Begin configured GitHub OAuth sign-in |
| GET | `/api/cases` | Authorized guest's case library |
| GET | `/api/cases/{caseId}/snapshot` | Combined case read, findings, pending questions, tasks, notes and proof |
| POST | `/api/cases/{caseId}/evidence` | Save one reviewed synthetic text source |
| GET | `/api/cases/{caseId}/brief` | Fresh, version-checked structured case brief |
| GET | `/api/cases/{caseId}/context?exclude=DOC-001` | Read-only source-exclusion preview and saved task coverage |
| GET | `/api/cases/{caseId}/proof` | Query-derived evidence paths |
| GET | `/api/cases/{caseId}/evidence` | Original evidence |
| GET | `/api/cases/{caseId}/findings` | Historical findings, including explicit missing-context findings |
| GET/POST | `/api/cases/{caseId}/actions` | Read / prepare pending local tasks without calling a model |
| GET | `/api/cases/{caseId}/clarifications` | Saved manual notes |
| POST | `/api/cases/{caseId}/actions/clarification` | Explicit manual reply outcome |
| POST | `/api/cases/{caseId}/investigate` | Constrained Groq function-calling workflow |
| DELETE | `/api/guest-sessions` | End the guest session |

A clarification body must contain `actionId`, `note`, `outcome`
(`STILL_UNKNOWN` or `EXPLANATION_PROVIDED`), a UUID-v4 `requestId`, the task's 64-hex `evidenceRevision` and current case
`expectedVersion`. Reuse the
same ID only when retrying the exact same reply. Unknown replies retain their
original OPEN status even if a later explanation resolves the task.

Evidence capture requires `pickupId`, `sourceLabel` (80 characters), `sourceType`
(`COURIER_STATUS`, `SUPPORT_REPLY`, `CUSTOMER_NOTE` or `DEMO_NOTE`), `originalText`
(4,000 characters), exact `quote` (500 characters), `claimedStatus`
(`CUSTOMER_CANCELLED`, `COURIER_UNAVAILABLE` or `UNKNOWN`), `synthetic: true`, current
`expectedVersion` and UUID-v4 `requestId`. The entire JSON body is limited to
20,000 bytes and each case to 30 source records. No source is overwritten. A retry
with the same ID and contents returns the saved receipt; changed contents or a
stale new write returns 409. Import/task/reply writes share a 30-attempt/5-minute
budget per guest; this is separate from model-call limits.

