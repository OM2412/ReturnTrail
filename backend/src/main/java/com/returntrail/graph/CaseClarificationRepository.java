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

    public ClarificationRow resolve(String actionId, String note) {
        String query = """
                MATCH (:Case {id:$caseId})-[:HAS_ACTION]->(a:Action {id:$actionId})
                MERGE (n:ClarificationRecord {id:$clarificationId})
                ON CREATE SET n.text = $note,
                              n.recordedAt = $recordedAt,
                              n.source = 'MANUAL_SYNTHETIC_CLARIFICATION',
                              n.synthetic = true
                MERGE (a)-[:HAS_CLARIFICATION]->(n)
                SET a.status = 'RESOLVED',
                    a.resolvedAt = n.recordedAt
                RETURN a.id AS actionId,
                       a.findingId AS findingId,
                       a.status AS status,
                       n.id AS clarificationId,
                       n.text AS note,
                       n.source AS source,
                       n.recordedAt AS recordedAt
                """;

        List<ClarificationRow> rows = readRows(
                driver.graph(graphScope.graphName()).query(query, Map.of(
                        "caseId", "CASE-001",
                        "actionId", actionId,
                        "clarificationId", "CLARIFICATION-" + actionId,
                        "note", note,
                        "recordedAt", Instant.now().toString())));

        if (rows.isEmpty()) {
            return null;
        }

        if (rows.size() != 1) {
            throw new IllegalStateException("Expected one clarification record");
        }

        return rows.get(0);
    }

    public List<ClarificationRow> findByCaseId(String caseId) {
        String query = """
                MATCH (:Case {id:$caseId})-[:HAS_ACTION]->(a:Action)
                MATCH (a)-[:HAS_CLARIFICATION]->(n:ClarificationRecord)
                RETURN a.id AS actionId,
                       a.findingId AS findingId,
                       a.status AS status,
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
                    record.getValue("recordedAt")));
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
            String recordedAt) {
    }
}
