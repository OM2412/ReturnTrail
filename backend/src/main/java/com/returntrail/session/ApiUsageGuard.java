package com.returntrail.session;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.Semaphore;
import java.util.function.LongSupplier;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class ApiUsageGuard extends OncePerRequestFilter {

    private static final String BUDGET_ATTRIBUTE =
            "returntrail.guest.aiBudget";

    private final FixedWindow globalAi =
            new FixedWindow(30, Duration.ofMinutes(5));

    private final FixedWindow newGuests =
            new FixedWindow(20, Duration.ofMinutes(5));

    private final Semaphore concurrentAi = new Semaphore(2);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) {
            return true;
        }

        String path = request.getServletPath();

        return !path.equals("/api/guest-sessions")
                && !path.equals("/api/ai/check")
                && !path.equals("/api/cases/CASE-001/investigate");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        String path = request.getServletPath();
        response.setHeader("Cache-Control", "no-store");

        if (path.equals("/api/ai/check")) {
            reject(response, 404, "Diagnostic endpoint is disabled.");
            return;
        }

        HttpSession session = request.getSession(false);

        if (path.equals("/api/guest-sessions")) {
            if (!hasGuestGraph(session) && !newGuests.allow()) {
                reject(response, 429,
                        "Guest creation limit reached. Please retry later.");
                return;
            }

            chain.doFilter(request, response);
            return;
        }

        if (!hasGuestGraph(session)) {
            reject(response, 401, "Create a guest session first.");
            return;
        }

        if (!concurrentAi.tryAcquire()) {
            reject(response, 429,
                    "Investigations are busy. Please retry shortly.");
            return;
        }

        try {
            FixedWindow guestBudget;

            synchronized (session) {
                Object existing = session.getAttribute(BUDGET_ATTRIBUTE);

                if (existing instanceof FixedWindow budget) {
                    guestBudget = budget;
                } else {
                    guestBudget = new FixedWindow(6, Duration.ofMinutes(5));
                    session.setAttribute(BUDGET_ATTRIBUTE, guestBudget);
                }
            }

            if (!guestBudget.allow() || !globalAi.allow()) {
                reject(response, 429,
                        "Investigation limit reached. Please retry later.");
                return;
            }

            chain.doFilter(request, response);
        } finally {
            concurrentAi.release();
        }
    }

    private boolean hasGuestGraph(HttpSession session) {
        return session != null
                && session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE)
                        instanceof String graph
                && graph.matches("returntrail_guest_[a-f0-9]{32}");
    }

    private void reject(
            HttpServletResponse response,
            int status,
            String message) throws IOException {

        response.setStatus(status);
        response.setContentType("application/json");

        if (status == 429) {
            response.setHeader("Retry-After", "300");
        }

        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }

    static final class FixedWindow {

        private final int limit;
        private final long windowNanos;
        private final LongSupplier clock;

        private long startedAt;
        private int used;

        FixedWindow(int limit, Duration duration) {
            this(limit, duration, System::nanoTime);
        }

        FixedWindow(int limit, Duration duration, LongSupplier clock) {
            if (limit < 1 || duration.isZero() || duration.isNegative()) {
                throw new IllegalArgumentException("Invalid request budget");
            }

            this.limit = limit;
            this.windowNanos = duration.toNanos();
            this.clock = clock;
            this.startedAt = clock.getAsLong();
        }

        synchronized boolean allow() {
            long now = clock.getAsLong();

            if (now - startedAt >= windowNanos) {
                startedAt = now;
                used = 0;
            }

            if (used >= limit) {
                return false;
            }

            used++;
            return true;
        }
    }
}
