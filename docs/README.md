# ReturnTrail documentation

**[Open the live guest preview](https://returntrail-api.onrender.com)** · [Project overview](../README.md) · [Current public validation](PUBLIC-VALIDATION.md)

The current preview serves React and Spring from one Render origin with an external FalkorDB Cloud Free instance. It uses fictional workspaces. Guest entry and Google/GitHub provider registrations are configured; completed provider sign-in requires its separate acceptance check.

## Start here

| Goal | Read |
| --- | --- |
| Try the product and understand the problem | [Main README and walkthrough](../README.md#try-the-demo) |
| Understand why the graph changes the result | [Graph model](../README.md#why-a-graph), [executed query shapes](GRAPH-QUERIES.cypher), [resource decisions](RESOURCE-RESEARCH.md) |
| See what passed on the public deployment | [Public validation — 18 October 2026](PUBLIC-VALIDATION.md) |
| Run locally or reproduce hosting | [Local setup](../README.md#run-locally), [current deployment and alternatives](DEPLOYMENT.md) |
| Inspect request contracts | [API reference](API.md) |
| Understand source writes and saved context | [Evidence workflow](EVIDENCE-WORKFLOW.md), [context update](CONTEXT-UPDATE.md) |
| Prepare the release | [Acceptance checklist](QUALITY-GATES.md), [user observation plan](USER-VALIDATION.md) |

## Optional setup and historical records

- [Login setup](LOGIN-SETUP.md): optional Google/GitHub account deployments.
- [Vercel + Render](VERCEL-RENDER.md): alternative split hosting; not the current live topology.
- [Temporary laptop preview](PUBLIC-DEMO.md): requires the laptop to remain online.
- [Team and video configuration](TEAM-POLISH.md), [photo preparation](PHOTO-EDIT.md), [README asset provenance](README-ASSETS.md).
- [Team validation](TEAM-VALIDATION.md), [context validation](CONTEXT-VALIDATION.md), [workspace validation](WORKSPACE-VALIDATION.md): earlier results with their original dates and scopes.
- [Frontend design notes](../frontend/docs/UI-POLISH.md), [earlier frontend checks](../frontend/docs/TEST-RESULTS.md).

Historical records are preserved. Use the current public validation and release checklist for today's status. Tests on synthetic fixtures do not establish market demand, real-world accuracy or durable free hosting.
