package com.returntrail.auth;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.client.web.*;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import java.util.Map;
import java.util.Set;
@Configuration
@EnableWebSecurity
public class AuthSecurityConfiguration {
    @Bean
    @ConditionalOnExpression("${returntrail.auth.github.enabled:false} || ${returntrail.auth.google.enabled:false}")
    ClientRegistrationRepository oauthRegistrations(AuthSettings settings, GoogleSettings google,
            @org.springframework.beans.factory.annotation.Value("${returntrail.auth.github.enabled:false}") boolean githubEnabled,
            @org.springframework.beans.factory.annotation.Value("${returntrail.auth.google.enabled:false}") boolean googleEnabled) {
        var registrations=new java.util.ArrayList<ClientRegistration>();
        if(githubEnabled) {
            if(!settings.configured())throw new IllegalStateException("Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET before enabling GitHub sign-in");
            registrations.add(CommonOAuth2Provider.GITHUB.getBuilder("github")
                .clientId(settings.clientId()).clientSecret(settings.clientSecret()).scope("read:user")
                .redirectUri(settings.redirectUri()).build());
        }
        if(googleEnabled) {
            if(!google.configured())throw new IllegalStateException("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before enabling Google sign-in");
            registrations.add(CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(google.clientId()).clientSecret(google.clientSecret()).scope("openid","profile")
                .redirectUri(settings.redirectUri("google")).build());
        }
        return new InMemoryClientRegistrationRepository(registrations);
    }
    @Bean
    SecurityFilterChain security(HttpSecurity http,ObjectProvider<ClientRegistrationRepository> registration,
                                 AccountLoginSuccess success) throws Exception {
        var csrf=new HttpSessionCsrfTokenRepository();
        http.authorizeHttpRequests(a->a.anyRequest().permitAll())
                .requestCache(c->c.requestCache(new NullRequestCache()))
                .csrf(c->c.csrfTokenRepository(csrf))
                .sessionManagement(s->s.sessionFixation(f->f.changeSessionId()))
                .formLogin(f->f.disable()).httpBasic(b->b.disable())
                .exceptionHandling(e->e.accessDeniedHandler((request,response,exception)->{
                    response.setStatus(403);response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Your session check expired. Refresh the page before retrying.\"}");
                }))
                .logout(l->l.logoutUrl("/api/auth/logout").invalidateHttpSession(true).clearAuthentication(true)
                        .deleteCookies("RTSESSION").logoutSuccessHandler((req,res,auth)->res.setStatus(204)));
        ClientRegistrationRepository clients=registration.getIfAvailable();
        if(clients!=null) {
            var resolver=new DefaultOAuth2AuthorizationRequestResolver(clients,"/oauth2/authorization");
            resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
            OAuth2AuthorizationRequestResolver enabledResolver=new OAuth2AuthorizationRequestResolver() {
                public org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest resolve(jakarta.servlet.http.HttpServletRequest request) {
                    String id=request.getRequestURI().substring(request.getRequestURI().lastIndexOf('/')+1);
                    return clients.findByRegistrationId(id)==null?null:resolver.resolve(request);
                }
                public org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest resolve(jakarta.servlet.http.HttpServletRequest request,String id) {
                    return clients.findByRegistrationId(id)==null?null:resolver.resolve(request,id);
                }
            };
            var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10000);factory.setReadTimeout(20000);
            var userHttp=new org.springframework.web.client.RestTemplate(factory);
            userHttp.setErrorHandler(new org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler());
            var delegate=new DefaultOAuth2UserService();delegate.setRestOperations(userHttp);
            var oidc=new org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService();
            oidc.setOauth2UserService(delegate);
            var tokenClient=new org.springframework.security.oauth2.client.endpoint.RestClientAuthorizationCodeTokenResponseClient();
            tokenClient.setRestClient(org.springframework.web.client.RestClient.builder().requestFactory(factory)
                    .messageConverters(list->{list.clear();list.add(new org.springframework.http.converter.FormHttpMessageConverter());
                        list.add(new org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter());})
                    .defaultStatusHandler(new org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler()).build());
            http.oauth2Login(o->o.clientRegistrationRepository(clients).loginPage("/signin")
                    .authorizedClientRepository(new HttpSessionOAuth2AuthorizedClientRepository())
                    .authorizationEndpoint(a->a.authorizationRequestResolver(enabledResolver))
                    .tokenEndpoint(t->t.accessTokenResponseClient(tokenClient))
                    .userInfoEndpoint(u->u.oidcUserService(oidc).userService(request->{
                        var user=delegate.loadUser(request);
                        Object id=user.getAttribute("id"),login=user.getAttribute("login"),name=user.getAttribute("name");
                        if(id==null || !id.toString().matches("[0-9]{1,20}"))throw new org.springframework.security.oauth2.core.OAuth2AuthenticationException(new org.springframework.security.oauth2.core.OAuth2Error("invalid_user_info_response"));
                        return new DefaultOAuth2User(Set.of(new SimpleGrantedAuthority("ROLE_USER")),
                                Map.of("id",id.toString(),"login",login==null?"GitHub member":login.toString(),"name",name==null?"":name.toString()),"id");
                    })).successHandler(success)
                    .failureHandler((req,res,error)->{res.setStatus(302);res.setHeader("Location","/signin?error=signin_failed");}));
        }
        return http.build();
    }
}
