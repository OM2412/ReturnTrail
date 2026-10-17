package com.returntrail.api;

import com.returntrail.graph.CaseCatalogRepository;
import com.returntrail.graph.CaseCatalogRepository.CaseRow;
import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.graph.CaseEvidenceRepository.GraphView;
import com.returntrail.investigation.FindingPolicy;
import com.returntrail.investigation.PickupConflictDetector;
import com.returntrail.investigation.PickupConflictDetector.Finding;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class CaseWorkspaceController {
    private final CaseCatalogRepository catalog;
    private final CaseEvidenceRepository evidence;
    private final CaseActionRepository actions;
    private final CaseClarificationRepository notes;
    private final PickupConflictDetector detector;
    public CaseWorkspaceController(CaseCatalogRepository catalog, CaseEvidenceRepository evidence,
            CaseActionRepository actions, CaseClarificationRepository notes, PickupConflictDetector detector) {
        this.catalog = catalog; this.evidence = evidence; this.actions = actions;
        this.notes = notes; this.detector = detector;
    }
    @GetMapping("/api/cases")
    public CatalogResponse cases() {
        var rows = catalog.findAll();
        return new CatalogResponse(true, rows.size(), rows);
    }
    @GetMapping("/api/cases/{caseId}/snapshot")
    public Snapshot snapshot(@PathVariable String caseId) {
        for (int attempt=0;attempt<2;attempt++) {
            var info=catalog.requireCase(caseId);
            var graph=evidence.loadGraph(caseId);
            var findings=detector.detect(graph.evidence());
            var clarifications=notes.findByCaseId(caseId);
            var pending=FindingPolicy.pending(findings,clarifications);
            var savedActions=actions.findByCaseId(caseId);
            var after=catalog.requireCase(caseId);
            if(info.evidenceVersion()!=after.evidenceVersion() || info.workflowVersion()!=after.workflowVersion()) continue;
            String assessment=graph.evidence().isEmpty()?"NO_EVIDENCE"
                    :pending.stream().anyMatch(f->"PICKUP_CONTEXT_INCOMPLETE".equals(f.type()))?"MISSING_CONTEXT"
                    :!pending.isEmpty()?"NEEDS_CLARIFICATION":!findings.isEmpty()?"FOLLOWUP_RECORDED":"NO_DISAGREEMENT_DETECTED";
            var staleTasks=savedActions.stream().filter(a -> findings.stream().anyMatch(f ->
                    f.findingId().equals(a.findingId()) && !f.evidenceRevision().equals(a.evidenceRevision())))
                    .map(ActionRow::actionId).toList();
            var lastAdded=graph.evidence().stream().filter(e->e.addedVersion()==info.evidenceVersion() && e.addedVersion()>0)
                    .map(EvidenceRow::evidenceId).toList();
            return new Snapshot(caseId,true,info,assessment,graph.evidence(),findings,pending,savedActions,clarifications,graph,
                    info.evidenceVersion(),info.workflowVersion(),new ChangeSummary(lastAdded,staleTasks));
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                "The case changed while it was being read. Refresh once the current save finishes.");
    }
    @GetMapping("/api/cases/{caseId}/brief")
    public CaseBrief brief(@PathVariable String caseId) {
        return new CaseBrief("returntrail.case-brief.v1",java.time.Instant.now().toString(),
                "Synthetic sources and manual notes. Not independently verified; no refund decision.",snapshot(caseId));
    }
    @GetMapping("/api/cases/{caseId}/proof")
    public GraphView proof(@PathVariable String caseId) {
        catalog.requireCase(caseId);
        return evidence.loadGraph(caseId);
    }
    public record CatalogResponse(boolean synthetic, int count, List<CaseRow> cases) {}
    public record Snapshot(String caseId, boolean synthetic, CaseRow caseInfo, String assessment,
            List<EvidenceRow> evidence, List<Finding> findings, List<Finding> pendingFindings,
            List<ActionRow> actions,List<ClarificationRow> clarifications,GraphView graph,
            long evidenceVersion,long workflowVersion,ChangeSummary changes) {}
    public record ChangeSummary(List<String> latestEvidenceIds,List<String> earlierTaskIds) {}
    public record CaseBrief(String schemaVersion,String generatedAt,String verification,Snapshot snapshot) {}
}
