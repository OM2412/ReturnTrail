package com.returntrail.api;

import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.investigation.PickupConflictDetector;
import com.returntrail.investigation.PickupConflictDetector.Finding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class CaseFindingsController {

    private static final Logger log =
            LoggerFactory.getLogger(CaseFindingsController.class);

    private final CaseEvidenceRepository repository;
    private final PickupConflictDetector detector;

    public CaseFindingsController(
            CaseEvidenceRepository repository,
            PickupConflictDetector detector) {
        this.repository = repository;
        this.detector = detector;
    }

    @GetMapping("/api/cases/CASE-001/findings")
    public FindingsResponse findings() {
        List<Finding> findings;

        try {
            findings = detector.detect(repository.findByCaseId("CASE-001"));
        } catch (RuntimeException exception) {
            log.error("Failed to evaluate synthetic Case 1 evidence", exception);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Findings could not be evaluated. Check backend logs.");
        }

        return new FindingsResponse(
                "CASE-001",
                true,
                "DETERMINISTIC_VALIDATION",
                findings.size(),
                findings);
    }

    public record FindingsResponse(
            String caseId,
            boolean synthetic,
            String method,
            int count,
            List<Finding> findings) {
    }
}
