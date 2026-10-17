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
MERGE (c)-[:HAS_RETURN]->(r)
MERGE (r)-[:RETURNS]->(i)
MERGE (p)-[:ATTEMPTS]->(r)
MERGE (s1)-[:ABOUT]->(p)
MERGE (s2)-[:ABOUT]->(p)
MERGE (s1)-[:RECORDED_IN]->(d1)
MERGE (s2)-[:RECORDED_IN]->(d2)
SET c.scenario = 'PICKUP_DISAGREEMENT', c.description = 'Two records disagree about the same pickup.', c.lesson = 'Compare records about the same attempt before asking for an explanation.'
MERGE (c002:Case {id:'CASE-002'}) SET c002.synthetic = true, c002.title = 'Different attempts, different outcomes', c002.scenario = 'SEPARATE_ATTEMPTS', c002.description = 'Similar words, but two separate pickup attempts.', c002.lesson = 'Different attempts are kept separate. No supported disagreement is detected.'
MERGE (o002:Order {id:'ORDER-002'}) SET o002.amountPaise = 249900, o002.currency = 'INR'
MERGE (i002:Item {id:'ITEM-002'}) SET i002.name = 'Fictional demo item'
MERGE (r002:ReturnRequest {id:'RETURN-002'})
MERGE (c002)-[:HAS_ORDER]->(o002)
MERGE (o002)-[:CONTAINS]->(i002)
MERGE (c002)-[:HAS_RETURN]->(r002)
MERGE (r002)-[:RETURNS]->(i002)
MERGE (p002_A:PickupAttempt {id:'PICKUP-002-A'})
MERGE (p002_A)-[:ATTEMPTS]->(r002)
MERGE (d003:EvidenceDocument {id:'DOC-003'}) SET d003.synthetic = true, d003.sourceType = 'COURIER_STATUS'
MERGE (s003:SupportStatement {id:'STATEMENT-003'}) SET s003.claimedStatus = 'CUSTOMER_CANCELLED', s003.text = 'The customer cancelled pickup attempt A.', s003.speakerRole = 'SYNTHETIC_DEMO'
MERGE (s003)-[:ABOUT]->(p002_A)
MERGE (s003)-[:RECORDED_IN]->(d003)
MERGE (p002_B:PickupAttempt {id:'PICKUP-002-B'})
MERGE (p002_B)-[:ATTEMPTS]->(r002)
MERGE (d004:EvidenceDocument {id:'DOC-004'}) SET d004.synthetic = true, d004.sourceType = 'SUPPORT_REPLY'
MERGE (s004:SupportStatement {id:'STATEMENT-004'}) SET s004.claimedStatus = 'COURIER_UNAVAILABLE', s004.text = 'No courier was available for pickup attempt B.', s004.speakerRole = 'SYNTHETIC_DEMO'
MERGE (s004)-[:ABOUT]->(p002_B)
MERGE (s004)-[:RECORDED_IN]->(d004)
MERGE (c003:Case {id:'CASE-003'}) SET c003.synthetic = true, c003.title = 'The missing piece', c003.scenario = 'MISSING_CONTEXT', c003.description = 'A pickup failure was recorded without an explanation.', c003.lesson = 'An unknown reason needs context; it is not proof of customer or courier fault.'
MERGE (o003:Order {id:'ORDER-003'}) SET o003.amountPaise = 249900, o003.currency = 'INR'
MERGE (i003:Item {id:'ITEM-003'}) SET i003.name = 'Fictional demo item'
MERGE (r003:ReturnRequest {id:'RETURN-003'})
MERGE (c003)-[:HAS_ORDER]->(o003)
MERGE (o003)-[:CONTAINS]->(i003)
MERGE (c003)-[:HAS_RETURN]->(r003)
MERGE (r003)-[:RETURNS]->(i003)
MERGE (p003:PickupAttempt {id:'PICKUP-003'})
MERGE (p003)-[:ATTEMPTS]->(r003)
MERGE (d005:EvidenceDocument {id:'DOC-005'}) SET d005.synthetic = true, d005.sourceType = 'COURIER_STATUS'
MERGE (s005:SupportStatement {id:'STATEMENT-005'}) SET s005.claimedStatus = 'UNKNOWN', s005.text = 'Pickup failed. No reason was recorded.', s005.speakerRole = 'SYNTHETIC_DEMO'
MERGE (s005)-[:ABOUT]->(p003)
MERGE (s005)-[:RECORDED_IN]->(d005)
MERGE (c004:Case {id:'CASE-004'}) SET c004.synthetic = true, c004.title = 'A reply, with history kept', c004.scenario = 'SAVED_CLARIFICATION', c004.description = 'A synthetic manual reply is already attached to the follow-up.', c004.lesson = 'A resolved follow-up does not erase original records or verify the whole case.'
MERGE (o004:Order {id:'ORDER-004'}) SET o004.amountPaise = 249900, o004.currency = 'INR'
MERGE (i004:Item {id:'ITEM-004'}) SET i004.name = 'Fictional demo item'
MERGE (r004:ReturnRequest {id:'RETURN-004'})
MERGE (c004)-[:HAS_ORDER]->(o004)
MERGE (o004)-[:CONTAINS]->(i004)
MERGE (c004)-[:HAS_RETURN]->(r004)
MERGE (r004)-[:RETURNS]->(i004)
MERGE (p004:PickupAttempt {id:'PICKUP-004'})
MERGE (p004)-[:ATTEMPTS]->(r004)
MERGE (d006:EvidenceDocument {id:'DOC-006'}) SET d006.synthetic = true, d006.sourceType = 'COURIER_STATUS'
MERGE (s006:SupportStatement {id:'STATEMENT-006'}) SET s006.claimedStatus = 'CUSTOMER_CANCELLED', s006.text = 'Pickup cancelled by customer.', s006.speakerRole = 'SYNTHETIC_DEMO'
MERGE (s006)-[:ABOUT]->(p004)
MERGE (s006)-[:RECORDED_IN]->(d006)
MERGE (p004)-[:ATTEMPTS]->(r004)
MERGE (d007:EvidenceDocument {id:'DOC-007'}) SET d007.synthetic = true, d007.sourceType = 'SUPPORT_REPLY'
MERGE (s007:SupportStatement {id:'STATEMENT-007'}) SET s007.claimedStatus = 'COURIER_UNAVAILABLE', s007.text = 'Pickup failed because the courier was unavailable.', s007.speakerRole = 'SYNTHETIC_DEMO'
MERGE (s007)-[:ABOUT]->(p004)
MERGE (s007)-[:RECORDED_IN]->(d007)
MERGE (a004:Action {id:'FOLLOWUP-4443b749-d75b-3221-b6a5-77b4133e1afe'}) ON CREATE SET a004.status = 'RESOLVED', a004.type = 'REQUEST_PICKUP_CLARIFICATION', a004.question = 'Please confirm why pickup PICKUP-004 failed and explain the conflicting recorded reasons.', a004.findingId = '4443b749-d75b-3221-b6a5-77b4133e1afe', a004.pickupId = 'PICKUP-004', a004.createdAt = '2026-10-15T09:00:00Z', a004.resolvedAt = '2026-10-15T09:15:00Z', a004.synthetic = true
SET a004.evidenceRevision = 'ed1fe2c8adc6dc84b2dd81874faa56a4a52890fff3055a940eceb91abba553bb'
MERGE (c004)-[:HAS_ACTION]->(a004)
MERGE (a004)-[:REFERENCES]->(d006)
MERGE (a004)-[:REFERENCES]->(d007)
MERGE (n004:ClarificationRecord {id:'CLARIFICATION-FOLLOWUP-4443b749-d75b-3221-b6a5-77b4133e1afe'}) ON CREATE SET n004.text = 'Seeded synthetic example: a manual reply reports that the courier was unavailable. Not independently verified.', n004.recordedAt = '2026-10-15T09:15:00Z', n004.source = 'SEEDED_SYNTHETIC_CLARIFICATION', n004.outcome = 'EXPLANATION_PROVIDED', n004.taskStatus = 'RESOLVED', n004.synthetic = true
SET n004.evidenceRevision = 'ed1fe2c8adc6dc84b2dd81874faa56a4a52890fff3055a940eceb91abba553bb'
MERGE (a004)-[:HAS_CLARIFICATION]->(n004)
RETURN c.id AS caseId, 4 AS caseCount
