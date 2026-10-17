package com.returntrail.api;
import com.returntrail.auth.*;
import com.returntrail.session.GuestGraphLifecycle;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
@RestController
public class AuthController {
    private final ObjectProvider<ClientRegistrationRepository> clients;
    public AuthController(ObjectProvider<ClientRegistrationRepository> clients){this.clients=clients;}
    @GetMapping("/api/auth/session")
    public SessionView session(HttpServletRequest request) {
        var identity=WorkspaceAccess.identity();String graph=WorkspaceAccess.authorizedGraph(request);
        var registrations=clients.getIfAvailable();
        return new SessionView(identity!=null,registrations!=null && registrations.findByRegistrationId("github")!=null,
                registrations!=null && registrations.findByRegistrationId("google")!=null,
                graph==null?"NONE":GuestGraphLifecycle.isGuestGraph(graph)?"GUEST":"ACCOUNT",
                identity==null?null:new Profile(identity.login(),identity.displayName(),identity.provider()),
                graph==null?null:(String)request.getSession(false).getAttribute(WorkspaceAccess.BINDING_REFERENCE));
    }
    @GetMapping("/api/auth/csrf")
    public CsrfView csrf(CsrfToken token){return new CsrfView(token.getHeaderName(),token.getToken());}
    public record Profile(String login,String displayName,String provider){}
    public record SessionView(boolean authenticated,boolean githubConfigured,boolean googleConfigured,String workspaceMode,Profile profile,String workspaceReference){}
    public record CsrfView(String headerName,String token){}
}
