package com.returntrail.graph;
import com.falkordb.Driver;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;
/** GRAPH.LIST checks that the graph module responds; no case data or graph names are exposed. */
@Component("falkorDb")
public class FalkorDbHealth implements HealthIndicator {
    private final Driver driver;
    public FalkorDbHealth(Driver driver){this.driver=driver;}
    @Override public Health health(){
        try { return driver.listGraphs()!=null?Health.up().build():Health.down().build(); }
        catch(RuntimeException exception){return Health.down().build();}
    }
}
