package com.returntrail.api;

import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.investigation.PickupConflictDetector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import com.returntrail.graph.CaseCatalogRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
public class CaseActionsController {

    private final CaseCatalogRepository catalog;

    private static final Logger log =
            LoggerFactory.getLogger(CaseActionsController.class);

    private final CaseEvidenceRepository evidence;
    private final PickupConflictDetector detector;
    private final CaseActionRepository actions;
    private final com.returntrail.graph.CaseClarificationRepository clarifications;

    public CaseActionsController(
            CaseEvidenceRepository evidence,
            PickupConflictDetector detector,
            CaseActionRepository actions, CaseCatalogRepository catalog,
            com.returntrail.graph.CaseClarificationRepository clarifications) {
        this.catalog = catalog; this.clarifications = clarifications;
        this.evidence = evidence;
        this.detector = detector;
        this.actions = actions;
    }

    @PostMapping("/api/cases/{caseId}/actions")
    public ActionsResponse prepareActions(@PathVariable String caseId) {
        catalog.requireCase(caseId);
        try {
            var findings = detector.detect(evidence.findByCaseId(caseId));
            List<ActionRow> saved = new ArrayList<>();

            for (var finding : com.returntrail.investigation.FindingPolicy.pending(
                    findings, clarifications.findByCaseId(caseId))) {
                saved.add(actions.createFollowup(finding));
            }

            return new ActionsResponse(
                    caseId, true, saved.size(), List.copyOf(saved));
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.error("Could not prepare synthetic case follow-up", exception);
            throw unavailable();
        }
    }

    @GetMapping("/api/cases/{caseId}/actions")
    public ActionsResponse savedActions(@PathVariable String caseId) {
        catalog.requireCase(caseId);
        try {
            var saved = actions.findByCaseId(caseId);
            return new ActionsResponse(caseId, true, saved.size(), saved);
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.error("Could not retrieve synthetic case actions", exception);
            throw unavailable();
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Case actions unavailable. Check backend logs.");
    }

    public record ActionsResponse(
            String caseId,
            boolean synthetic,
            int count,
            List<ActionRow> actions) {
    }
}
