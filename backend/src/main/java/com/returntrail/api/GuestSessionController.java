package com.returntrail.api;

import com.falkordb.Driver;
import com.returntrail.session.GuestGraphScope;
import com.returntrail.session.GuestGraphLifecycle;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@RestController
public class GuestSessionController {

    private static final Logger log =
            LoggerFactory.getLogger(GuestSessionController.class);

    private final Driver driver;
    private final GuestGraphLifecycle lifecycle;
    private final String seedQuery;

    public GuestSessionController(Driver driver, GuestGraphLifecycle lifecycle) throws IOException {
        this.driver = driver;
        this.lifecycle = lifecycle;

        try (var input = new ClassPathResource(
                "graph/seed-case-001.cypher").getInputStream()) {
            this.seedQuery = new String(
                    input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @PostMapping("/api/guest-sessions")
    public GuestSessionResponse create(HttpServletRequest request) {
        HttpSession session = request.getSession(true);

        synchronized (session) {
            if (session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE)
                    instanceof String graph
                    && graph.matches("returntrail_guest_[a-f0-9]{32}")) {
                return new GuestSessionResponse(
                        "READY", "CASE-001", true, false);
            }

            String graphName = "returntrail_guest_"
                    + UUID.randomUUID().toString().replace("-", "");

            lifecycle.register(graphName);

            try {
                var result = driver.graph(graphName)
                        .query(seedQuery, Map.of());

                int rows = 0;
                for (com.falkordb.Record ignored : result) {
                    rows++;
                }

                if (rows != 1) {
                    throw new IllegalStateException(
                            "Seed did not return exactly one case");
                }

                session.setAttribute(
                        GuestGraphScope.GRAPH_ATTRIBUTE, graphName);

                return new GuestSessionResponse(
                        "READY", "CASE-001", true, true);

            } catch (RuntimeException exception) {
                lifecycle.expire(graphName);
                log.error("Guest graph initialization failed", exception);

                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Guest case could not be initialized.");
            }
        }
    }

    @DeleteMapping("/api/guest-sessions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void end(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    public record GuestSessionResponse(
            String status,
            String caseId,
            boolean synthetic,
            boolean initializedNow) {
    }
}
