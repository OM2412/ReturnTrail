package com.returntrail.investigation;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class ContextCoverageTests {
    EvidenceRow row(String id,String pickup){return new EvidenceRow("CASE-001",pickup,"CUSTOMER_CANCELLED","A fictional claim.",id);}
    @Test void comparesOnlyTheTasksPickupAndKeepsSourceHistory() {
        var old=List.of(row("DOC-001","PICKUP-001"));
        var task=new ActionRow("TASK","RESOLVED","Question","2026-10-16T00:00:00Z","F",EvidenceRevision.of(old),"PICKUP-001",List.of("DOC-001"));
        assertTrue(ContextCoverage.compare(List.of(old.get(0),row("UNRELATED","PICKUP-002")),List.of(task),List.of()).get(0).coversCurrentSourceSet());
        var changed=ContextCoverage.compare(List.of(old.get(0),row("DOC-002","PICKUP-001")),List.of(task),List.of()).get(0);
        assertFalse(changed.coversCurrentSourceSet());assertEquals(List.of("DOC-002"),changed.addedSinceReview());assertEquals(List.of("DOC-001"),changed.reviewedEvidenceIds());
    }
    @Test void equalIdsDoNotHideAChangedClaimAndLatestNoteUsesRecordedTime() {
        var initial=List.of(row("DOC-001","PICKUP-001"));
        var task=new ActionRow("TASK","OPEN","Question","2026-10-16T00:00:00Z","F",EvidenceRevision.of(initial),"PICKUP-001",List.of("DOC-001"));
        var modified=List.of(new EvidenceRow("CASE-001","PICKUP-001","COURIER_UNAVAILABLE","Other claim","DOC-001"));
        var a=new ClarificationRow("TASK","F","OPEN","ZZ","Unknown","MANUAL","2026-10-16T00:00:00Z");
        var b=new ClarificationRow("TASK","F","RESOLVED","AA","Explanation","MANUAL","2026-10-17T00:00:00Z");
        var coverage=ContextCoverage.compare(modified,List.of(task),List.of(a,b)).get(0);
        assertFalse(coverage.coversCurrentSourceSet());assertEquals("EXPLANATION_PROVIDED",coverage.latestOutcome());assertEquals(2,coverage.noteCount());
    }
}
