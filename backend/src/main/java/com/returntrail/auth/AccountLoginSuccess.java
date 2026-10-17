package com.returntrail.auth;
import com.returntrail.session.GuestGraphLifecycle;
import com.returntrail.session.GuestGraphScope;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
@Component
public class AccountLoginSuccess implements AuthenticationSuccessHandler {
    private static final Logger log=LoggerFactory.getLogger(AccountLoginSuccess.class);
    private final AccountWorkspaceRepository accounts;private final GuestGraphLifecycle guests;
    public AccountLoginSuccess(AccountWorkspaceRepository accounts,GuestGraphLifecycle guests){this.accounts=accounts;this.guests=guests;}
    @Override public void onAuthenticationSuccess(HttpServletRequest request,HttpServletResponse response,Authentication authentication) throws IOException {
        try {
            var identity=WorkspaceIdentity.from(authentication);
            if(identity==null)throw new IllegalStateException("Unsupported account identity");
            String graph=accounts.open(identity);
            var session=request.getSession(true);
            Object previous=session.getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE);
            session.setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,graph);
            session.setAttribute(WorkspaceAccess.ACCOUNT_SUBJECT,identity.key());
            session.setAttribute(WorkspaceAccess.BINDING_REFERENCE,java.util.UUID.randomUUID().toString());
            if(previous instanceof String guest && GuestGraphLifecycle.isGuestGraph(guest))guests.expire(guest);
            response.setStatus(302);response.setHeader("Location","/cases");
        } catch(RuntimeException exception) {
            log.warn("Saved workspace sign-in failed: {}",exception.getClass().getSimpleName());
            SecurityContextHolder.clearContext();
            new HttpSessionSecurityContextRepository().saveContext(SecurityContextHolder.createEmptyContext(),request,response);
            response.setStatus(302);response.setHeader("Location","/signin?error=workspace_unavailable");
        } finally {
            if(authentication instanceof org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken token)
                new HttpSessionOAuth2AuthorizedClientRepository().removeAuthorizedClient(token.getAuthorizedClientRegistrationId(),authentication,request,response);
        }
    }
}
