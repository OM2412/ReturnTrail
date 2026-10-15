package com.returntrail.graph;

import com.falkordb.Driver;
import com.falkordb.ResultSet;
import com.returntrail.session.GuestGraphScope;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class CaseEvidenceRepository {

    private final Driver driver;
    private final GuestGraphScope graphScope;

    public CaseEvidenceRepository(
            Driver driver,
            GuestGraphScope graphScope) {
        this.driver = driver;
        this.graphScope = graphScope;
    }

    public List<EvidenceRow> findByCaseId(String caseId) {
        String query = """
                MATCH (c:Case {id:$caseId})-[:HAS_ORDER]->(o:Order)-[:CONTAINS]->(i:Item)
                MATCH (p:PickupAttempt)-[:ATTEMPTS]->(:ReturnRequest)-[:RETURNS]->(i)
                MATCH (s:SupportStatement)-[:ABOUT]->(p)
                MATCH (s)-[:RECORDED_IN]->(d:EvidenceDocument)
                RETURN c.id AS caseId,
                       p.id AS pickupId,
                       s.claimedStatus AS claimedStatus,
                       s.text AS statement,
                       d.id AS evidenceId
                ORDER BY evidenceId
                """;

        ResultSet result = driver.graph(graphScope.graphName())
                .query(query, Map.of("caseId", caseId));

        List<EvidenceRow> rows = new ArrayList<>();

        for (com.falkordb.Record record : result) {
            rows.add(new EvidenceRow(
                    record.getValue("caseId"),
                    record.getValue("pickupId"),
                    record.getValue("claimedStatus"),
                    record.getValue("statement"),
                    record.getValue("evidenceId")));
        }

        return List.copyOf(rows);
    }

    public record EvidenceRow(
            String caseId,
            String pickupId,
            String claimedStatus,
            String statement,
            String evidenceId) {
    }
}
