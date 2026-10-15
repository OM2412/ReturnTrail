package com.returntrail.session;

import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class GuestCleanupConfiguration {

    @Bean
    public ServletListenerRegistrationBean<HttpSessionListener> guestSessionListener(
            GuestGraphLifecycle lifecycle) {

        HttpSessionListener listener = new HttpSessionListener() {
            @Override
            public void sessionDestroyed(HttpSessionEvent event) {
                Object value = event.getSession()
                        .getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE);

                if (value instanceof String graph) {
                    lifecycle.expire(graph);
                }
            }
        };

        return new ServletListenerRegistrationBean<>(listener);
    }
}
