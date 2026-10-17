# Organizer resources: decisions applied to ReturnTrail

Research date: 17 October 2026 IST. This records resources actually read and the choices made from them. No claim is made that unavailable videos were watched or that every listed integration was installed.

## Event intent

The organizer requires FalkorDB to support the product centrally. ReturnTrail's primary track is the connected-data agent track. The public pages inspected do not publish numerical judge percentages; the audit's weights are our own preparation rubric. A local task is an application action, not an external merchant/refund operation. There is no multi-agent implementation to claim.

- Event: https://www.wemakedevs.org/hackathons/falkordb
- Resource directory: https://www.wemakedevs.org/hackathons/falkordb/resources
- Rules: follow the actual registration/submission panel and organizer page for final requirements.

## Resource-to-code decisions

| Resource inspected | Relevant lesson | Decision in this update | Verification boundary |
| --- | --- | --- | --- |
| Organizer's graph-agent tutorial | Fixed tools, returned paths, separately identified memory and explicit unknown outcomes | Keep fixed queries; add an actual read-only source-exclusion query and explain saved task source coverage | Actual graph queries are integration-tested; no generated Cypher |
| Getting Started / Java client | Property-graph relationships and explicit reads/writes | Retain official Java driver and existing pinned DB image; no last-minute framework replacement | Tested against that FalkorDB build, not every current database release |
| Cypher reference / limitations | Query shape and relationship semantics matter | Preserve all ownership edges; compare document/statement IDs with DISTINCT rather than making claims about edge multiplicity | Concurrent app writes checked through version counters; out-of-band DB edits are outside that guarantee |
| Algorithms index | Paths, centrality, components and flow answer different questions | Do not use centrality to infer truthful claims; existing explicit evidence paths better match current task | No PageRank, WCC, max-flow or graph-algorithm performance claims |
| GraphRAG SDK README | Schema-based ingestion, provenance context and incremental updates | Useful later for a corpus ingestion/extraction release, with manual review and separate extraction evaluation | SDK is not installed or used by current ReturnTrail; its published benchmarks are not ours |
| Integrations directory | Multiple ways to access the same graph | Existing Java client fits this stack; a new Python service is not required for these improvements | Custom provider tool calls are not described as MCP |
| Community projects | Existing examples show a range of use cases | Judge the project on its evidence workflow, not novelty of saying “AI + graph” | No claim of worldwide uniqueness or that competitors lack graphs |
| Video links | Cypher/algorithms talks are listed | Linked pages did not yield readable content in this environment; written official references used instead | Videos not claimed as reviewed |

## Concrete differentiation implemented

### 1. A saved explanation has a visible context boundary

The graph already stores `Case → Action → EvidenceDocument` source references and `Action → ClarificationRecord` notes. Context lab compares those actual references with the current sources for the task's pickup. It shows reviewed IDs, newly added IDs, last note time and the task's historical state. An old resolved task can coexist with new context requiring review. Matching a source set never verifies a note.

### 2. A bounded, read-only counterfactual

`GET /api/cases/{caseId}/context?exclude=DOC-001` reruns the fixed ownership query with an exact source-ID exclusion. It does not delete nodes or alter saved tasks. The supported detector evaluates the returned graph rows. The response includes the remaining proof paths and distinct outcomes for no evidence, a supported disagreement, missing context and no supported finding. It is a diagnostic thought experiment, not causal proof that one source is false.

The preview checks evidence/workflow versions around its reads and rejects a moving case after one retry. The selected source must already belong to the authorized case. Same-order/different-attempt records remain distinct. No model is called for this feature.

### 3. A useful action with an honest fallback

AI investigation remains an explicit Groq tool-calling operation. A separate “Review rules & prepare question” action uses the existing deterministic endpoint and is labeled accordingly. It does not manufacture an AI trace. The fresh brief also offers a reviewable source-linked message draft, copied only on request, never sent automatically.

## What would be worth adding later

- Source ingestion/extraction with provenance spans and a reviewed entity-linking step, if the product begins accepting real documents.
- A versioned evidence dependency model if one source supports several separate claims; analyze invalidation along the actual dependency edges.
- Full-text search when there are enough sources for retrieval to matter; keep case/tenant scope enforced in the query.
- An MCP adapter around the same typed, authorized queries if interoperability is a real requirement. Do not expose an unrestricted query tool.
- A graph algorithm only when a real task requires route/ranking/component analysis. Degree or PageRank is not evidence reliability.

No new framework automatically improves user outcomes. Each added component needs a measurable use case and an acceptance test.

## Primary references

- Tutorial: https://www.wemakedevs.org/blogs/how-to-build-an-agent-that-reasons-over-a-graph
- Getting started: https://docs.falkordb.com/getting-started/
- Documentation index: https://docs.falkordb.com/llms.txt
- Cypher: https://docs.falkordb.com/cypher/
- Limitations: https://docs.falkordb.com/cypher/known-limitations
- Algorithms: https://docs.falkordb.com/algorithms/
- Integrations: https://docs.falkordb.com/integration/
- SDK: https://github.com/FalkorDB/GraphRAG-SDK
- Community: https://www.falkordb.com/community-projects/
