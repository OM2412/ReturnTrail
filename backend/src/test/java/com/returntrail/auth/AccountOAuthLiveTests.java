package com.returntrail.auth;

import com.sun.net.httpserver.HttpServer;
import com.returntrail.session.GuestGraphLifecycle;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.json.JSONObject;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in live FalkorDB + real Spring Security filters. Provider is a local test server, never GitHub. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(AccountOAuthLiveTests.Provider.class)
@EnabledIfEnvironmentVariable(named="RETURNTRAIL_AUTH_LIVE",matches="true")
class AccountOAuthLiveTests {
    static HttpServer provider;
    static final AtomicInteger tokenCalls=new AtomicInteger();
    static final Map<String,String> challenges=new ConcurrentHashMap<>();
    @Value("${local.server.port}") int port;
    @Autowired GuestGraphLifecycle cleanup;
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){
        r.add("returntrail.graph.port",()->System.getenv().getOrDefault("FALKORDB_TEST_PORT","6399"));
        r.add("returntrail.auth.registry",()->"returntrail_identity_test_"+UUID.randomUUID().toString().replace("-","").substring(0,12));
        r.add("returntrail.cleanup.initial-delay-ms",()->"3600000");
    }
    @TestConfiguration(proxyBeanMethods=false)
    static class Provider {
        @Bean ClientRegistrationRepository testGithub() throws Exception {
            provider=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            provider.createContext("/token",exchange->{
                try {
                    tokenCalls.incrementAndGet();
                    Map<String,String> form=query(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
                    String code=form.get("code"), verifier=form.get("code_verifier");
                    String hash=verifier==null?"":Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
                    if(!hash.equals(challenges.get(code))) {reply(exchange,400,"{\"error\":\"invalid_grant\"}");return;}
                    reply(exchange,200,"{\"access_token\":\"token-"+code+"\",\"token_type\":\"bearer\",\"scope\":\"read:user\"}");
                } catch(Exception e){reply(exchange,500,"{\"error\":\"test_provider_failure\"}");}
            });
            provider.createContext("/user",exchange->{
                boolean a="Bearer token-user-a".equals(exchange.getRequestHeaders().getFirst("Authorization"));
                String data=a?"{\"id\":101,\"login\":\"user-a\",\"name\":\"Person A\",\"email\":\"discard@example.invalid\"}":"{\"id\":102,\"login\":\"user-b\",\"name\":\"Person B\"}";
                reply(exchange,200,data);
            });provider.start();
            String base="http://127.0.0.1:"+provider.getAddress().getPort();
            return new InMemoryClientRegistrationRepository(CommonOAuth2Provider.GITHUB.getBuilder("github")
                    .clientId("test-client").clientSecret("not-a-real-secret").authorizationUri(base+"/authorize")
                    .tokenUri(base+"/token").userInfoUri(base+"/user").redirectUri("{baseUrl}/login/oauth2/code/github").build());
        }
        static void reply(com.sun.net.httpserver.HttpExchange exchange,int status,String body) throws java.io.IOException {
            byte[] bytes=body.getBytes(StandardCharsets.UTF_8);exchange.getResponseHeaders().set("Content-Type","application/json");exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        }
    }
    @AfterAll static void stop(){if(provider!=null)provider.stop(0);}
    static Map<String,String> query(String query){
        Map<String,String> result=new HashMap<>();if(query==null)return result;
        for(String part:query.split("&")){String[] pair=part.split("=",2);result.put(URLDecoder.decode(pair[0],StandardCharsets.UTF_8),pair.length>1?URLDecoder.decode(pair[1],StandardCharsets.UTF_8):"");}return result;
    }
    class Browser {
        final CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        final HttpClient http=HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER).build();
        HttpResponse<String> send(String path,String method,String body,String csrf) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Accept","application/json");
            if(csrf!=null)request.header("X-CSRF-TOKEN",csrf);
            if(body!=null)request.header("Content-Type","application/json");
            return http.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
        }
        JSONObject get(String path) throws Exception {var r=send(path,"GET",null,null);assertEquals(200,r.statusCode(),r.body());return new JSONObject(r.body());}
        String csrf() throws Exception {return get("/api/auth/csrf").getString("token");}
        JSONObject post(String path,String body) throws Exception {var r=send(path,"POST",body,csrf());assertEquals(200,r.statusCode(),r.body());return new JSONObject(r.body());}
        String cookie(){return cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("RTSESSION")).map(HttpCookie::getValue).findFirst().orElse("");}
        void login(String code) throws Exception {
            var start=send("/oauth2/authorization/github","GET",null,null);assertEquals(302,start.statusCode());
            var params=query(URI.create(start.headers().firstValue("Location").orElseThrow()).getRawQuery());
            assertEquals("S256",params.get("code_challenge_method"));assertNotNull(params.get("state"));challenges.put(code,params.get("code_challenge"));
            String previous=cookie();var callback=send("/login/oauth2/code/github?code="+code+"&state="+URLEncoder.encode(params.get("state"),StandardCharsets.UTF_8),"GET",null,null);
            assertEquals(302,callback.statusCode());assertEquals("/cases",callback.headers().firstValue("Location").orElseThrow());assertNotEquals(previous,cookie(),"Session ID must rotate on sign-in");
            assertEquals("ACCOUNT",get("/api/auth/session").getString("workspaceMode"));
        }
    }
    @Test void realFiltersEnforceIdentityCsrfPersistenceAndIsolation() throws Exception {
        Browser a=new Browser();
        assertEquals(403,a.send("/api/guest-sessions","POST",null,null).statusCode());
        a.post("/api/guest-sessions",null);a.post("/api/cases/CASE-001/actions",null);
        assertEquals(1,a.get("/api/cases/CASE-001/snapshot").getJSONArray("actions").length());
        a.login("user-a");assertEquals(0,a.get("/api/cases/CASE-001/snapshot").getJSONArray("actions").length(),"Guest sources/tasks must not be silently adopted");
        JSONObject task=a.post("/api/cases/CASE-001/actions",null).getJSONArray("actions").getJSONObject(0);
        JSONObject note=new JSONObject().put("actionId",task.getString("actionId")).put("evidenceRevision",task.getString("evidenceRevision"))
                .put("note","Saved account test note. Not independently verified.").put("outcome","STILL_UNKNOWN").put("expectedVersion",0).put("requestId",UUID.randomUUID().toString());
        a.post("/api/cases/CASE-001/actions/clarification",note.toString());
        assertEquals(409,a.send("/api/guest-sessions","POST",null,a.csrf()).statusCode());
        assertEquals(409,a.send("/api/guest-sessions","DELETE",null,a.csrf()).statusCode());
        assertEquals(403,a.send("/api/auth/logout","POST",null,null).statusCode());
        assertTrue(a.get("/api/auth/session").getBoolean("authenticated"));
        assertEquals(404,a.send("/api/auth/logout","GET",null,null).statusCode());
        String reference=a.get("/api/auth/session").getString("workspaceReference");
        String oldCsrf=a.csrf();assertEquals(204,a.send("/api/auth/logout","POST",null,oldCsrf).statusCode());
        assertEquals(401,a.send("/api/cases/CASE-001/snapshot","GET",null,null).statusCode());
        assertEquals(403,a.send("/api/guest-sessions","POST",null,oldCsrf).statusCode());
        Browser again=new Browser();again.login("user-a");assertNotEquals(reference,again.get("/api/auth/session").getString("workspaceReference"));assertEquals(1,again.get("/api/cases/CASE-001/snapshot").getJSONArray("clarifications").length());
        assertFalse(again.get("/api/auth/session").toString().contains("discard@example"));
        Browser b=new Browser();b.login("user-b");assertEquals(0,b.get("/api/cases/CASE-001/snapshot").getJSONArray("clarifications").length());
        assertEquals(404,b.send("/api/cases/CASE-001/actions/clarification","POST",note.toString(),b.csrf()).statusCode());
        cleanup.sweep();assertEquals(1,again.get("/api/cases/CASE-001/snapshot").getJSONArray("clarifications").length(),"Guest cleanup must not touch account graphs");
        Browser attacker=new Browser();int before=tokenCalls.get();
        var forged=attacker.send("/login/oauth2/code/github?code=user-a&state=forged","GET",null,null);assertEquals(302,forged.statusCode());assertEquals(before,tokenCalls.get());assertEquals(401,attacker.send("/api/cases/CASE-001/snapshot","GET",null,null).statusCode());
    }
}
