// Bind $caseId from the authenticated guest workspace. Never accept arbitrary Cypher.
// Executed by CaseEvidenceRepository for source records and proof paths.
MATCH (c:Case {id:$caseId})-[:HAS_ORDER]->(o:Order)-[:CONTAINS]->(i:Item)
MATCH (c)-[:HAS_RETURN]->(r:ReturnRequest)-[:RETURNS]->(i)
MATCH (p:PickupAttempt)-[:ATTEMPTS]->(r)
MATCH (s:SupportStatement)-[:ABOUT]->(p)
MATCH (s)-[:RECORDED_IN]->(d:EvidenceDocument)
RETURN DISTINCT c.id AS caseId, o.id AS orderId, i.id AS itemId,
r.id AS returnId, p.id AS pickupId, s.id AS statementId,
s.claimedStatus AS claimedStatus, s.text AS statement,
d.id AS evidenceId, d.sourceType AS sourceType
ORDER BY evidenceId, statementId;

// Read saved task/source relationships for a case.
MATCH (c:Case {id:$caseId})-[:HAS_ACTION]->(a:Action)-[:REFERENCES]->(d:EvidenceDocument)
RETURN c.id AS caseId, a.id AS actionId, a.status AS taskStatus, d.id AS evidenceId;

// Read persisted manual context; status at recording remains immutable.
MATCH (:Case {id:$caseId})-[:HAS_ACTION]->(a:Action)-[:HAS_CLARIFICATION]->(n:ClarificationRecord)
RETURN a.id AS actionId, n.id AS clarificationId, n.text AS note,
       coalesce(n.taskStatus, a.status) AS statusAtRecording, n.source AS source;

// Context lab uses the same complete owned order/item/return/pickup path, with
// an exact parameterized exclusion in GRAPH.RO_QUERY before the RETURN clause:
// WHERE d.id <> $excludedEvidenceId
// No DETACH DELETE, write, model-generated Cypher or task update is performed.
// The preview is checked against current evidence/workflow version counters.
