package com.returntrail.graph;

import com.falkordb.Driver;
import com.falkordb.ResultSet;
import com.returntrail.session.GuestGraphScope;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class CaseClarificationRepository {

    private final Driver driver;
    private final GuestGraphScope graphScope;

    public CaseClarificationRepository(
            Driver driver,
            GuestGraphScope graphScope) {
        this.driver = driver;
        this.graphScope = graphScope;
    }

    public ClarificationRow record(String caseId, String actionId, String note,
                                   String outcome, String requestId, String evidenceRevision, long expectedVersion) {
        String query = """
                MATCH (c:Case {id:$caseId})-[:HAS_ACTION]->(a:Action {id:$actionId})
                OPTIONAL MATCH (a)-[:HAS_CLARIFICATION]->(existing:ClarificationRecord {id:$clarificationId})
                WITH c, a, existing
                WHERE ((a.status = 'OPEN' AND a.evidenceRevision = $evidenceRevision
                        AND coalesce(c.evidenceVersion,0) = $expectedVersion) OR existing IS NOT NULL)
                  AND (existing IS NULL OR (existing.text = $note AND existing.outcome = $outcome AND existing.evidenceRevision = $evidenceRevision))
                MERGE (n:ClarificationRecord {id:$clarificationId})
                ON CREATE SET n.text = $note, n.recordedAt = $recordedAt,
                              n.source = 'MANUAL_SYNTHETIC_CLARIFICATION', n.outcome = $outcome, n.evidenceRevision = $evidenceRevision,
                              n.taskStatus = CASE WHEN $outcome = 'EXPLANATION_PROVIDED' THEN 'RESOLVED' ELSE 'OPEN' END,
                              n.synthetic = true
                MERGE (a)-[:HAS_CLARIFICATION]->(n)
                SET a.status = CASE WHEN n.outcome = 'EXPLANATION_PROVIDED' THEN 'RESOLVED' ELSE a.status END
                SET a.resolvedAt = CASE WHEN n.outcome = 'EXPLANATION_PROVIDED' THEN n.recordedAt ELSE a.resolvedAt END
                SET c.workflowVersion = CASE WHEN existing IS NULL THEN coalesce(c.workflowVersion,0)+1 ELSE coalesce(c.workflowVersion,0) END
                RETURN n.evidenceRevision AS evidenceRevision, n.outcome AS outcome, a.id AS actionId, a.findingId AS findingId,
                       n.taskStatus AS status, n.id AS clarificationId,
                       n.text AS note, n.source AS source, n.recordedAt AS recordedAt
                """;
        var rows = readRows(driver.graph(graphScope.graphName()).query(query, Map.of(
                "caseId", caseId, "actionId", actionId,
                "clarificationId", "CLARIFICATION-" + actionId + "-" + requestId,
                "note", note, "outcome", outcome, "recordedAt", Instant.now().toString(),
                "evidenceRevision", evidenceRevision, "expectedVersion", expectedVersion)));
        if (rows.isEmpty()) return null;
        if (rows.size() != 1) throw new IllegalStateException("Expected one clarification record");
        return rows.get(0);
    }

    public List<ClarificationRow> findByCaseId(String caseId) {
        String query = """
                MATCH (c:Case {id:$caseId})-[:HAS_ACTION]->(a:Action)
                MATCH (a)-[:HAS_CLARIFICATION]->(n:ClarificationRecord)
                RETURN coalesce(n.evidenceRevision,'') AS evidenceRevision,
                       coalesce(n.outcome, 'EXPLANATION_PROVIDED') AS outcome, a.id AS actionId,
                       a.findingId AS findingId,
                       coalesce(n.taskStatus, a.status) AS status,
                       n.id AS clarificationId,
                       n.text AS note,
                       n.source AS source,
                       n.recordedAt AS recordedAt
                ORDER BY clarificationId
                """;

        return readRows(driver.graph(graphScope.graphName())
                .query(query, Map.of("caseId", caseId)));
    }

    private List<ClarificationRow> readRows(ResultSet result) {
        List<ClarificationRow> rows = new ArrayList<>();

        for (com.falkordb.Record record : result) {
            rows.add(new ClarificationRow(
                    record.getValue("actionId"),
                    record.getValue("findingId"),
                    record.getValue("status"),
                    record.getValue("clarificationId"),
                    record.getValue("note"),
                    record.getValue("source"),
                    record.getValue("recordedAt"), record.getValue("evidenceRevision"), record.getValue("outcome")));
        }

        return List.copyOf(rows);
    }

    public record ClarificationRow(
            String actionId,
            String findingId,
            String status,
            String clarificationId,
            String note,
            String source,
            String recordedAt, String evidenceRevision, String outcome) {
        public ClarificationRow(String actionId,String findingId,String status,String clarificationId,
                String note,String source,String recordedAt) {
            this(actionId,findingId,status,clarificationId,note,source,recordedAt,"",
                    "RESOLVED".equals(status)?"EXPLANATION_PROVIDED":"STILL_UNKNOWN");
        }
        public ClarificationRow(String actionId,String findingId,String status,String clarificationId,
                String note,String source,String recordedAt,String evidenceRevision) {
            this(actionId,findingId,status,clarificationId,note,source,recordedAt,evidenceRevision,
                    "RESOLVED".equals(status)?"EXPLANATION_PROVIDED":"STILL_UNKNOWN");
        }
    }
}
