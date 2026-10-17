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
        var request=requests.getObject();
        if(request.getAttribute(com.returntrail.auth.WorkspaceAccess.PINNED_GRAPH) instanceof String pinned
                && (GuestGraphLifecycle.isGuestGraph(pinned) || com.returntrail.auth.AccountWorkspaceRepository.isAccountGraph(pinned))) return pinned;
        String graph=com.returntrail.auth.WorkspaceAccess.authorizedGraph(request);
        if(graph!=null)return graph;

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Create a guest session first.");
    }
}
