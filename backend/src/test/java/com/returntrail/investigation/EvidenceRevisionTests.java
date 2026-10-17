package com.returntrail.investigation;

import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class EvidenceRevisionTests {
    private final EvidenceRow a = new EvidenceRow("C", "P", "CUSTOMER_CANCELLED", "Cancelled", "D1");
    private final EvidenceRow b = new EvidenceRow("C", "P", "COURIER_UNAVAILABLE", "Unavailable", "D2");
    @Test void orderAndDuplicateRowsDoNotChangeTheRevision() {
        assertEquals(EvidenceRevision.of(List.of(a,b)), EvidenceRevision.of(List.of(b,a,a)));
        assertTrue(EvidenceRevision.of(List.of(a,b)).matches("[a-f0-9]{64}"));
    }
    @Test void quoteAndOriginalTextBothContributeToIdentity() {
        var changed = new EvidenceRow("C", "P", "CUSTOMER_CANCELLED", "Cancelled", "D1", "DEMO_NOTE", "Label", "Longer original source", "time", 1, "MANUAL_SYNTHETIC_EVIDENCE");
        assertNotEquals(EvidenceRevision.of(List.of(a)), EvidenceRevision.of(List.of(changed)));
        assertNotEquals(EvidenceRevision.of(List.of(a)), EvidenceRevision.of(List.of(new EvidenceRow("C","P","CUSTOMER_CANCELLED","Other quote","D1"))));
    }
    @Test void unrelatedPickupDoesNotChangeExistingFindingRevision() {
        var detector = new PickupConflictDetector();
        var before = detector.detect(List.of(a,b)).getFirst();
        var after = detector.detect(List.of(a,b,new EvidenceRow("C","P2","COURIER_UNAVAILABLE","Other pickup","D3"))).getFirst();
        assertEquals(before.evidenceRevision(), after.evidenceRevision());
    }
}
