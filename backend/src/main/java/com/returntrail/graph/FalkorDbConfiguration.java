package com.returntrail.graph;

import com.falkordb.Driver;
import com.falkordb.FalkorDB;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FalkorDbConfiguration {

    @Bean(destroyMethod = "close")
    public Driver falkorDbDriver(
            @Value("${returntrail.graph.host}") String host,
            @Value("${returntrail.graph.port}") int port,
            @Value("${returntrail.graph.username:}") String username,
            @Value("${returntrail.graph.password:}") String password,
            @Value("${returntrail.graph.ssl:false}") boolean ssl) {
        if (!username.isBlank() && password.isEmpty()) {
            throw new IllegalArgumentException("FALKORDB_PASSWORD is required when FALKORDB_USERNAME is set.");
        }
        var builder = FalkorDB.builder().host(host).port(port).ssl(ssl)
                .connectionTimeout(Duration.ofSeconds(5))
                .socketTimeout(Duration.ofSeconds(30))
                .poolMaxTotal(8).poolMaxIdle(4).poolMaxWait(Duration.ofSeconds(5));
        if (!password.isEmpty()) {
            if (username.isBlank()) builder.credentials(password);
            else builder.credentials(username, password);
        }
        return builder.build();
    }
}
