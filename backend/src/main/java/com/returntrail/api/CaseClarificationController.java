package com.returntrail.api;

import com.returntrail.graph.CaseCatalogRepository;
import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseClarificationRepository;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
public class CaseClarificationController {
    private final CaseClarificationRepository repository;
    private final CaseCatalogRepository catalog;
    private final CaseActionRepository actions;
    private final com.returntrail.graph.CaseEvidenceRepository evidence;
    private final com.returntrail.investigation.PickupConflictDetector detector;
    public CaseClarificationController(CaseClarificationRepository repository,
            CaseCatalogRepository catalog, CaseActionRepository actions,
            com.returntrail.graph.CaseEvidenceRepository evidence,
            com.returntrail.investigation.PickupConflictDetector detector) {
        this.evidence=evidence;this.detector=detector;
        this.repository = repository; this.catalog = catalog; this.actions = actions;
    }
    @PostMapping("/api/cases/{caseId}/actions/clarification")
    public ClarificationRow record(@PathVariable String caseId, @Valid @RequestBody ClarificationRequest request) {
        var info=catalog.requireCase(caseId);
        String actionId = request.actionId().trim();
        var action=actions.findByCaseId(caseId).stream().filter(a -> a.actionId().equals(actionId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Task not found in this case."));
        String replyId="CLARIFICATION-"+actionId+"-"+request.requestId();
        var existing=repository.findByCaseId(caseId).stream().filter(n -> n.clarificationId().equals(replyId)).findFirst();
        if(existing.isPresent()) {
            var note=existing.get();
            if(note.note().equals(request.note().trim()) && note.outcome().equals(request.outcome().name())
                    && note.evidenceRevision().equals(request.evidenceRevision())) return note;
            throw new ResponseStatusException(HttpStatus.CONFLICT,"This reply reference was already used for different contents.");
        }
        boolean current=detector.detect(evidence.findByCaseId(caseId)).stream().anyMatch(f ->
                f.findingId().equals(action.findingId()) && f.evidenceRevision().equals(action.evidenceRevision()));
        if(!current || request.expectedVersion()!=info.evidenceVersion()
                || !request.evidenceRevision().equals(action.evidenceRevision())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,"New evidence needs review. Refresh and open the current follow-up.");
        }
        var saved=repository.record(caseId,actionId,request.note().trim(),request.outcome().name(),request.requestId(),
                request.evidenceRevision(),request.expectedVersion());
        if (saved == null) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "The task changed or this reply reference was already used. Refresh before retrying.");
        return saved;
    }
    @GetMapping("/api/cases/{caseId}/clarifications")
    public ClarificationsResponse clarifications(@PathVariable String caseId) {
        catalog.requireCase(caseId);
        var rows = repository.findByCaseId(caseId);
        return new ClarificationsResponse(caseId, true, rows.size(), rows);
    }
    public enum Outcome { EXPLANATION_PROVIDED, STILL_UNKNOWN }
    public record ClarificationRequest(@NotBlank @Size(max = 120) String actionId,
            @NotBlank @Size(max = 2000) String note, @NotNull Outcome outcome,
            @NotBlank @Pattern(regexp = "[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}") String requestId,
            @NotBlank @Pattern(regexp="[a-f0-9]{64}") String evidenceRevision,
            @NotNull @jakarta.validation.constraints.Min(0) Long expectedVersion) {}
    public record ClarificationsResponse(String caseId, boolean synthetic, int count,
                                         List<ClarificationRow> clarifications) {}
}
