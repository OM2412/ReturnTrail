MERGE (c:Case {id:'CASE-001'})
SET c.synthetic = true, c.title = 'Pickup cancellation disagreement'
MERGE (o:Order {id:'ORDER-001'})
SET o.amountPaise = 599900, o.currency = 'INR'
MERGE (i:Item {id:'ITEM-001'})
SET i.name = 'Sample headphones'
MERGE (r:ReturnRequest {id:'RETURN-001'})
MERGE (p:PickupAttempt {id:'PICKUP-001'})
MERGE (d1:EvidenceDocument {id:'DOC-001'})
SET d1.synthetic = true, d1.sourceType = 'COURIER_STATUS'
MERGE (s1:SupportStatement {id:'STATEMENT-001'})
SET s1.claimedStatus = 'CUSTOMER_CANCELLED',
    s1.text = 'Pickup cancelled by customer.',
    s1.speakerRole = 'COURIER_SYSTEM'
MERGE (d2:EvidenceDocument {id:'DOC-002'})
SET d2.synthetic = true, d2.sourceType = 'SUPPORT_REPLY'
MERGE (s2:SupportStatement {id:'STATEMENT-002'})
SET s2.claimedStatus = 'COURIER_UNAVAILABLE',
    s2.text = 'Pickup failed because the courier was unavailable.',
    s2.speakerRole = 'SUPPORT_AGENT'
MERGE (c)-[:HAS_ORDER]->(o)
MERGE (o)-[:CONTAINS]->(i)
MERGE (r)-[:RETURNS]->(i)
MERGE (p)-[:ATTEMPTS]->(r)
MERGE (s1)-[:ABOUT]->(p)
MERGE (s2)-[:ABOUT]->(p)
MERGE (s1)-[:RECORDED_IN]->(d1)
MERGE (s2)-[:RECORDED_IN]->(d2)
RETURN c.id AS caseId, o.id AS orderId, p.id AS pickupId
