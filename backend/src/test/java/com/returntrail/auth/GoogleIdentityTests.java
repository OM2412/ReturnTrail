package com.returntrail.auth;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
class GoogleIdentityTests {
    @Test void requiresAnOidcPrincipalNotAnArbitraryGoogleLabel() {
        assertNull(WorkspaceIdentity.from(WorkspaceAccessTests.identity("101","google")));
    }
    @Test void providerSubjectIsNamespacedAndDoesNotExposeEmailAsIdentity() {
        var token=new OidcIdToken("test-only-token",Instant.now(),Instant.now().plusSeconds(300),
                Map.of("iss","https://accounts.google.com","sub","101","name","Demo shopper","email","private@example.invalid"));
        var user=new DefaultOidcUser(Set.of(),token);
        var auth=new OAuth2AuthenticationToken(user,user.getAuthorities(),"google");
        var identity=WorkspaceIdentity.from(auth);
        assertEquals("google:101",identity.key());assertEquals("Demo shopper",identity.displayName());assertEquals("Google member",identity.login());
        var request=new MockHttpServletRequest();request.getSession().setAttribute(com.returntrail.session.GuestGraphScope.GRAPH_ATTRIBUTE,"returntrail_account_"+"a".repeat(32));
        request.getSession().setAttribute(WorkspaceAccess.ACCOUNT_SUBJECT,"github:101");
        try {SecurityContextHolder.getContext().setAuthentication(auth);assertNull(WorkspaceAccess.authorizedGraph(request));}
        finally {SecurityContextHolder.clearContext();}
    }
}
