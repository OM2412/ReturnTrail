import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { api } from "../lib/api";
const AuthContext = createContext(null);
const anonymous = {
  authenticated: false,
  githubConfigured: false,
  googleConfigured: false,
  workspaceMode: "NONE",
  profile: null,
};
export function AuthProvider({ children }) {
  const [session, setSession] = useState(anonymous),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null);
  const checking = useRef(null);
  const refresh = useCallback(() => {
    if (checking.current) return checking.current;
    checking.current = (async () => {
      try {
        const next = await api.session();
        if (
          typeof next.authenticated !== "boolean" ||
          !["NONE", "GUEST", "ACCOUNT"].includes(next.workspaceMode) ||
          (next.authenticated &&
            (next.workspaceMode !== "ACCOUNT" ||
              typeof next.profile?.login !== "string"))
        )
          throw new Error("The session could not be checked. Please retry.");
        setSession(next);
        setError(null);
        return next;
      } catch (e) {
        setError(e.message);
        return null;
      } finally {
        setLoading(false);
        checking.current = null;
      }
    })();
    return checking.current;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const check = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [refresh]);
  const signOut = useCallback(async () => {
    await api.logout();
    window.location.assign("/signin?status=signed_out");
  }, []);
  return (
    <AuthContext.Provider value={{ session, loading, error, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
