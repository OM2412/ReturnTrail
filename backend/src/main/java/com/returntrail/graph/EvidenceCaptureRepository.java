package com.returntrail.graph;

import com.falkordb.Driver;
import com.returntrail.session.GuestGraphScope;
import org.springframework.stereotype.Repository;
import java.util.Map;
import java.util.HashMap;

@Repository
public class EvidenceCaptureRepository {
    private final Driver driver; private final GuestGraphScope scope;
    public EvidenceCaptureRepository(Driver driver, GuestGraphScope scope) { this.driver = driver; this.scope = scope; }
    public CaptureReceipt save(String caseId, String pickupId, String documentId, String requestId,
            String sourceLabel, String sourceType, String originalText, String quote, String status,
            String payloadHash, long expectedVersion, String recordedAt) {
        String query = """
                MATCH (c:Case {id:$caseId})-[:HAS_RETURN]->(:ReturnRequest)<-[:ATTEMPTS]-(p:PickupAttempt {id:$pickupId})
                WITH DISTINCT c, p
                OPTIONAL MATCH (existing:EvidenceDocument {id:$documentId})
                OPTIONAL MATCH (c)-[:HAS_RETURN]->(:ReturnRequest)<-[:ATTEMPTS]-(:PickupAttempt)<-[:ABOUT]-(:SupportStatement)-[:RECORDED_IN]->(known:EvidenceDocument)
                WITH c, p, existing, count(DISTINCT known) AS sourceCount
                WHERE (existing IS NOT NULL AND existing.caseId = $caseId AND existing.payloadHash = $payloadHash)
                   OR (existing IS NULL AND coalesce(c.evidenceVersion, 0) = $expectedVersion AND sourceCount < 30)
                MERGE (d:EvidenceDocument {id:$documentId})
                ON CREATE SET d.synthetic = true, d.caseId = $caseId, d.sourceType = $sourceType,
                    d.title = $sourceLabel, d.originalText = $originalText, d.payloadHash = $payloadHash,
                    d.recordedAt = $recordedAt, d.origin = 'MANUAL_SYNTHETIC_EVIDENCE',
                    d.addedVersion = coalesce(c.evidenceVersion, 0) + 1
                MERGE (s:SupportStatement {id:$statementId})
                ON CREATE SET s.claimedStatus = $status, s.text = $quote, s.speakerRole = 'MANUAL_SYNTHETIC_IMPORT'
                MERGE (s)-[:ABOUT]->(p)
                MERGE (s)-[:RECORDED_IN]->(d)
                MERGE (c)-[:HAS_EVIDENCE]->(d)
                SET c.evidenceVersion = CASE WHEN existing IS NULL THEN coalesce(c.evidenceVersion, 0) + 1 ELSE coalesce(c.evidenceVersion, 0) END
                SET c.workflowVersion = CASE WHEN existing IS NULL THEN coalesce(c.workflowVersion, 0) + 1 ELSE coalesce(c.workflowVersion, 0) END
                RETURN d.id AS evidenceId, d.addedVersion AS addedVersion, d.recordedAt AS recordedAt,
                    c.evidenceVersion AS currentVersion, existing IS NULL AS created
                """;
        Map<String,Object> params = new HashMap<>();
        params.put("caseId",caseId); params.put("pickupId",pickupId); params.put("documentId",documentId);
        params.put("statementId","STATEMENT-"+requestId); params.put("sourceLabel",sourceLabel);
        params.put("sourceType",sourceType); params.put("originalText",originalText); params.put("quote",quote);
        params.put("status",status); params.put("payloadHash",payloadHash); params.put("expectedVersion",expectedVersion);
        params.put("recordedAt",recordedAt);
        var result=driver.graph(scope.graphName()).query(query,params);
        CaptureReceipt receipt=null;
        for (com.falkordb.Record r:result) {
            if(receipt!=null) throw new IllegalStateException("Multiple evidence import results");
            receipt=new CaptureReceipt(caseId,r.getValue("evidenceId"),pickupId,
                    ((Number)r.getValue("addedVersion")).longValue(),((Number)r.getValue("currentVersion")).longValue(),
                    r.getValue("recordedAt"),r.getValue("created"));
        }
        return receipt;
    }
    public record CaptureReceipt(String caseId,String evidenceId,String pickupId,long addedVersion,
                                  long currentVersion,String recordedAt,boolean created) {}
}
