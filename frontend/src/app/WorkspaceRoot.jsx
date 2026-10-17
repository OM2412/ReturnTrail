import App from "./App";
import { CaseProvider } from "./CaseContext";
import { useAuth } from "./AuthContext";
export default function WorkspaceRoot() {
  const { session } = useAuth();
  return (
    <CaseProvider
      key={
        session.workspaceReference || (session.authenticated ? `account:${session.profile?.login}` : "guest")
      }
    >
      <App />
    </CaseProvider>
  );
}
