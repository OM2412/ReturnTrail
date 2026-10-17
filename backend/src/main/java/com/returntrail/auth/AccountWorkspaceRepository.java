package com.returntrail.auth;
import com.falkordb.Driver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
@Repository
public class AccountWorkspaceRepository {
    private final Driver driver;
    private final String registry, seed;
    public AccountWorkspaceRepository(Driver driver,
            @Value("${returntrail.auth.registry:returntrail_identity_registry}") String registry) throws IOException {
        if(!registry.matches("returntrail_identity_[a-z0-9_]{1,40}")) throw new IllegalArgumentException("Invalid identity registry name");
        this.driver=driver;this.registry=registry;
        try(var input=new ClassPathResource("graph/seed-demo-workspace.cypher").getInputStream()) {
            seed=new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
    // This application supports one backend replica; serialize first workspace initialization.
    public synchronized String open(WorkspaceIdentity identity) {
        String candidate="returntrail_account_"+UUID.randomUUID().toString().replace("-", "");
        var result=driver.graph(registry).query("""
                MERGE (a:AccountIdentity {id:$identity})
                ON CREATE SET a.provider=$provider, a.workspace=$workspace, a.createdAt=$now, a.initialized=false
                RETURN a.workspace AS workspace, a.initialized AS initialized
                """,Map.of("identity",identity.key(),"provider",identity.provider(),"workspace",candidate,"now",Instant.now().toString()));
        String graph=null;boolean initialized=false;
        for(com.falkordb.Record row:result) {
            if(graph!=null) throw new IllegalStateException("Multiple account workspaces returned");
            graph=row.getValue("workspace");initialized=Boolean.TRUE.equals(row.getValue("initialized"));
        }
        if(!isAccountGraph(graph)) throw new IllegalStateException("Invalid saved workspace binding");
        if(!initialized) {
            int count=0;for(com.falkordb.Record ignored:driver.graph(graph).query(seed))count++;
            if(count!=1) throw new IllegalStateException("Saved workspace could not be initialized");
            driver.graph(registry).query("MATCH (a:AccountIdentity {id:$identity,workspace:$workspace}) SET a.initialized=true RETURN a.id",
                    Map.of("identity",identity.key(),"workspace",graph));
        }
        return graph;
    }
    public static boolean isAccountGraph(String graph) {
        return graph!=null && graph.matches("returntrail_account_[a-f0-9]{32}");
    }
}
