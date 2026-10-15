package com.returntrail.ai;

import com.returntrail.graph.CaseActionRepository;
import com.returntrail.graph.CaseActionRepository.ActionRow;
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
    private final CaseEvidenceRepository repository =
            mock(CaseEvidenceRepository.class);
    private final CaseActionRepository actions =
            mock(CaseActionRepository.class);

    private final CaseInvestigationAgent agent = new CaseInvestigationAgent(
            groq, repository, new PickupConflictDetector(), actions);

    private Map<String, Object> response(Map<String, Object> message) {
        return Map.of("choices", List.of(Map.of("message", message)));
    }

    private Map<String, Object> call(String id, String name) {
        return Map.of(
                "id", id,
                "type", "function",
                "function", Map.of("name", name, "arguments", "{}"));
    }

    private void seedEvidence() {
        when(groq.model()).thenReturn("test-model");
        when(repository.findByCaseId("CASE-001")).thenReturn(List.of(
                new EvidenceRow("CASE-001", "P1",
                        "CUSTOMER_CANCELLED", "Statement one", "DOC-001"),
                new EvidenceRow("CASE-001", "P1",
                        "COURIER_UNAVAILABLE", "Statement two", "DOC-002")));
    }

    @Test
    void preparesActionAndReusesResultForRepeatedToolCall() {
        seedEvidence();

        when(actions.createFollowup(any())).thenReturn(
                new ActionRow("FOLLOWUP-test", "OPEN", "Please clarify", "time"));

        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls", List.of(
                        call("c1", "get_case_evidence"),
                        call("c2", "get_case_findings")))),
                response(Map.of("tool_calls", List.of(
                        call("c3", "prepare_followup_action")))),
                response(Map.of("tool_calls", List.of(
                        call("c4", "prepare_followup_action")))),
                response(Map.of("content",
                        "DOC-001 and DOC-002 require clarification. FOLLOWUP-test is OPEN.")));

        var result = agent.investigate();

        assertEquals(4, result.toolTrace().size());
        assertEquals(1, result.actions().size());
        assertEquals("FOLLOWUP-test", result.actions().get(0).actionId());
        assertEquals(List.of("FOLLOWUP-test"),
                result.toolTrace().get(2).actionIds());

        verify(actions, times(1)).createFollowup(any());
        verify(repository, times(1)).findByCaseId("CASE-001");
    }

    @Test
    void blocksActionBeforeEvidenceAndFindings() {
        when(groq.model()).thenReturn("test-model");
        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls",
                        List.of(call("c1", "prepare_followup_action")))));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(repository, actions);
    }

    @Test
    void rejectsUnsupportedTool() {
        when(groq.model()).thenReturn("test-model");
        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls",
                        List.of(call("c1", "issue_refund")))));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(repository, actions);
    }

    @Test
    void rejectsFinalAnswerBeforeSupportedActionIsPrepared() {
        seedEvidence();

        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls", List.of(
                        call("c1", "get_case_evidence"),
                        call("c2", "get_case_findings")))),
                response(Map.of("content", "Task saved without calling a tool")));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(actions);
    }

    @Test
    void emptyEvidenceDoesNotCreateAction() {
        when(groq.model()).thenReturn("test-model");
        when(repository.findByCaseId("CASE-001")).thenReturn(List.of());

        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls", List.of(
                        call("c1", "get_case_evidence"),
                        call("c2", "get_case_findings")))),
                response(Map.of("content", "No evidence; cannot assess this case.")));

        var result = agent.investigate();

        assertTrue(result.actions().isEmpty());
        verifyNoInteractions(actions);
    }
}
