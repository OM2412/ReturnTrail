package com.returntrail.api;
import com.returntrail.graph.*;
import com.returntrail.graph.CaseCatalogRepository.CaseRow;
import com.returntrail.graph.CaseEvidenceRepository.GraphView;
import com.returntrail.investigation.PickupConflictDetector;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class CaseWorkspaceControllerTests {
    private final CaseCatalogRepository catalog=mock(CaseCatalogRepository.class);
    private final CaseEvidenceRepository evidence=mock(CaseEvidenceRepository.class);
    private final CaseActionRepository actions=mock(CaseActionRepository.class);
    private final CaseClarificationRepository notes=mock(CaseClarificationRepository.class);
    private final CaseWorkspaceController controller=new CaseWorkspaceController(catalog,evidence,actions,notes,new PickupConflictDetector());
    private CaseRow version(long v) {return new CaseRow("C","Title","S","D","L",v,v);}
    private void seed() {when(evidence.loadGraph("C")).thenReturn(new GraphView("C","FALKORDB_QUERY_PATHS",List.of(),List.of(),List.of(),List.of()));}
    @Test void retriesAReadThatCrossesACommittedMutation() {
        seed();when(catalog.requireCase("C")).thenReturn(version(0),version(1),version(1),version(1));
        assertEquals(1,controller.snapshot("C").evidenceVersion());
        verify(evidence,times(2)).loadGraph("C");
    }
    @Test void continuouslyChangingCaseReturnsConflictRatherThanMixedVersions() {
        seed();when(catalog.requireCase("C")).thenReturn(version(0),version(1),version(1),version(2));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->controller.snapshot("C")).getStatusCode().value());
    }
}
