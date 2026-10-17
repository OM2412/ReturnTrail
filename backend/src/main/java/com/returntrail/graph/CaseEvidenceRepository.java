package com.returntrail.graph;

import com.falkordb.Driver;
import com.returntrail.session.GuestGraphScope;
import org.springframework.stereotype.Repository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class CaseEvidenceRepository {
    private final Driver driver;
    private final GuestGraphScope scope;
    public CaseEvidenceRepository(Driver driver, GuestGraphScope scope) {
        this.driver = driver; this.scope = scope;
    }
    // Every edge below is required by this MATCH, including explicit case ownership.
    static final String PATH_QUERY = """
            MATCH (c:Case {id:$caseId})-[:HAS_ORDER]->(o:Order)-[:CONTAINS]->(i:Item)
            MATCH (c)-[:HAS_RETURN]->(r:ReturnRequest)-[:RETURNS]->(i)
            MATCH (p:PickupAttempt)-[:ATTEMPTS]->(r)
            MATCH (s:SupportStatement)-[:ABOUT]->(p)
            MATCH (s)-[:RECORDED_IN]->(d:EvidenceDocument)
            RETURN DISTINCT c.id AS caseId, o.id AS orderId, i.id AS itemId,
                   r.id AS returnId, p.id AS pickupId, s.id AS statementId,
                   s.claimedStatus AS claimedStatus, s.text AS statement,
                   d.id AS evidenceId, coalesce(d.sourceType, 'UNKNOWN') AS sourceType,
                   coalesce(d.title, d.id) AS sourceLabel, coalesce(d.originalText, s.text) AS originalText,
                   coalesce(d.recordedAt, '') AS recordedAt, coalesce(d.addedVersion, 0) AS addedVersion,
                   coalesce(d.origin, 'SEEDED_SYNTHETIC') AS origin
            ORDER BY evidenceId, statementId
            """;
    public List<EvidenceRow> findByCaseId(String caseId) {
        var result = driver.graph(scope.graphName()).readOnlyQuery(PATH_QUERY, Map.of("caseId", caseId));
        List<EvidenceRow> rows = new ArrayList<>();
        for (com.falkordb.Record record : result) rows.add(evidenceRow(record));
        return List.copyOf(rows);
    }
    private EvidenceRow evidenceRow(com.falkordb.Record record) {
        return new EvidenceRow(record.getValue("caseId"), record.getValue("pickupId"),
                record.getValue("claimedStatus"), record.getValue("statement"), record.getValue("evidenceId"),
                record.getValue("sourceType"), record.getValue("sourceLabel"), record.getValue("originalText"),
                record.getValue("recordedAt"), ((Number) record.getValue("addedVersion")).longValue(), record.getValue("origin"));
    }
    public GraphView loadGraph(String caseId) {
        return loadGraphExcluding(caseId, "");
    }
    // A bounded read-only counterfactual: never detach/delete or rewrite original evidence.
    public GraphView loadGraphExcluding(String caseId, String excludedEvidenceId) {
        String query = PATH_QUERY.replace("RETURN DISTINCT", "WHERE d.id <> $excludedEvidenceId RETURN DISTINCT");
        var result = driver.graph(scope.graphName()).readOnlyQuery(query,
                Map.of("caseId", caseId, "excludedEvidenceId", excludedEvidenceId));
        Map<String, EvidenceRow> evidence = new LinkedHashMap<>();
        Map<String, ProofNode> nodes = new LinkedHashMap<>();
        Map<String, ProofEdge> edges = new LinkedHashMap<>();
        List<ProofPath> paths = new ArrayList<>();
        for (com.falkordb.Record record : result) {
            String c = record.getValue("caseId"), o = record.getValue("orderId"),
                    i = record.getValue("itemId"), r = record.getValue("returnId"),
                    p = record.getValue("pickupId"), s = record.getValue("statementId"),
                    d = record.getValue("evidenceId");
            EvidenceRow row = evidenceRow(record);
            evidence.putIfAbsent(d + "|" + s, row);
            var pathNodes = List.of(node("Case", c), node("Order", o), node("Item", i),
                    node("ReturnRequest", r), node("PickupAttempt", p),
                    node("SupportStatement", s), node("EvidenceDocument", d));
            pathNodes.forEach(n -> nodes.putIfAbsent(n.key(), n));
            var pathEdges = List.of(edge("Case", c, "HAS_ORDER", "Order", o),
                    edge("Order", o, "CONTAINS", "Item", i),
                    edge("Case", c, "HAS_RETURN", "ReturnRequest", r),
                    edge("ReturnRequest", r, "RETURNS", "Item", i),
                    edge("PickupAttempt", p, "ATTEMPTS", "ReturnRequest", r),
                    edge("SupportStatement", s, "ABOUT", "PickupAttempt", p),
                    edge("SupportStatement", s, "RECORDED_IN", "EvidenceDocument", d));
            pathEdges.forEach(e -> edges.putIfAbsent(e.key(), e));
            paths.add(new ProofPath(d, s, p, record.getValue("sourceType"),
                    pathNodes.stream().map(ProofNode::key).toList(),
                    pathEdges.stream().map(ProofEdge::key).toList()));
        }
        return new GraphView(caseId, "FALKORDB_QUERY_PATHS", List.copyOf(evidence.values()),
                List.copyOf(nodes.values()), List.copyOf(edges.values()), List.copyOf(paths));
    }
    private ProofNode node(String label, String id) { return new ProofNode(label + ":" + id, id, label); }
    private ProofEdge edge(String sl, String s, String type, String tl, String t) {
        String source = sl + ":" + s, target = tl + ":" + t;
        return new ProofEdge(source + "|" + type + "|" + target, source, target, type);
    }
    public record EvidenceRow(String caseId, String pickupId, String claimedStatus,
            String statement, String evidenceId, String sourceType, String sourceLabel,
            String originalText, String recordedAt, long addedVersion, String origin) {
        public EvidenceRow(String caseId, String pickupId, String claimedStatus, String statement, String evidenceId) {
            this(caseId, pickupId, claimedStatus, statement, evidenceId, "UNKNOWN", evidenceId,
                    statement, "", 0, "SEEDED_SYNTHETIC");
        }
    }
    public record ProofNode(String key, String id, String label) {}
    public record ProofEdge(String key, String source, String target, String type) {}
    public record ProofPath(String evidenceId, String statementId, String pickupId,
                            String sourceType, List<String> nodeKeys, List<String> edgeKeys) {}
    public record GraphView(String caseId, String source, List<EvidenceRow> evidence,
                            List<ProofNode> nodes, List<ProofEdge> edges, List<ProofPath> paths) {}
}
