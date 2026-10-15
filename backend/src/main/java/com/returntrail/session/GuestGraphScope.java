package com.returntrail.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GuestGraphScope {

    public static final String GRAPH_ATTRIBUTE =
            "returntrail.guest.graph";

    private final ObjectProvider<HttpServletRequest> requests;

    public GuestGraphScope(ObjectProvider<HttpServletRequest> requests) {
        this.requests = requests;
    }

    public String graphName() {
        HttpSession session = requests.getObject().getSession(false);

        if (session != null
                && session.getAttribute(GRAPH_ATTRIBUTE) instanceof String graph
                && graph.matches("returntrail_guest_[a-f0-9]{32}")) {
            return graph;
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Create a guest session first.");
    }
}
