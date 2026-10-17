package com.returntrail.api;

import com.returntrail.graph.*;
import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseCatalogRepository.CaseRow;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.investigation.PickupConflictDetector;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CaseClarificationControllerTests {
    private final CaseCatalogRepository cases = mock(CaseCatalogRepository.class);
    private final CaseActionRepository actions = mock(CaseActionRepository.class);
    private final CaseClarificationRepository notes = mock(CaseClarificationRepository.class);
    private final CaseEvidenceRepository evidence = mock(CaseEvidenceRepository.class);
    private final PickupConflictDetector detector = new PickupConflictDetector();
    private final CaseClarificationController controller = new CaseClarificationController(notes, cases, actions, evidence, detector);
    private final String requestId = "d9701d86-b7cc-4344-8e63-04214699048c";
    private final List<EvidenceRow> rows = List.of(new EvidenceRow("C", "P", "UNKNOWN", "No reason", "D"));
    private final String revision = detector.detect(rows).getFirst().evidenceRevision();
    private CaseClarificationController.ClarificationRequest request(String action) {
        return new CaseClarificationController.ClarificationRequest(action, "Unknown", CaseClarificationController.Outcome.STILL_UNKNOWN, requestId, revision, 0L);
    }
    private void seed() {
        when(cases.requireCase("C")).thenReturn(new CaseRow("C", "Title", "SCENARIO", "Description", "Lesson"));
        when(actions.findByCaseId("C")).thenReturn(List.of(new ActionRow("A", "OPEN", "Question", "time", detector.detect(rows).getFirst().findingId(), revision, "P", List.of("D"))));
        when(evidence.findByCaseId("C")).thenReturn(rows);
    }
    @Test void missingExplicitOutcomeAndRevisionAreRejected() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var request = new CaseClarificationController.ClarificationRequest("A", "Unknown", null, requestId, null, null);
            var paths = factory.getValidator().validate(request).stream().map(v -> v.getPropertyPath().toString()).toList();
            assertTrue(paths.containsAll(List.of("outcome", "evidenceRevision", "expectedVersion")));
        }
    }
    @Test void replyToAnotherCasesTaskCannotWrite() {
        when(actions.findByCaseId("OTHER")).thenReturn(List.of());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> controller.record("OTHER", request("A"))).getStatusCode().value());
        verifyNoInteractions(notes);
    }
    @Test void changedEvidenceRejectsAnOldTaskBeforeWriting() {
        seed();
        when(evidence.findByCaseId("C")).thenReturn(List.of(new EvidenceRow("C", "P", "UNKNOWN", "Changed", "D2")));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> controller.record("C", request("A"))).getStatusCode().value());
        verify(notes, never()).record(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyLong());
    }
    @Test void atomicSaveConflictIsReturnedAsConflict() {
        seed();
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> controller.record("C", request("A"))).getStatusCode().value());
        verify(notes).record("C", "A", "Unknown", "STILL_UNKNOWN", requestId, revision, 0L);
    }
    @Test void identicalReplyRetryReturnsOriginalReceiptEvenAfterSourcesChange() {
        seed();
        var prior = new ClarificationRow("A", "F", "OPEN", "CLARIFICATION-A-" + requestId, "Unknown", "MANUAL", "time", revision);
        when(notes.findByCaseId("C")).thenReturn(List.of(prior));
        assertEquals(prior, controller.record("C", request("A")));
        verifyNoInteractions(evidence);
        verify(notes, never()).record(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyLong());
    }
}
