package com.returntrail.investigation;

import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PickupConflictDetectorTests {

    private final PickupConflictDetector detector = new PickupConflictDetector();

    private EvidenceRow row(String caseId, String pickup, String status, String doc) {
        return new EvidenceRow(caseId, pickup, status, "Synthetic statement", doc);
    }

    @Test
    void flagsDifferentReasonsForSamePickupWithEvidence() {
        var findings = detector.detect(List.of(
                row("C1", "P1", "CUSTOMER_CANCELLED", "D1"),
                row("C1", "P1", "COURIER_UNAVAILABLE", "D2")));

        assertEquals(1, findings.size());
        assertEquals("REQUIRES_CLARIFICATION", findings.get(0).status());
        assertEquals(List.of("D1", "D2"),
                findings.get(0).evidence().stream()
                        .map(EvidenceRow::evidenceId).toList());
    }

    @Test
    void doesNotCombineDifferentPickups() {
        assertTrue(detector.detect(List.of(
                row("C1", "P1", "CUSTOMER_CANCELLED", "D1"),
                row("C1", "P2", "COURIER_UNAVAILABLE", "D2"))).isEmpty());
    }

    @Test
    void doesNotCombineDifferentCases() {
        assertTrue(detector.detect(List.of(
                row("C1", "P1", "CUSTOMER_CANCELLED", "D1"),
                row("C2", "P1", "COURIER_UNAVAILABLE", "D2"))).isEmpty());
    }

    @Test
    void doesNotTreatEveryStatusDifferenceAsConflict() {
        assertTrue(detector.detect(List.of(
                row("C1", "P1", "SCHEDULED", "D1"),
                row("C1", "P1", "COMPLETED", "D2"))).isEmpty());
    }

    @Test
    void repeatedEvidenceDoesNotDuplicateFinding() {
        var a = row("C1", "P1", "CUSTOMER_CANCELLED", "D1");
        var b = row("C1", "P1", "COURIER_UNAVAILABLE", "D2");

        var findings = detector.detect(List.of(a, b, a, b));

        assertEquals(1, findings.size());
        assertEquals(2, findings.get(0).evidence().size());
        assertEquals(detector.detect(List.of(b, a)).get(0).findingId(),
                findings.get(0).findingId());
    }
}
