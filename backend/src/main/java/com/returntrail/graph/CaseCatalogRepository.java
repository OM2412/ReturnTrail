package com.returntrail.graph;

import com.falkordb.Driver;
import com.returntrail.session.GuestGraphScope;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class CaseCatalogRepository {
    private final Driver driver; private final GuestGraphScope scope;
    public CaseCatalogRepository(Driver driver, GuestGraphScope scope) { this.driver = driver; this.scope = scope; }
    private static final String FIELDS = """
            RETURN c.id AS caseId, c.title AS title,
                   coalesce(c.scenario, 'PICKUP_DISAGREEMENT') AS scenario,
                   coalesce(c.description, 'Review the source-linked pickup records.') AS description,
                   coalesce(c.lesson, 'A recorded claim is not independently verified.') AS lesson,
                   coalesce(c.evidenceVersion, 0) AS evidenceVersion,
                   coalesce(c.workflowVersion, 0) AS workflowVersion
            """;
    public List<CaseRow> findAll() {
        return rows(driver.graph(scope.graphName()).readOnlyQuery("MATCH (c:Case) " + FIELDS + " ORDER BY caseId"));
    }
    public CaseRow requireCase(String caseId) {
        if (caseId == null || !caseId.matches("CASE-[0-9]{3}")) throw missing();
        return rows(driver.graph(scope.graphName()).readOnlyQuery("MATCH (c:Case {id:$caseId}) " + FIELDS,
                Map.of("caseId", caseId))).stream().findFirst().orElseThrow(this::missing);
    }
    private ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Case not found in this workspace."); }
    private List<CaseRow> rows(com.falkordb.ResultSet result) {
        List<CaseRow> rows = new ArrayList<>();
        for (com.falkordb.Record r : result) rows.add(new CaseRow(r.getValue("caseId"), r.getValue("title"),
                r.getValue("scenario"), r.getValue("description"), r.getValue("lesson"),
                ((Number)r.getValue("evidenceVersion")).longValue(), ((Number)r.getValue("workflowVersion")).longValue()));
        return List.copyOf(rows);
    }
    public record CaseRow(String caseId, String title, String scenario, String description, String lesson,
            long evidenceVersion, long workflowVersion) {
        public CaseRow(String caseId, String title, String scenario, String description, String lesson) {
            this(caseId, title, scenario, description, lesson, 0, 0);
        }
    }
}
