package com.returntrail.auth;
import com.returntrail.session.GuestGraphScope;
import com.returntrail.session.GuestGraphLifecycle;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
public final class WorkspaceAccess {
    public static final String ACCOUNT_SUBJECT="returntrail.account.subject";
    public static final String BINDING_REFERENCE="returntrail.workspace.reference";
    public static final String PINNED_GRAPH="returntrail.request.authorizedGraph";
    private WorkspaceAccess(){}
    public static WorkspaceIdentity identity(){return WorkspaceIdentity.from(SecurityContextHolder.getContext().getAuthentication());}
    public static String authorizedGraph(HttpServletRequest request) {
        var session=request.getSession(false);
        if(session==null || !(session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE) instanceof String graph))return null;
        var owner=identity();
        if(AccountWorkspaceRepository.isAccountGraph(graph)) {
            return owner!=null && owner.key().equals(session.getAttribute(ACCOUNT_SUBJECT))?graph:null;
        }
        return owner==null && GuestGraphLifecycle.isGuestGraph(graph)?graph:null;
    }
}
