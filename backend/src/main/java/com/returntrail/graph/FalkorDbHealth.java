package com.returntrail.graph;
import com.falkordb.Driver;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;
/** GRAPH.LIST checks that the graph module responds; no case data or graph names are exposed. */
@Component("falkorDb")
public class FalkorDbHealth implements HealthIndicator {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FalkorDbHealth.class);
    private final java.util.concurrent.atomic.AtomicReference<String> lastFailure = new java.util.concurrent.atomic.AtomicReference<>();
    private final Driver driver;
    public FalkorDbHealth(Driver driver){this.driver=driver;}
    @Override public Health health(){
        try {
            if (driver.listGraphs() == null) return Health.down().build();
            lastFailure.set(null);
            return Health.up().build();
        } catch(RuntimeException exception) {
            String types = GraphFailureDiagnostics.types(exception);
            if (!types.equals(lastFailure.getAndSet(types)))
                log.warn("FalkorDB readiness failed: {}", types);
            return Health.down().build();
        }
    }
}
