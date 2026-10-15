package com.returntrail.api;

import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.investigation.PickupConflictDetector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
public class CaseActionsController {

    private static final Logger log =
            LoggerFactory.getLogger(CaseActionsController.class);

    private final CaseEvidenceRepository evidence;
    private final PickupConflictDetector detector;
    private final CaseActionRepository actions;

    public CaseActionsController(
            CaseEvidenceRepository evidence,
            PickupConflictDetector detector,
            CaseActionRepository actions) {
        this.evidence = evidence;
        this.detector = detector;
        this.actions = actions;
    }

    @PostMapping("/api/cases/CASE-001/actions")
    public ActionsResponse prepareActions() {
        try {
            var findings = detector.detect(evidence.findByCaseId("CASE-001"));
            List<ActionRow> saved = new ArrayList<>();

            for (var finding : findings) {
                saved.add(actions.createFollowup(finding));
            }

            return new ActionsResponse(
                    "CASE-001", true, saved.size(), List.copyOf(saved));
        } catch (RuntimeException exception) {
            log.error("Could not prepare synthetic case follow-up", exception);
            throw unavailable();
        }
    }

    @GetMapping("/api/cases/CASE-001/actions")
    public ActionsResponse savedActions() {
        try {
            var saved = actions.findByCaseId("CASE-001");
            return new ActionsResponse("CASE-001", true, saved.size(), saved);
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
