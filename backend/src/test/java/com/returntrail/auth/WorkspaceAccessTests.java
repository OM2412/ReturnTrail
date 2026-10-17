package com.returntrail.auth;
import com.returntrail.session.GuestGraphScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import java.util.Map;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
class WorkspaceAccessTests {
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    static OAuth2AuthenticationToken identity(String id,String provider){return new OAuth2AuthenticationToken(new DefaultOAuth2User(
            Set.of(new SimpleGrantedAuthority("ROLE_USER")),Map.of("id",id,"login","member","name","Demo member"),"id"),
            Set.of(new SimpleGrantedAuthority("ROLE_USER")),provider);}
    @Test void rejectsAccountGraphWithoutVerifiedPrincipal(){
        var r=new MockHttpServletRequest();r.getSession().setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,"returntrail_account_"+"a".repeat(32));
        r.getSession().setAttribute(WorkspaceAccess.ACCOUNT_SUBJECT,"github:101");assertNull(WorkspaceAccess.authorizedGraph(r));
    }
    @Test void rejectsAnotherAccountsSubjectEvenWithValidGraphName(){
        var r=new MockHttpServletRequest();r.getSession().setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,"returntrail_account_"+"a".repeat(32));
        r.getSession().setAttribute(WorkspaceAccess.ACCOUNT_SUBJECT,"github:102");SecurityContextHolder.getContext().setAuthentication(identity("101","github"));assertNull(WorkspaceAccess.authorizedGraph(r));
    }
    @Test void acceptsOnlyTheServerBoundMatchingAccount(){
        var r=new MockHttpServletRequest();String graph="returntrail_account_"+"b".repeat(32);r.getSession().setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,graph);
        r.getSession().setAttribute(WorkspaceAccess.ACCOUNT_SUBJECT,"github:101");SecurityContextHolder.getContext().setAuthentication(identity("101","github"));assertEquals(graph,WorkspaceAccess.authorizedGraph(r));
    }
    @Test void authenticatedUserCannotFallThroughToGuestBinding(){
        var r=new MockHttpServletRequest();r.getSession().setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,"returntrail_guest_"+"a".repeat(32));SecurityContextHolder.getContext().setAuthentication(identity("101","github"));assertNull(WorkspaceAccess.authorizedGraph(r));
    }
    @Test void rejectsUnsupportedProviderAndInvalidSubject(){
        assertNull(WorkspaceIdentity.from(identity("101","other")));assertNull(WorkspaceIdentity.from(identity("not-numeric","github")));
    }
    @Test void displayNameIsBoundedAndHasNoRoleInOwnership(){
        var user=new DefaultOAuth2User(Set.of(new SimpleGrantedAuthority("ROLE_USER")),Map.of("id","101","login","name","name","x".repeat(1000)),"id");
        var token=new OAuth2AuthenticationToken(user,user.getAuthorities(),"github");assertEquals(80,WorkspaceIdentity.from(token).displayName().length());
    }
    @Test void publicOriginAllowsHttpsAndLocalLoopback(){
        assertEquals("http://127.0.0.1:5174/login/oauth2/code/github",new AuthSettings("id","secret","http://127.0.0.1:5174/").redirectUri());
        assertTrue(new AuthSettings("id","secret","https://returntrail.example").configured());
    }
    @Test void publicOriginRejectsInsecureRemoteAndRedirectTricks(){
        for(String url: new String[]{"http://example.com","https://example.com/redirect","https://user@example.com","https://example.com?next=evil","javascript:alert(1)"})assertThrows(IllegalArgumentException.class,()->new AuthSettings("id","secret",url));
    }
}
