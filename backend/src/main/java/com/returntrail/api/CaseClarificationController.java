package com.returntrail.api;

import com.returntrail.graph.CaseClarificationRepository;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class CaseClarificationController {

    private static final Logger log =
            LoggerFactory.getLogger(CaseClarificationController.class);

    private final CaseClarificationRepository repository;

    public CaseClarificationController(CaseClarificationRepository repository) {
        this.repository = repository;
    }

    @PostMapping("/api/cases/CASE-001/actions/clarification")
    public ClarificationRow resolve(
            @Valid @RequestBody ClarificationRequest request) {

        ClarificationRow saved;

        try {
            saved = repository.resolve(
                    request.actionId().trim(), request.note().trim());
        } catch (RuntimeException exception) {
            log.warn("Clarification save failed: {}",
                    exception.getClass().getSimpleName());
            throw unavailable();
        }

        if (saved == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Action was not found in synthetic CASE-001.");
        }

        return saved;
    }

    @GetMapping("/api/cases/CASE-001/clarifications")
    public ClarificationsResponse clarifications() {
        try {
            var rows = repository.findByCaseId("CASE-001");
            return new ClarificationsResponse(
                    "CASE-001", true, rows.size(), rows);
        } catch (RuntimeException exception) {
            log.warn("Clarification read failed: {}",
                    exception.getClass().getSimpleName());
            throw unavailable();
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Clarification storage unavailable.");
    }

    public record ClarificationRequest(
            @NotBlank @Size(max = 120) String actionId,
            @NotBlank @Size(max = 2000) String note) {
    }

    public record ClarificationsResponse(
            String caseId,
            boolean synthetic,
            int count,
            List<ClarificationRow> clarifications) {
    }
}
