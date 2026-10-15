package com.returntrail.api;

import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class CaseEvidenceController {

    private static final Logger log =
            LoggerFactory.getLogger(CaseEvidenceController.class);

    private final CaseEvidenceRepository repository;

    public CaseEvidenceController(CaseEvidenceRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/cases/CASE-001/evidence")
    public EvidenceResponse evidence() {
        List<EvidenceRow> rows;

        try {
            rows = repository.findByCaseId("CASE-001");
        } catch (RuntimeException exception) {
            log.error("Could not retrieve synthetic Case 1 graph evidence", exception);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Graph evidence could not be retrieved. Check backend logs.");
        }

        return new EvidenceResponse(
                "CASE-001",
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
