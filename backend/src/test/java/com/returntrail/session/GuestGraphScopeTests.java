package com.returntrail.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GuestGraphScopeTests {

    @SuppressWarnings("unchecked")
    private final ObjectProvider<HttpServletRequest> requests =
            mock(ObjectProvider.class);

    private final HttpServletRequest request =
            mock(HttpServletRequest.class);

    private final GuestGraphScope scope = new GuestGraphScope(requests);

    @Test
    void rejectsMissingSession() {
        when(requests.getObject()).thenReturn(request);

        assertThrows(ResponseStatusException.class, scope::graphName);
    }

    @Test
    void returnsOnlyServerBoundGuestGraph() {
        HttpSession session = mock(HttpSession.class);
        String graph = "returntrail_guest_" + "a".repeat(32);

        when(requests.getObject()).thenReturn(request);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE))
                .thenReturn(graph);

        assertEquals(graph, scope.graphName());
    }

    @Test
    void rejectsSharedDevelopmentGraph() {
        HttpSession session = mock(HttpSession.class);

        when(requests.getObject()).thenReturn(request);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE))
                .thenReturn("returntrail_dev");

        assertThrows(ResponseStatusException.class, scope::graphName);
    }
}
