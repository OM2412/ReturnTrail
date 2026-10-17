package com.returntrail.graph;

import com.falkordb.Driver;
import com.falkordb.ResultSet;
import com.returntrail.investigation.PickupConflictDetector.Finding;
import com.returntrail.session.GuestGraphScope;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class CaseActionRepository {

    private final Driver driver;
    private final GuestGraphScope graphScope;

    public CaseActionRepository(
            Driver driver,
            GuestGraphScope graphScope) {
        this.driver = driver;
        this.graphScope = graphScope;
    }

    public ActionRow createFollowup(Finding finding) {
        String actionId = "FOLLOWUP-" + finding.findingId() + "-" + finding.evidenceRevision().substring(0,16);

        String query = """
                MATCH (c:Case {id:$caseId})-[:HAS_RETURN]->(r:ReturnRequest)
                MATCH (p:PickupAttempt {id:$pickupId})-[:ATTEMPTS]->(r)
                MATCH (s:SupportStatement)-[:ABOUT]->(p)
                MATCH (s)-[:RECORDED_IN]->(d:EvidenceDocument)
                WITH c, collect(DISTINCT d) AS documents
                WHERE size(documents) = size($evidenceIds) AND size(documents) > 0
                  AND all(document IN documents WHERE document.id IN $evidenceIds)
                OPTIONAL MATCH (prior:Action {id:$actionId})
                WITH c, documents, prior
                MERGE (a:Action {id:$actionId})
                ON CREATE SET a.status = 'OPEN', a.type = $type,
                              a.question = $question, a.findingId = $findingId,
                              a.pickupId = $pickupId, a.createdAt = $createdAt, a.synthetic = true, a.evidenceRevision = $evidenceRevision
                MERGE (c)-[:HAS_ACTION]->(a)
                FOREACH (document IN documents | MERGE (a)-[:REFERENCES]->(document))
                SET c.workflowVersion = CASE WHEN prior IS NULL THEN coalesce(c.workflowVersion,0)+1 ELSE coalesce(c.workflowVersion,0) END
                RETURN a.id AS actionId, a.status AS status, a.findingId AS findingId,
                       a.evidenceRevision AS evidenceRevision, a.pickupId AS pickupId,
                       $evidenceIds AS evidenceIds, a.question AS question, a.createdAt AS createdAt
                """;
        var params = new java.util.HashMap<String, Object>();
        params.put("caseId", finding.caseId()); params.put("actionId", actionId);
        params.put("question", finding.questionToAsk()); params.put("findingId", finding.findingId());
        params.put("pickupId", finding.pickupId()); params.put("createdAt", Instant.now().toString());
        params.put("evidenceRevision", finding.evidenceRevision());
        params.put("type", "PICKUP_CONTEXT_INCOMPLETE".equals(finding.type())
                ? "REQUEST_MISSING_CONTEXT" : "REQUEST_PICKUP_CLARIFICATION");
        params.put("evidenceIds", finding.evidence().stream()
                .map(CaseEvidenceRepository.EvidenceRow::evidenceId).distinct().toList());
        List<ActionRow> saved = readRows(driver.graph(graphScope.graphName()).query(query, params));
        if (saved.size() != 1) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "Evidence changed during the investigation. Refresh before running again.");

        return saved.get(0);
    }

    public List<ActionRow> findByCaseId(String caseId) {
        String query = """
                MATCH (:Case {id:$caseId})-[:HAS_ACTION]->(a:Action)
                OPTIONAL MATCH (a)-[:REFERENCES]->(d:EvidenceDocument)
                RETURN a.findingId AS findingId, coalesce(a.evidenceRevision,'') AS evidenceRevision,
                       a.pickupId AS pickupId, collect(DISTINCT d.id) AS evidenceIds, a.id AS actionId,
                       a.status AS status,
                       a.question AS question,
                       a.createdAt AS createdAt
                ORDER BY actionId
                """;

        return readRows(driver.graph(graphScope.graphName())
                .query(query, Map.of("caseId", caseId)));
    }

    private List<ActionRow> readRows(ResultSet result) {
        List<ActionRow> rows = new ArrayList<>();

        for (com.falkordb.Record record : result) {
            rows.add(new ActionRow(
                    record.getValue("actionId"),
                    record.getValue("status"),
                    record.getValue("question"),
                    record.getValue("createdAt"), record.getValue("findingId"),
                    record.getValue("evidenceRevision"), record.getValue("pickupId"),
                    stringList(record.getValue("evidenceIds"))));
        }

        return List.copyOf(rows);
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        return list.stream().filter(java.util.Objects::nonNull).map(Object::toString).sorted().toList();
    }
    public record ActionRow(
            String actionId,
            String status,
            String question,
            String createdAt, String findingId, String evidenceRevision, String pickupId, List<String> evidenceIds) {
        public ActionRow(String actionId,String status,String question,String createdAt) {
            this(actionId,status,question,createdAt,"","","",List.of());
        }
    }
}
