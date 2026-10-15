package com.returntrail.graph;

import com.falkordb.Driver;
import com.falkordb.FalkorDB;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FalkorDbConfiguration {

    @Bean(destroyMethod = "close")
    public Driver falkorDbDriver(
            @Value("${returntrail.graph.host}") String host,
            @Value("${returntrail.graph.port}") int port) {
        return FalkorDB.driver(host, port);
    }
}
