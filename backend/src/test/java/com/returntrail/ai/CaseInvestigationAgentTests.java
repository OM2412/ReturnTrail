package com.returntrail.ai;

import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.investigation.PickupConflictDetector;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CaseInvestigationAgentTests {
    private final GroqClient groq = mock(GroqClient.class);
    private final CaseEvidenceRepository evidence = mock(CaseEvidenceRepository.class);
    private final CaseActionRepository actions = mock(CaseActionRepository.class);
    private final CaseClarificationRepository clarifications = mock(CaseClarificationRepository.class);
    private final PickupConflictDetector detector = new PickupConflictDetector();
    private final CaseInvestigationAgent agent = new CaseInvestigationAgent(
            groq, evidence, detector, actions, clarifications);
    private final List<String> requestedTools = new ArrayList<>();

    private Map<String, Object> response(Map<String, Object> message) {
        return Map.of("choices", List.of(Map.of("message", message)));
    }
    private Map<String, Object> call(String name, String arguments) {
        return Map.of("id", "call-" + requestedTools.size(), "type", "function",
                "function", Map.of("name", name, "arguments", arguments));
    }
    private List<EvidenceRow> seed() {
        when(groq.model()).thenReturn("test-model");
        var rows = List.of(
                new EvidenceRow("CASE-001", "P1", "CUSTOMER_CANCELLED", "One", "DOC-001"),
                new EvidenceRow("CASE-001", "P1", "COURIER_UNAVAILABLE", "Two", "DOC-002"));
        when(evidence.findByCaseId("CASE-001")).thenReturn(rows);
        when(clarifications.findByCaseId("CASE-001")).thenReturn(List.of());
        when(actions.createFollowup(any())).thenReturn(
                new ActionRow("FOLLOWUP-test", "OPEN", "Please clarify", "time"));
        return rows;
    }
    private void obey() {
        when(groq.complete(anyMap())).thenAnswer(invocation -> {
            Map<?, ?> request = invocation.getArgument(0);
            Map<?, ?> choice = (Map<?, ?>) request.get("tool_choice");
            String name = (String) ((Map<?, ?>) choice.get("function")).get("name");
            assertEquals("function", choice.get("type"));
            assertEquals(false, request.get("parallel_tool_calls"));
            List<?> exposed = (List<?>) request.get("tools");
            assertEquals(1, exposed.size());
            assertEquals(name, ((Map<?, ?>) ((Map<?, ?>) exposed.get(0))
                    .get("function")).get("name"));
            requestedTools.add(name);
            return response(Map.of("tool_calls", List.of(call(name, "{}"))));
        });
    }
    @Test void ordersRequiredToolsWithoutExtraFinalModelRequest() {
        seed(); obey();
        var result = agent.investigate();
        assertEquals(List.of("get_case_evidence", "get_case_clarifications",
                "get_case_findings", "prepare_followup_action"), requestedTools);
        assertEquals(4, result.modelRequests());
        assertEquals(4, result.toolTrace().size());
        assertEquals(1, result.actions().size());
        assertEquals("DETERMINISTIC_FROM_TOOL_RESULTS", result.summaryMethod());
        assertTrue(result.summary().contains("DOC-001"));
        verify(groq, times(4)).complete(anyMap());
        verify(actions, times(1)).createFollowup(any());
    }
    @Test void resolvedTaskPreservesHistoryWithoutActionTool() {
        var rows = seed();
        String id = detector.detect(rows).get(0).findingId();
        when(clarifications.findByCaseId("CASE-001")).thenReturn(List.of(
                new ClarificationRow("A1", id, "RESOLVED", "N1",
                        "Manual", "MANUAL_SYNTHETIC_CLARIFICATION", "time")));
        obey();
        var result = agent.investigate();
        assertEquals(3, result.modelRequests());
        assertEquals(1, result.findings().size());
        assertTrue(result.pendingFindings().isEmpty());
        assertTrue(result.actions().isEmpty());
        verify(actions, never()).createFollowup(any());
    }
    @Test void unrelatedResolutionDoesNotSuppressFinding() {
        seed();
        when(clarifications.findByCaseId("CASE-001")).thenReturn(List.of(
                new ClarificationRow("OTHER", "unrelated", "RESOLVED", "N2",
                        "Other", "MANUAL_SYNTHETIC_CLARIFICATION", "time")));
        obey();
        assertEquals(1, agent.investigate().pendingFindings().size());
        verify(actions, times(1)).createFollowup(any());
    }
    @Test void prematureTextCannotBypassRequiredRead() {
        seed();
        when(groq.complete(anyMap())).thenReturn(response(Map.of("content", "Finished")));
        var error = assertThrows(IllegalStateException.class, agent::investigate);
        assertTrue(error.getMessage().contains("get_case_evidence"));
        verify(evidence, never()).findByCaseId(any());
        verify(actions, never()).createFollowup(any());
    }
    @Test void unexpectedActionCannotWriteBeforeEvidence() {
        seed();
        when(groq.complete(anyMap())).thenReturn(response(Map.of("tool_calls",
                List.of(call("prepare_followup_action", "{}")))));
        assertThrows(IllegalStateException.class, agent::investigate);
        verify(evidence, never()).findByCaseId(any());
        verify(actions, never()).createFollowup(any());
    }
    @Test void multipleCallsAreRejectedBeforeExecution() {
        seed();
        when(groq.complete(anyMap())).thenReturn(response(Map.of("tool_calls",
                List.of(call("get_case_evidence", "{}"),
                        call("prepare_followup_action", "{}")))));
        assertThrows(IllegalStateException.class, agent::investigate);
        verify(evidence, never()).findByCaseId(any());
        verify(actions, never()).createFollowup(any());
    }
    @Test void unsupportedToolIsBlocked() {
        seed();
        when(groq.complete(anyMap())).thenReturn(response(Map.of("tool_calls",
                List.of(call("issue_refund", "{}")))));
        assertThrows(IllegalStateException.class, agent::investigate);
        verify(evidence, never()).findByCaseId(any());
        verify(actions, never()).createFollowup(any());
    }
    @Test void finalAnswerCannotSkipPendingAction() {
        seed();
        when(groq.complete(anyMap())).thenAnswer(invocation -> {
            Map<?, ?> request = invocation.getArgument(0);
            String name = (String) ((Map<?, ?>) ((Map<?, ?>)
                    request.get("tool_choice")).get("function")).get("name");
            if ("prepare_followup_action".equals(name)) {
                return response(Map.of("content", "Finished without a task"));
            }
            return response(Map.of("tool_calls", List.of(call(name, "{}"))));
        });
        var error = assertThrows(IllegalStateException.class, agent::investigate);
        assertTrue(error.getMessage().contains("prepare_followup_action"));
        verify(evidence, times(1)).findByCaseId("CASE-001");
        verify(actions, never()).createFollowup(any());
    }
    @Test void unexpectedArgumentsCannotReadAnotherCase() {
        seed();
        when(groq.complete(anyMap())).thenReturn(response(Map.of("tool_calls",
                List.of(call("get_case_evidence", "{\"caseId\":\"OTHER\"}")))));
        assertThrows(IllegalStateException.class, agent::investigate);
        verify(evidence, never()).findByCaseId(any());
    }
    @Test void emptyEvidenceDoesNotPrepareAction() {
        seed();
        when(evidence.findByCaseId("CASE-001")).thenReturn(List.of());
        obey();
        var result = agent.investigate();
        assertEquals(3, result.modelRequests());
        assertTrue(result.actions().isEmpty());
        assertTrue(result.summary().contains("cannot be assessed"));
        verify(actions, never()).createFollowup(any());
    }
}
