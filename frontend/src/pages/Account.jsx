import GitHubMark from "../components/GitHubMark";
import GoogleMark from "../components/GoogleMark";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  ShieldCheck,
  FolderLock,
  LampDesk,
} from "lucide-react";
import { useAuth } from "../app/AuthContext";
import { Brand, Spinner } from "../components/UI";
import "../styles/auth.css";
export default function Account() {
  const { session, loading, error, signOut, refresh } = useAuth(),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const providerName = session.profile?.provider === "google" ? "Google" : "GitHub";
  async function logout() {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      setFailure(e.message);
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="route-loading">
        <Spinner label="Opening your account…" />
      </main>
    );
  if (!session.authenticated && !error)
    return <Navigate to="/signin" replace />;
  if (error)
    return (
      <main className="recovery">
        <Brand />
        <h1>Your account could not be checked.</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => void refresh()}>
          Retry session check
        </button>
        <Link to="/signin">Back to sign in</Link>
      </main>
    );
  return (
    <div className="account-page">
      <header className="library-nav wrap">
        <Brand />
        <Link to="/cases" className="text-link">
          <ArrowLeft size={16} />
          Back to my workspace
        </Link>
      </header>
      <main className="account-main">
        <span className="sticker">YOUR DESK / KEPT FOR YOU</span>
        <span className="account-light">
          <LampDesk size={32} />
        </span>
        <h1>
          Your context.
          <br />
          Your little corner.
        </h1>
        <p className="account-intro">
          Sign out when you’re done. Your saved sources, tasks and manual
          replies stay in your account workspace.
        </p>
        {(error || failure) && (
          <p role="alert" className="notice notice-error">
            {error || failure}
            {error && (
              <button
                className="button secondary"
                onClick={() => void refresh()}
              >
                Retry session check
              </button>
            )}
          </p>
        )}
        <section className="account-identity">
          <span className="account-monogram">
            {session.profile?.displayName?.slice(0, 1) || "R"}
          </span>
          <div>
            <h2>{session.profile?.displayName || "Your account"}</h2>
            <p>
              {providerName === "Google" ? <GoogleMark size={15} /> : <GitHubMark size={15} />}
              {providerName === "GitHub" ? `@${session.profile?.login || "member"} · ` : ""}{providerName} sign-in
            </p>
          </div>
          <span className="account-connected">Connected</span>
        </section>
        <div className="account-details">
          <div>
            <FolderLock size={22} />
            <h3>A workspace of your own</h3>
            <p>
              Server-side ownership links your sign-in to your saved cases.
              Guest workspaces are separate.
            </p>
          </div>
          <div>
            <ShieldCheck size={22} />
            <h3>Your password stays with {providerName}</h3>
            <p>
              ReturnTrail keeps the identity needed to reopen your workspace. It
              doesn’t store your provider password or keep its API access token after sign-in.
            </p>
          </div>
        </div>
        <div className="account-actions">
          <Link className="button primary" to="/cases">
            Back to the paper trail <ArrowRight size={18} />
          </Link>
          <button
            className="button secondary"
            onClick={() => void logout()}
            disabled={busy || !!error}
          >
            {busy ? (
              <Spinner label="Signing out…" />
            ) : (
              <>
                <LogOut size={17} />
                Sign out
              </>
            )}
          </button>
        </div>
        <p className="account-limits">
          A backend restart may ask you to sign in again. Saved records remain
          while this instance’s database is retained. Records are synthetic;
          manual explanations are not independently verified.
        </p>
      </main>
    </div>
  );
}
