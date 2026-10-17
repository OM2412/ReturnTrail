package com.returntrail.investigation;

import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class FindingPolicyTests {
    @Test void anOpenUnknownNoteDoesNotResolveTheQuestion() {
        var findings = new PickupConflictDetector().detect(List.of(
                new EvidenceRow("CASE-003", "P3", "UNKNOWN", "No reason", "D5")));
        var notes = List.of(new ClarificationRow("A", findings.get(0).findingId(), "OPEN", "N", "Still unknown", "MANUAL", "time"));
        assertEquals(findings, FindingPolicy.pending(findings, notes));
    }
    @Test void onlyTheLinkedResolvedFindingIsSuppressed() {
        var detector = new PickupConflictDetector();
        var findings = detector.detect(List.of(
                new EvidenceRow("CASE-003", "P3", "UNKNOWN", "No reason", "D5"),
                new EvidenceRow("CASE-003", "P4", "UNKNOWN", "No reason", "D6")));
        var notes = List.of(new ClarificationRow("A", findings.get(0).findingId(), "RESOLVED", "N", "Manual explanation", "MANUAL", "time", findings.get(0).evidenceRevision()));
        assertEquals(List.of(findings.get(1)), FindingPolicy.pending(findings, notes));
        assertEquals(2, findings.size());
    }
    @Test void anEarlierSourceRevisionCannotHideNewEvidence() {
        var detector = new PickupConflictDetector();
        var original = List.of(new EvidenceRow("C", "P", "CUSTOMER_CANCELLED", "Cancelled", "D1"),
                new EvidenceRow("C", "P", "COURIER_UNAVAILABLE", "Unavailable", "D2"));
        var before = detector.detect(original).getFirst();
        var expanded = new java.util.ArrayList<>(original);
        expanded.add(new EvidenceRow("C", "P", "UNKNOWN", "More context needed", "D3"));
        var after = detector.detect(expanded).getFirst();
        assertEquals(before.findingId(), after.findingId());
        assertNotEquals(before.evidenceRevision(), after.evidenceRevision());
        var oldNote = new ClarificationRow("A", before.findingId(), "RESOLVED", "N", "Manual", "MANUAL", "time", before.evidenceRevision());
        assertEquals(List.of(after), FindingPolicy.pending(List.of(after), List.of(oldNote)));
        assertTrue(FindingPolicy.pending(List.of(before), List.of(oldNote)).isEmpty());
    }
}
