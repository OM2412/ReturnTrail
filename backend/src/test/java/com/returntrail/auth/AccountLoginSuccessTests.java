package com.returntrail.auth;
import com.returntrail.session.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AccountLoginSuccessTests {
    private final AccountWorkspaceRepository accounts=mock(AccountWorkspaceRepository.class);
    private final GuestGraphLifecycle guests=mock(GuestGraphLifecycle.class);
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @Test void opensSavedWorkspaceAndRetiresOnlyPreviousGuest() throws Exception {
        var request=new MockHttpServletRequest();var response=new MockHttpServletResponse();var auth=WorkspaceAccessTests.identity("101","github");
        String guest="returntrail_guest_"+"a".repeat(32),account="returntrail_account_"+"b".repeat(32);
        request.getSession().setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,guest);when(accounts.open(any())).thenReturn(account);
        new AccountLoginSuccess(accounts,guests).onAuthenticationSuccess(request,response,auth);
        assertEquals(account,request.getSession().getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE));assertEquals("github:101",request.getSession().getAttribute(WorkspaceAccess.ACCOUNT_SUBJECT));
        assertEquals("/cases",response.getHeader("Location"));verify(guests).expire(guest);
    }
    @Test void failedAccountOpenLeavesGuestAndClearsAuthentication() throws Exception {
        var request=new MockHttpServletRequest();var response=new MockHttpServletResponse();var auth=WorkspaceAccessTests.identity("101","github");
        String guest="returntrail_guest_"+"a".repeat(32);request.getSession().setAttribute(GuestGraphScope.GRAPH_ATTRIBUTE,guest);SecurityContextHolder.getContext().setAuthentication(auth);
        when(accounts.open(any())).thenThrow(new IllegalStateException("Storage unavailable"));
        new AccountLoginSuccess(accounts,guests).onAuthenticationSuccess(request,response,auth);
        assertNull(SecurityContextHolder.getContext().getAuthentication());assertEquals(guest,request.getSession().getAttribute(GuestGraphScope.GRAPH_ATTRIBUTE));assertEquals("/signin?error=workspace_unavailable",response.getHeader("Location"));verifyNoInteractions(guests);
    }
}
