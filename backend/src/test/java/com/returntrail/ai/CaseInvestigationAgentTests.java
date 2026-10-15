package com.returntrail.ai;

import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.investigation.PickupConflictDetector;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CaseInvestigationAgentTests {

    private final GroqClient groq = mock(GroqClient.class);
    private final CaseEvidenceRepository evidence =
            mock(CaseEvidenceRepository.class);
    private final CaseActionRepository actions =
            mock(CaseActionRepository.class);
    private final CaseClarificationRepository clarifications =
            mock(CaseClarificationRepository.class);
    private final PickupConflictDetector detector = new PickupConflictDetector();

    private final CaseInvestigationAgent agent = new CaseInvestigationAgent(
            groq, evidence, detector, actions, clarifications);

    private Map<String, Object> response(Map<String, Object> message) {
        return Map.of("choices", List.of(Map.of("message", message)));
    }

    private Map<String, Object> call(String id, String name) {
        return Map.of(
                "id", id, "type", "function",
                "function", Map.of("name", name, "arguments", "{}"));
    }

    private Map<String, Object> readCalls() {
        return response(Map.of("tool_calls", List.of(
                call("c1", "get_case_evidence"),
                call("c2", "get_case_clarifications"),
                call("c3", "get_case_findings"))));
    }

    private List<EvidenceRow> seedEvidence() {
        when(groq.model()).thenReturn("test-model");

        var rows = List.of(
                new EvidenceRow("CASE-001", "P1",
                        "CUSTOMER_CANCELLED", "Statement one", "DOC-001"),
                new EvidenceRow("CASE-001", "P1",
                        "COURIER_UNAVAILABLE", "Statement two", "DOC-002"));

        when(evidence.findByCaseId("CASE-001")).thenReturn(rows);
        when(clarifications.findByCaseId("CASE-001")).thenReturn(List.of());

        return rows;
    }

    @Test
    void savedResolutionPreservesHistoryWithoutAnotherAction() {
        var rows = seedEvidence();
        String findingId = detector.detect(rows).get(0).findingId();

        when(clarifications.findByCaseId("CASE-001")).thenReturn(List.of(
                new ClarificationRow(
                        "A1", findingId, "RESOLVED", "N1",
                        "Manual clarification; not independently verified.",
                        "MANUAL_SYNTHETIC_CLARIFICATION", "time")));

        when(groq.complete(anyMap())).thenReturn(
                readCalls(),
                response(Map.of("content",
                        "Historical disagreement; task manually resolved.")));

        var result = agent.investigate();

        assertEquals(1, result.findings().size());
        assertTrue(result.pendingFindings().isEmpty());
        assertEquals(1, result.clarifications().size());
        assertTrue(result.actions().isEmpty());
        verifyNoInteractions(actions);
    }

    @Test
    void unrelatedResolutionDoesNotSuppressPendingFinding() {
        seedEvidence();

        when(clarifications.findByCaseId("CASE-001")).thenReturn(List.of(
                new ClarificationRow(
                        "OTHER", "unrelated-finding", "RESOLVED", "N2",
                        "Unrelated clarification", "MANUAL_SYNTHETIC_CLARIFICATION",
                        "time")));

        when(actions.createFollowup(any())).thenReturn(
                new ActionRow("A1", "OPEN", "Please clarify", "time"));

        when(groq.complete(anyMap())).thenReturn(
                readCalls(),
                response(Map.of("tool_calls",
                        List.of(call("c4", "prepare_followup_action")))),
                response(Map.of("content", "Pending task A1 is OPEN.")));

        var result = agent.investigate();

        assertEquals(1, result.pendingFindings().size());
        assertEquals(1, result.actions().size());
        verify(actions, times(1)).createFollowup(any());
    }

    @Test
    void actionBeforeReadingContextIsBlocked() {
        when(groq.model()).thenReturn("test-model");
        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls",
                        List.of(call("c1", "prepare_followup_action")))));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(evidence, clarifications, actions);
    }

    @Test
    void unsupportedToolIsBlocked() {
        when(groq.model()).thenReturn("test-model");
        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls",
                        List.of(call("c1", "issue_refund")))));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(evidence, clarifications, actions);
    }

    @Test
    void finalAnswerCannotSkipPendingAction() {
        seedEvidence();

        when(groq.complete(anyMap())).thenReturn(
                readCalls(),
                response(Map.of("content", "Finished without preparing the task")));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(actions);
    }
}
