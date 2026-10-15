# ReturnTrail

Graph-backed investigation for stuck e-commerce returns and refunds.

Built for WeMakeDevs Graph Hacks with FalkorDB.

## Track

Primary: Agents That Act on Connected Data.

## Current implementation

- Local FalkorDB with a pinned Docker image and persistent volume.
- Synthetic Case 1 with conflicting statements about one pickup.
- Spring Boot API retrieves source-linked evidence from FalkorDB.
- Java target: 21.
- Spring Boot: 4.1.1.
- JFalkorDB: 0.13.1.
- Jedis: 8.0.1, explicitly aligned with the graph client.

## Run locally

From the repository root:

    docker compose up -d

Seed Case 1 in PowerShell:

    $seedQuery = Get-Content backend/src/main/resources/graph/seed-case-001.cypher -Raw
    docker compose exec -T falkordb redis-cli GRAPH.QUERY returntrail_dev $seedQuery

Start the backend:

    cd backend
    mvn test
    mvn spring-boot:run

Application health:

    http://localhost:8085/actuator/health

Graph-backed evidence:

    http://localhost:8085/api/cases/CASE-001/evidence

The evidence endpoint should return two records.

## Data model implemented

Case -> HAS_ORDER -> Order -> CONTAINS -> Item
PickupAttempt -> ATTEMPTS -> ReturnRequest -> RETURNS -> Item
SupportStatement -> ABOUT -> PickupAttempt
SupportStatement -> RECORDED_IN -> EvidenceDocument

## Current limitations

Local development only. The current endpoint reads one synthetic case.
Session isolation, AI investigation and action execution are not yet implemented.
Application health alone does not establish graph readiness.

## Data

All seeded case records are synthetic.
Do not submit real personal receipts, bank records or private conversations.

## AI assistance

ChatGPT assisted with planning, code suggestions and debugging.
Team members run, verify and review the implementation.
