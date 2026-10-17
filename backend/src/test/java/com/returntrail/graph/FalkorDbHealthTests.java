package com.returntrail.graph;
import com.falkordb.Driver;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class FalkorDbHealthTests {
    @Test void emptyDatabaseIsReadyWithoutCreatingAHealthGraph(){
        var driver=mock(Driver.class);when(driver.listGraphs()).thenReturn(List.of());
        assertEquals("UP",new FalkorDbHealth(driver).health().getStatus().getCode());verify(driver).listGraphs();verifyNoMoreInteractions(driver);
    }
    @Test void databaseFailureDoesNotLeakExceptionOrGraphNames(){
        var driver=mock(Driver.class);when(driver.listGraphs()).thenThrow(new IllegalStateException("private-address secret"));
        var health=new FalkorDbHealth(driver).health();assertEquals("DOWN",health.getStatus().getCode());assertTrue(health.getDetails().isEmpty());
    }
}
