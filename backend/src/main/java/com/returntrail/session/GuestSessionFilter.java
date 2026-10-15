package com.returntrail.session;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class GuestSessionFilter extends OncePerRequestFilter {

    private final GuestGraphLifecycle lifecycle;

    public GuestSessionFilter(GuestGraphLifecycle lifecycle) {
        this.lifecycle = lifecycle;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getServletPath().startsWith("/api/cases/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        response.setHeader("Cache-Control", "no-store");
        HttpSession session = request.getSession(false);

        if (session == null
                || !(session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE)
                        instanceof String graph)
                || !GuestGraphLifecycle.isGuestGraph(graph)) {
            unauthorized(response);
            return;
        }

        GuestGraphLifecycle.Lease lease = lifecycle.acquire(graph);

        if (lease == null) {
            unauthorized(response);
            return;
        }

        try (lease) {
            filterChain.doFilter(request, response);
        }
    }

    private void unauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"error\":\"Create a guest session first.\"}");
    }
}
