package com.returntrail.api;

import com.returntrail.graph.CaseCatalogRepository;
import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.GraphView;
import com.returntrail.investigation.ContextCoverage;
import com.returntrail.investigation.ContextCoverage.MemoryCoverage;
import com.returntrail.investigation.PickupConflictDetector;
import com.returntrail.investigation.PickupConflictDetector.Finding;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

/** Authorized, read-only context inspection; no model calls and no workflow writes. */
@RestController
public class CaseContextController {
    private final CaseWorkspaceController workspace;
    private final CaseCatalogRepository catalog;
    private final CaseEvidenceRepository evidence;
    private final PickupConflictDetector detector;
    public CaseContextController(CaseWorkspaceController workspace, CaseCatalogRepository catalog,
                                 CaseEvidenceRepository evidence, PickupConflictDetector detector) {
        this.workspace=workspace; this.catalog=catalog; this.evidence=evidence; this.detector=detector;
    }
    @GetMapping("/api/cases/{caseId}/context")
    public ContextView context(@PathVariable String caseId,
            @RequestParam(defaultValue="") String exclude) {
        if(exclude.length()>160) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Source reference is too long.");
        for(int retry=0;retry<2;retry++) {
            var snap=workspace.snapshot(caseId);
            if(!exclude.isEmpty() && snap.evidence().stream().noneMatch(e -> e.evidenceId().equals(exclude)))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,"That source is not part of this case.");
            var graph=exclude.isEmpty()?snap.graph():evidence.loadGraphExcluding(caseId,exclude);
            var after=catalog.requireCase(caseId);
            if(snap.evidenceVersion()!=after.evidenceVersion() || snap.workflowVersion()!=after.workflowVersion()) continue;
            var previewFindings=detector.detect(graph.evidence());
            return new ContextView(caseId,true,"FALKORDB_READ_ONLY_CONTEXT",snap.evidenceVersion(),snap.workflowVersion(),
                    ContextCoverage.compare(snap.evidence(),snap.actions(),snap.clarifications()),
                    assessment(snap.evidence().size(),snap.findings()),
                    new Preview(exclude.isEmpty()?null:exclude,assessment(graph.evidence().size(),previewFindings),
                            !signature(snap.findings()).equals(signature(previewFindings)),graph),
                    "Preview only. Excluding a source does not refute it, verify another claim, resolve a task or change saved data.");
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT,"The case changed. Refresh before comparing context.");
    }
    private Assessment assessment(int count,List<Finding> findings) {
        String state=count==0?"NO_SOURCE_EVIDENCE":findings.stream().anyMatch(f -> f.type().equals("PICKUP_REASON_DISAGREEMENT"))
                ?"SUPPORTED_DISAGREEMENT":findings.isEmpty()?"NO_SUPPORTED_FINDING":"MISSING_CONTEXT";
        return new Assessment(state,count,findings.size(),findings.stream()
                .map(f -> new RuleFinding(f.pickupId(),f.type(),f.questionToAsk(),f.evidence().stream().map(CaseEvidenceRepository.EvidenceRow::evidenceId).distinct().sorted().toList())).toList());
    }
    private List<String> signature(List<Finding> findings) {
        return findings.stream().map(f -> f.pickupId()+"|"+f.type()).sorted().toList();
    }
    public record RuleFinding(String pickupId,String type,String question,List<String> evidenceIds) {}
    public record Assessment(String state,int sourceCount,int findingCount,List<RuleFinding> findings) {}
    public record Preview(String excludedEvidenceId,Assessment assessment,boolean ruleOutcomeChanged,GraphView graph) {}
    public record ContextView(String caseId,boolean synthetic,String method,long evidenceVersion,long workflowVersion,
            List<MemoryCoverage> memories,Assessment current,Preview preview,String limitation) {}
}
