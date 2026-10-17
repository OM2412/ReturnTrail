import GitHubMark from "../components/GitHubMark";
import GoogleMark from "../components/GoogleMark";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  LockKeyhole,
  PackageOpen,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import DeskLamp from "../components/DeskLamp";
import { Brand, Spinner } from "../components/UI";
import { useAuth } from "../app/AuthContext";
import { useCase } from "../app/CaseContext";
import "../styles/auth.css";
const messages = {
  signin_failed:
    "Sign-in didn’t finish. Your workspace is safe. Please try again.",
  workspace_unavailable:
    "We couldn’t open your saved workspace. Please retry in a moment.",
  not_configured:
    "Saved sign-in isn’t available on this instance yet. You can still explore as a guest.",
};
export default function SignIn() {
  const { session, loading, error, refresh } = useAuth(),
    { start, working, data: currentCase } = useCase(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    [on, setOn] = useState(true),
    [guestError, setGuestError] = useState("");
  async function guest() {
    setGuestError("");
    if (await start()) navigate("/cases");
    else
      setGuestError(
        "The practice workspace could not be opened. Please retry.",
      );
  }
  return (
    <div className={`signin-page ${on ? "light-on" : "light-off"}`}>
      <header className="signin-nav">
        <Brand />
        <Link to="/" className="signin-home">
          Back to the story <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className="signin-main">
        <section className="signin-stage" aria-label="Interactive desk lamp">
          <span className="signin-edition">
            THE RETURN DESK <span> / AFTER HOURS EDITION</span>
          </span>
          <h1>
            A little light.
            <br />
            <em>A clearer story.</em>
          </h1>
          <p className="signin-stage-copy">
            Your receipts, replies and “wait, what?” moments.
            <br />
            All connected. All in one place.
          </p>
          <DeskLamp on={on} onToggle={() => setOn((v) => !v)} />
          <span className="signin-illustration-note">
            A desk-side illustration. Your original records stay original.
          </span>
        </section>
        <section className="signin-form-side" aria-labelledby="signin-title">
          <div className="signin-form-card">
            <span className="signin-paper-tab">
              <Lightbulb size={14} /> A PLACE FOR YOUR PAPER TRAIL
            </span>
            <div className="signin-card-top">
              <span className="signin-number">RT / 001</span>
              <span className="signin-private">
                <span />
                PRIVATE WORKSPACE
              </span>
            </div>
            <div className="signin-lock">
              <LockKeyhole size={25} />
            </div>
            <p className="signin-eyebrow">
              {session.authenticated
                ? "YOUR DESK IS READY"
                : "WELCOME TO YOUR RETURN DESK"}
            </p>
            <h2 id="signin-title">
              {session.authenticated ? "Welcome back." : "Come on in."}
              <span>✳</span>
            </h2>
            <p className="signin-intro">
              {session.authenticated
                ? `Good to see you, ${session.profile?.displayName || "friend"}. Pick up the paper trail where you left it.`
                : "Save your context. Keep the receipts. Pick up the story whenever you come back."}
            </p>
            {params.get("status") === "signed_out" && (
              <p className="signin-success" role="status">
                You’re signed out. Your saved workspace stays kept.
              </p>
            )}
            {(messages[params.get("error")] || error || guestError) && (
              <div className="signin-alert" role="alert">
                {messages[params.get("error")] || error || guestError}
                {error && (
                  <button
                    onClick={() => void refresh()}
                    aria-label="Retry session check"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            )}
            {session.authenticated ? (
              <Link className="signin-github" to="/cases">
                Open my workspace <ArrowRight size={19} />
              </Link>
            ) : (
              <>
                <p className="signin-demo-first">Explore first. Save a workspace when you need one.</p>
                <button
                  className="signin-guest"
                  onClick={() => void guest()}
                  disabled={!!working || loading}
                >
                  {working ? (
                    <Spinner label="Opening your desk…" />
                  ) : (
                    <>
                      <PackageOpen size={19} />
                      <span>
                        {session.workspaceMode === "GUEST"
                          ? "Return to guest workspace"
                          : "Explore as a guest"}
                      </span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <div className="signin-divider"><span />or save your demo workspace<span /></div>
                <a
                  className={`signin-github signin-google ${loading || !session.googleConfigured || error ? "unavailable" : ""}`}
                  href={loading || !session.googleConfigured || error ? undefined : "/oauth2/authorization/google"}
                  aria-disabled={loading || !session.googleConfigured || !!error}
                  role="link"
                >
                  <GoogleMark size={21} /><span>Continue with Google</span><ArrowUpRight size={18} />
                </a>
                {!loading && !session.googleConfigured && !error && <p className="signin-availability">Google sign-in is not configured on this instance. You can explore as a guest.</p>}
                <a
                  role="link"
                  className={`signin-github signin-developer ${loading || !session.githubConfigured || error ? "unavailable" : ""}`}
                  href={
                    loading || !session.githubConfigured || error
                      ? undefined
                      : "/oauth2/authorization/github"
                  }
                  aria-disabled={
                    loading || !session.githubConfigured || !!error
                  }
                >
                  {loading ? (
                    <Spinner label="Checking sign-in…" />
                  ) : (
                    <>
                      <GitHubMark size={21} />
                      <span>Continue with GitHub</span>
                      <ArrowUpRight size={18} />
                    </>
                  )}
                </a>
                {!loading && !session.githubConfigured && !session.googleConfigured && !error && (
                  <p className="signin-availability">
                    Saved sign-in is not enabled here yet. The guest desk is
                    open.
                  </p>
                )}
                <p className="signin-provider-note">
                  <ShieldCheck size={14} />
                  Your sign-in provider confirms your identity. ReturnTrail never asks for your password.
                </p>
                {session.workspaceMode === "GUEST" && (
                  <div className="signin-guest-note">
                    Already investigating as a guest? Your saved workspace opens
                    separately.{" "}
                    <Link to={`/case/${currentCase?.caseId || "CASE-001"}/brief`}>
                      Export guest work first <ArrowUpRight size={12} />
                    </Link>
                  </div>
                )}


              </>
            )}
            <div className="signin-promise">
              <span className="signin-promise-icon">✓</span>
              <p>
                {session.authenticated
                  ? "Your sign-in and your saved records are separate. Signing out keeps the records."
                  : "Saved workspaces and guest demos are separate. We request basic identity only, not your inbox or repositories."}
              </p>
            </div>
            <div className="signin-stamp" aria-hidden="true">
              KEEP
              <br />
              THE
              <br />
              CONTEXT<span>↗</span>
            </div>
          </div>
          <p className="signin-fineprint">
            Built for clarity, not conclusions. Demo records and manual replies
            are unverified.
          </p>
        </section>
      </main>
      <footer className="signin-footer">
        <span>Every claim has a source. Every story deserves context.</span>
        <span>
          MADE FOR THE “WAIT, WHAT?” MOMENTS <span aria-hidden="true">✳</span>
        </span>
      </footer>
    </div>
  );
}
