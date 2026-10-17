package com.returntrail.auth;

import com.sun.net.httpserver.HttpServer;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.test.context.*;
import org.json.JSONObject;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static org.junit.jupiter.api.Assertions.*;

/** Real filters, signed OIDC tokens/JWKS and real FalkorDB. Local provider, not actual Google. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(GoogleOidcLiveTests.Provider.class)
@EnabledIfEnvironmentVariable(named="RETURNTRAIL_AUTH_LIVE",matches="true")
class GoogleOidcLiveTests {
    static HttpServer provider;
    static final Map<String,Map<String,String>> requests=new ConcurrentHashMap<>();
    @Value("${local.server.port}") int port;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){
        r.add("returntrail.graph.port",()->System.getenv().getOrDefault("FALKORDB_TEST_PORT","6399"));
        r.add("returntrail.auth.registry",()->"returntrail_identity_oidc_"+UUID.randomUUID().toString().replace("-","").substring(0,12));
        r.add("returntrail.cleanup.initial-delay-ms",()->"3600000");
    }
    @TestConfiguration(proxyBeanMethods=false)
    static class Provider {
        @Bean ClientRegistrationRepository localOidc() throws Exception {
            var key=new RSAKeyGenerator(2048).keyID("returntrail-test-key").generate();
            provider=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            String base="http://127.0.0.1:"+provider.getAddress().getPort();
            provider.createContext("/jwks",e->AccountOAuthLiveTests.Provider.reply(e,200,"{\"keys\":["+key.toPublicJWK().toJSONString()+"]}"));
            provider.createContext("/token",e->{
                try {
                    var form=AccountOAuthLiveTests.query(new String(e.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
                    String code=form.get("code");var original=requests.get(code);
                    String hash=Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(form.get("code_verifier").getBytes(StandardCharsets.US_ASCII)));
                    if(original==null || !hash.equals(original.get("code_challenge"))) {AccountOAuthLiveTests.Provider.reply(e,400,"{\"error\":\"invalid_grant\"}");return;}
                    Instant now=Instant.now();
                    var claims=new JWTClaimsSet.Builder().issuer(base).subject(code.equals("person-b")?"102":"101")
                            .audience(code.equals("bad-audience")?"another-client":"google-test")
                            .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(code.equals("expired")?-600:300)))
                            .claim("nonce",code.equals("bad-nonce")?"not-the-request-nonce":original.get("nonce"))
                            .claim("name",code.equals("person-b")?"Shopper B":"Shopper A").build();
                    var jwt=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),claims);
                    jwt.sign(new RSASSASigner(key));
                    AccountOAuthLiveTests.Provider.reply(e,200,new JSONObject().put("access_token","local-"+code).put("token_type","Bearer")
                            .put("scope","openid profile").put("expires_in",300).put("id_token",jwt.serialize()).toString());
                } catch(Exception ex){AccountOAuthLiveTests.Provider.reply(e,500,"{\"error\":\"local_provider_error\"}");}
            });
            provider.createContext("/user",e->{
                boolean b="Bearer local-person-b".equals(e.getRequestHeaders().getFirst("Authorization"));
                AccountOAuthLiveTests.Provider.reply(e,200,b?"{\"sub\":\"102\",\"name\":\"Shopper B\"}":"{\"sub\":\"101\",\"name\":\"Shopper A\"}");
            });provider.start();
            return new InMemoryClientRegistrationRepository(CommonOAuth2Provider.GOOGLE.getBuilder("google")
                    .clientId("google-test").clientSecret("test-only-secret").scope("openid","profile")
                    .authorizationUri(base+"/authorize").tokenUri(base+"/token").userInfoUri(base+"/user")
                    .jwkSetUri(base+"/jwks").issuerUri(base).redirectUri("{baseUrl}/login/oauth2/code/google").build());
        }
    }
    @AfterAll static void stop(){if(provider!=null)provider.stop(0);}
    class Browser {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).followRedirects(HttpClient.Redirect.NEVER).build();
        HttpResponse<String> send(String path,String method,String body,String csrf) throws Exception {
            var r=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path));
            if(csrf!=null)r.header("X-CSRF-TOKEN",csrf);
            if(body!=null)r.header("Content-Type","application/json");
            return http.send(r.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
        }
        JSONObject get(String path) throws Exception {var r=send(path,"GET",null,null);assertEquals(200,r.statusCode(),r.body());return new JSONObject(r.body());}
        HttpResponse<String> login(String code) throws Exception {
            var start=send("/oauth2/authorization/google","GET",null,null);assertEquals(302,start.statusCode());
            var params=AccountOAuthLiveTests.query(URI.create(start.headers().firstValue("Location").orElseThrow()).getRawQuery());
            assertEquals("S256",params.get("code_challenge_method"));assertNotNull(params.get("nonce"));requests.put(code,params);
            return send("/login/oauth2/code/google?code="+code+"&state="+URLEncoder.encode(params.get("state"),StandardCharsets.UTF_8),"GET",null,null);
        }
    }
    @Test void signedOidcLoginPersistsAndRejectsWrongNonceAudienceAndExpiry() throws Exception {
        Browser a=new Browser();assertEquals("/cases",a.login("person-a").headers().firstValue("Location").orElseThrow());
        JSONObject session=a.get("/api/auth/session");assertTrue(session.getBoolean("googleConfigured"));assertFalse(session.getBoolean("githubConfigured"));
        assertEquals("google",session.getJSONObject("profile").getString("provider"));assertFalse(session.toString().contains("google:101"));
        String csrf=a.get("/api/auth/csrf").getString("token");assertEquals(200,a.send("/api/cases/CASE-001/actions","POST",null,csrf).statusCode());
        assertEquals(204,a.send("/api/auth/logout","POST",null,csrf).statusCode());
        Browser again=new Browser();assertEquals("/cases",again.login("person-a").headers().firstValue("Location").orElseThrow());assertEquals(1,again.get("/api/cases/CASE-001/snapshot").getJSONArray("actions").length());
        Browser b=new Browser();assertEquals("/cases",b.login("person-b").headers().firstValue("Location").orElseThrow());assertEquals(0,b.get("/api/cases/CASE-001/snapshot").getJSONArray("actions").length());
        for(String code:List.of("bad-nonce","bad-audience","expired")) {
            Browser rejected=new Browser();assertEquals("/signin?error=signin_failed",rejected.login(code).headers().firstValue("Location").orElseThrow(),code);
            assertFalse(rejected.get("/api/auth/session").getBoolean("authenticated"));
            assertEquals(401,rejected.send("/api/cases/CASE-001/context","GET",null,null).statusCode());
        }
    }
}
