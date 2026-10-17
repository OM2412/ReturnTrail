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
@org.springframework.core.annotation.Order(-90)
public class GuestSessionFilter extends OncePerRequestFilter {

    private final GuestGraphLifecycle lifecycle;

    public GuestSessionFilter(GuestGraphLifecycle lifecycle) {
        this.lifecycle = lifecycle;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.equals("/api/cases") && !path.startsWith("/api/cases/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        response.setHeader("Cache-Control", "no-store");
        String graph=com.returntrail.auth.WorkspaceAccess.authorizedGraph(request);
        if(graph==null){unauthorized(response);return;}
        request.setAttribute(com.returntrail.auth.WorkspaceAccess.PINNED_GRAPH,graph);
        if(com.returntrail.auth.AccountWorkspaceRepository.isAccountGraph(graph)) {
            filterChain.doFilter(request,response);return;
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
                "{\"error\":\"Sign in or create a guest session first.\"}");
    }
}
