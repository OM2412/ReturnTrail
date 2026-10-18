package com.returntrail.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class OAuthRequestResolverTests {
    private ClientRegistrationRepository clients(boolean github) {
        return new AuthSecurityConfiguration().oauthRegistrations(
                new AuthSettings("github-test","not-a-real-secret","https://returntrail.example"),
                new GoogleSettings("google-test","not-a-real-secret"),github,true);
    }
    private MockHttpServletRequest request(String context,String path) {
        var request=new MockHttpServletRequest("GET",context+path);
        request.setContextPath(context);
        request.setServletPath(path);
        return request;
    }
    @Test void ordinaryAndEmptyAuthorizationPathsDoNotStartOAuthOrThrow() {
        var resolver=AuthSecurityConfiguration.authorizationRequestResolver(clients(true));
        for(String path:List.of("/","/about","/signin","/assets/app.js","/api/auth/session",
                "/oauth2/authorization","/oauth2/authorization/","/unrelated/github")) {
            assertNull(resolver.resolve(request("",path)),path);
        }
        assertNull(resolver.resolve(request("","/"),null));
        assertNull(resolver.resolve(request("","/"),""));
        assertNull(resolver.resolve(request("","/")," "));
    }
    @Test void unknownAndDisabledProvidersDoNotInterceptTheirFallbackRoutes() {
        var resolver=AuthSecurityConfiguration.authorizationRequestResolver(clients(false));
        assertNull(resolver.resolve(request("","/oauth2/authorization/github")));
        assertNull(resolver.resolve(request("","/oauth2/authorization/unknown")));
        assertNull(resolver.resolve(request("","/oauth2/authorization/google/")));
        assertNull(resolver.resolve(request("","/"),"github"));
        assertNull(resolver.resolve(request("","/"),"unknown"));
    }
    @Test void enabledProvidersKeepTheirPublicCallbacksStateAndPkceWithContextPath() {
        var resolver=AuthSecurityConfiguration.authorizationRequestResolver(clients(true));
        for(String context:List.of("","/returntrail")) {
            for(String provider:List.of("google","github")) {
                var result=resolver.resolve(request(context,"/oauth2/authorization/"+provider));
                assertNotNull(result,context+"/"+provider);
                assertEquals("https://returntrail.example/login/oauth2/code/"+provider,result.getRedirectUri());
                assertNotNull(result.getState());
                assertEquals("S256",result.getAdditionalParameters().get("code_challenge_method"));
                assertNotNull(result.getAdditionalParameters().get("code_challenge"));
            }
        }
    }
}
