package com.returntrail.graph;

import com.falkordb.Driver;
import com.falkordb.ResultSet;
import com.returntrail.investigation.PickupConflictDetector.Finding;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class CaseActionRepository {

    private final Driver driver;
    private final String graphName;

    public CaseActionRepository(
            Driver driver,
            @Value("${returntrail.graph.name}") String graphName) {
        this.driver = driver;
        this.graphName = graphName;
    }

    public ActionRow createFollowup(Finding finding) {
        String actionId = "FOLLOWUP-" + finding.findingId();

        String query = """
                MATCH (c:Case {id:$caseId})
                MERGE (a:Action {id:$actionId})
                ON CREATE SET a.status = 'OPEN',
                              a.type = 'REQUEST_PICKUP_CLARIFICATION',
                              a.question = $question,
                              a.findingId = $findingId,
                              a.pickupId = $pickupId,
                              a.createdAt = $createdAt,
                              a.synthetic = true
                MERGE (c)-[:HAS_ACTION]->(a)
                RETURN a.id AS actionId,
                       a.status AS status,
                       a.question AS question,
                       a.createdAt AS createdAt
                """;

        Map<String, Object> params = Map.of(
                "caseId", finding.caseId(),
                "actionId", actionId,
                "question", finding.questionToAsk(),
                "findingId", finding.findingId(),
                "pickupId", finding.pickupId(),
                "createdAt", Instant.now().toString());

        List<ActionRow> saved = readRows(
                driver.graph(graphName).query(query, params));

        if (saved.size() != 1) {
            throw new IllegalStateException("Could not save one case action");
        }

        String linkQuery = """
                MATCH (c:Case {id:$caseId})-[:HAS_ACTION]->(a:Action {id:$actionId})
                MATCH (c)-[:HAS_ORDER]->(:Order)-[:CONTAINS]->(i:Item)
                MATCH (p:PickupAttempt {id:$pickupId})-[:ATTEMPTS]->(:ReturnRequest)-[:RETURNS]->(i)
                MATCH (:SupportStatement)-[:ABOUT]->(p)
                MATCH (s:SupportStatement)-[:ABOUT]->(p)
                MATCH (s)-[:RECORDED_IN]->(d:EvidenceDocument)
                WHERE d.id IN $evidenceIds
                MERGE (a)-[:REFERENCES]->(d)
                """;

        driver.graph(graphName).query(linkQuery, Map.of(
                "caseId", finding.caseId(),
                "actionId", actionId,
                "pickupId", finding.pickupId(),
                "evidenceIds", finding.evidence().stream()
                        .map(CaseEvidenceRepository.EvidenceRow::evidenceId)
                        .distinct().toList()));

        return saved.get(0);
    }

    public List<ActionRow> findByCaseId(String caseId) {
        String query = """
                MATCH (:Case {id:$caseId})-[:HAS_ACTION]->(a:Action)
                RETURN a.id AS actionId,
                       a.status AS status,
                       a.question AS question,
                       a.createdAt AS createdAt
                ORDER BY actionId
                """;

        return readRows(driver.graph(graphName)
                .query(query, Map.of("caseId", caseId)));
    }

    private List<ActionRow> readRows(ResultSet result) {
        List<ActionRow> rows = new ArrayList<>();

        for (com.falkordb.Record record : result) {
            rows.add(new ActionRow(
                    record.getValue("actionId"),
                    record.getValue("status"),
                    record.getValue("question"),
                    record.getValue("createdAt")));
        }

        return List.copyOf(rows);
    }

    public record ActionRow(
            String actionId,
            String status,
            String question,
            String createdAt) {
    }
}
