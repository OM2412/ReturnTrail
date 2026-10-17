package com.returntrail.auth;
import org.junit.jupiter.api.Test;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
class ProviderRegistrationTests {
    @Test void googleHasIndependentCredentialsMinimalScopesAndFixedCallback() {
        var registrations=new AuthSecurityConfiguration().oauthRegistrations(new AuthSettings("","","http://127.0.0.1:5174"),new GoogleSettings("google-id","google-secret"),false,true);
        var google=registrations.findByRegistrationId("google");
        assertNotNull(google);assertNull(registrations.findByRegistrationId("github"));
        assertEquals(Set.of("openid","profile"),google.getScopes());assertEquals("http://127.0.0.1:5174/login/oauth2/code/google",google.getRedirectUri());
        assertThrows(IllegalStateException.class,()->new AuthSecurityConfiguration().oauthRegistrations(new AuthSettings("","","http://127.0.0.1:5174"),new GoogleSettings("",""),false,true));
    }
}
