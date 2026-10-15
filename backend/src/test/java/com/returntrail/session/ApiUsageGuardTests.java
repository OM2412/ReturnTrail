package com.returntrail.session;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApiUsageGuardTests {

    @Test
    void budgetResetsOnlyAtWindowBoundary() {
        AtomicLong clock = new AtomicLong();

        var budget = new ApiUsageGuard.FixedWindow(
                2, Duration.ofSeconds(10), clock::get);

        assertTrue(budget.allow());
        assertTrue(budget.allow());
        assertFalse(budget.allow());

        clock.set(Duration.ofSeconds(10).toNanos() - 1);
        assertFalse(budget.allow());

        clock.incrementAndGet();
        assertTrue(budget.allow());
    }

    @Test
    void seventhGuestInvestigationIsRejectedWithoutExecutingChain()
            throws Exception {

        var guard = new ApiUsageGuard();
        var session = new MockHttpSession();

        session.setAttribute(
                GuestGraphScope.GRAPH_ATTRIBUTE,
                "returntrail_guest_" + "a".repeat(32));

        FilterChain chain = mock(FilterChain.class);

        for (int attempt = 1; attempt <= 7; attempt++) {
            var request = new MockHttpServletRequest();
            request.setMethod("POST");
            request.setServletPath("/api/cases/CASE-001/investigate");
            request.setSession(session);

            var response = new MockHttpServletResponse();
            guard.doFilterInternal(request, response, chain);

            if (attempt <= 6) {
                assertEquals(200, response.getStatus());
            } else {
                assertEquals(429, response.getStatus());
                assertEquals("300", response.getHeader("Retry-After"));
            }
        }

        verify(chain, times(6)).doFilter(any(), any());
    }

    @Test
    void anonymousInvestigationNeverReachesController() throws Exception {
        var guard = new ApiUsageGuard();
        var request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setServletPath("/api/cases/CASE-001/investigate");

        var response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        guard.doFilterInternal(request, response, chain);

        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test
    void diagnosticEndpointCannotBypassInvestigationLimits() throws Exception {
        var guard = new ApiUsageGuard();
        var request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setServletPath("/api/ai/check");

        var response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        guard.doFilterInternal(request, response, chain);

        assertEquals(404, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test
    void existingGuestSessionDoesNotConsumeCreationBudget() throws Exception {
        var guard = new ApiUsageGuard();
        FilterChain chain = mock(FilterChain.class);

        // Exhaust new-session creation reservations.
        for (int attempt = 0; attempt < 20; attempt++) {
            var request = new MockHttpServletRequest();
            request.setMethod("POST");
            request.setServletPath("/api/guest-sessions");

            guard.doFilterInternal(
                    request, new MockHttpServletResponse(), chain);
        }

        var session = new MockHttpSession();
        session.setAttribute(
                GuestGraphScope.GRAPH_ATTRIBUTE,
                "returntrail_guest_" + "b".repeat(32));

        var request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setServletPath("/api/guest-sessions");
        request.setSession(session);

        var response = new MockHttpServletResponse();
        guard.doFilterInternal(request, response, chain);

        assertEquals(200, response.getStatus());
        verify(chain, times(21)).doFilter(any(), any());
    }
}
