package com.returntrail.api;

import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import com.returntrail.graph.CaseCatalogRepository;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class CaseEvidenceController {

    private final CaseCatalogRepository catalog;

    private static final Logger log =
            LoggerFactory.getLogger(CaseEvidenceController.class);

    private final CaseEvidenceRepository repository;

    public CaseEvidenceController(CaseEvidenceRepository repository, CaseCatalogRepository catalog) {
        this.catalog = catalog;
        this.repository = repository;
    }

    @GetMapping("/api/cases/{caseId}/evidence")
    public EvidenceResponse evidence(@PathVariable String caseId) {
        catalog.requireCase(caseId);
        List<EvidenceRow> rows;

        try {
            rows = repository.findByCaseId(caseId);
        } catch (RuntimeException exception) {
            log.error("Could not retrieve synthetic Case 1 graph evidence", exception);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Graph evidence could not be retrieved. Check backend logs.");
        }

        return new EvidenceResponse(
                caseId,
                true,
                "FALKORDB",
                rows.size(),
                rows);
    }

    public record EvidenceResponse(
            String caseId,
            boolean synthetic,
            String source,
            int count,
            List<EvidenceRow> evidence) {
    }
}
