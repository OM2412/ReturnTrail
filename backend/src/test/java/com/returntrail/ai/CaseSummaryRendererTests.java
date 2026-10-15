package com.returntrail.ai;

import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.investigation.PickupConflictDetector;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CaseSummaryRendererTests {

    private List<EvidenceRow> evidence() {
        return List.of(
                new EvidenceRow("CASE-001", "PICKUP-001",
                        "CUSTOMER_CANCELLED", "Statement one", "DOC-001"),
                new EvidenceRow("CASE-001", "PICKUP-001",
                        "COURIER_UNAVAILABLE", "Statement two", "DOC-002"));
    }

    @Test
    void resolvedTaskDoesNotEraseHistoricalDisagreement() {
        var rows = evidence();
        var findings = new PickupConflictDetector().detect(rows);

        String summary = CaseSummaryRenderer.render(
                rows, findings, List.of(),
                List.of(new ClarificationRow(
                        "FOLLOWUP-001", findings.get(0).findingId(),
                        "RESOLVED", "CLARIFICATION-001",
                        "Manual note", "MANUAL_SYNTHETIC_CLARIFICATION", "time")),
                List.of());

        assertTrue(summary.contains("DOC-001"));
        assertTrue(summary.contains("DOC-002"));
        assertTrue(summary.contains("PICKUP-001"));
        assertTrue(summary.contains("Historical disagreements: 1."));
        assertTrue(summary.contains("task status: RESOLVED"));
        assertTrue(summary.contains("not independently verified"));
        assertTrue(summary.contains("Pending follow-up findings: 0."));
        assertFalse(summary.contains("finding has been resolved"));
    }

    @Test
    void reportsReturnedActionStatusWithoutAssumingItIsNew() {
        var rows = evidence();
        var findings = new PickupConflictDetector().detect(rows);

        String summary = CaseSummaryRenderer.render(
                rows, findings, findings, List.of(),
                List.of(new ActionRow(
                        "FOLLOWUP-001", "OPEN", "Please clarify", "time")));

        assertTrue(summary.contains("Pending follow-up findings: 1."));
        assertTrue(summary.contains("saved or reused"));
        assertTrue(summary.contains("FOLLOWUP-001; status: OPEN"));
    }

    @Test
    void emptyEvidenceDoesNotProduceACaseConclusion() {
        String summary = CaseSummaryRenderer.render(
                List.of(), List.of(), List.of(), List.of(), List.of());

        assertEquals(
                "No source evidence was returned. This case cannot be assessed.",
                summary);
    }
}
