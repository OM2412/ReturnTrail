package com.returntrail.ai;

import com.returntrail.graph.CaseEvidenceRepository;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.investigation.PickupConflictDetector;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

class CaseInvestigationAgentTests {

    private final GroqClient groq = mock(GroqClient.class);
    private final CaseEvidenceRepository repository =
            mock(CaseEvidenceRepository.class);

    private final CaseInvestigationAgent agent = new CaseInvestigationAgent(
            groq, repository, new PickupConflictDetector());

    private Map<String, Object> response(Map<String, Object> message) {
        return Map.of("choices", List.of(Map.of("message", message)));
    }

    private Map<String, Object> call(String id, String name) {
        return Map.of(
                "id", id,
                "type", "function",
                "function", Map.of("name", name, "arguments", "{}"));
    }

    @Test
    void executesGraphToolsAndReturnsTheirTrace() {
        when(groq.model()).thenReturn("test-model");

        when(repository.findByCaseId("CASE-001")).thenReturn(List.of(
                new EvidenceRow("CASE-001", "P1",
                        "CUSTOMER_CANCELLED", "Statement one", "DOC-001"),
                new EvidenceRow("CASE-001", "P1",
                        "COURIER_UNAVAILABLE", "Statement two", "DOC-002")));

        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls", List.of(
                        call("call-1", "get_case_evidence"),
                        call("call-2", "get_case_findings")))),
                response(Map.of("content",
                        "DOC-001 and DOC-002 require clarification.")));

        var result = agent.investigate();

        assertEquals(2, result.toolTrace().size());
        assertEquals(2, result.evidence().size());
        assertEquals(1, result.findings().size());
        assertEquals(2, result.modelRequests());
        verify(repository, times(1)).findByCaseId("CASE-001");
    }

    @Test
    void rejectsAnswerWithoutRequiredTools() {
        when(groq.model()).thenReturn("test-model");
        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("content", "A guessed answer")));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsUnknownToolBeforeReadingGraph() {
        when(groq.model()).thenReturn("test-model");
        when(groq.complete(anyMap())).thenReturn(
                response(Map.of("tool_calls",
                        List.of(call("call-1", "issue_refund")))));

        assertThrows(IllegalStateException.class, agent::investigate);
        verifyNoInteractions(repository);
    }
}
