import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleHelp,
  FileText,
  Inbox,
  Download,
  GitBranch,
  History,
  LayoutDashboard,
  Menu,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  SquareCheck,
  X,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useCase } from "./CaseContext";
import { Brand, ErrorNotice, Spinner } from "../components/UI";

const navigation = [
  { to: "/case", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/case/evidence", label: "Evidence", icon: FileText },
  { to: "/case/inbox", label: "Evidence inbox", icon: Inbox },
  { to: "/case/brief", label: "Case brief", icon: Download },
  { to: "/case/graph", label: "Connections", icon: GitBranch },
  { to: "/case/context", label: "Context lab", icon: CircleHelp },
  { to: "/case/investigation", label: "Investigation", icon: ScanLine },
  { to: "/case/tasks", label: "Follow-up tasks", icon: SquareCheck },
  { to: "/case/history", label: "Case history", icon: History },
];

export default function CaseShell() {
  const { session: auth } = useAuth();
  const { phase, data, error, working, refresh, start, reset } = useCase();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { caseId } = useParams();
  const scopedNavigation = navigation.map((row) => ({
    ...row,
    to: row.to.replace("/case", `/case/${caseId}`),
  }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const resetDialog = useRef(null);

  useEffect(() => {
    if (
      !working &&
      (phase === "idle" || (phase === "ready" && data?.caseId !== caseId))
    )
      void refresh(caseId);
  }, [phase, refresh, caseId, data?.caseId, working]);

  async function fresh() {
    resetDialog.current.close();
    if (await reset()) navigate("/cases");
  }

  if (!data || data.caseId !== caseId || phase === "expired")
    return (
      <main className="recovery">
        <Brand />
        <div className="recovery-card">
          <span className="large-icon">
            <ShieldCheck size={34} />
          </span>
          <h1>
            {phase === "expired"
              ? "Your demo session has ended."
              : phase === "error"
                ? "The case could not be opened."
                : working
                  ? "Opening your workspace."
                  : "Open a demo case."}
          </h1>
          <p>
            {phase === "expired"
              ? "Open a fresh demo case to continue. Earlier guest notes may no longer be available."
              : "Open a fictional case and follow its source-linked records. A missing case can be selected from the case library."}
          </p>
          <ErrorNotice error={error} />
          <div className="button-row">
            {(auth.authenticated || phase === "expired") && (
              <NavLink className="button secondary" to="/signin">
                Sign in again
              </NavLink>
            )}
            {error?.status === 404 ? (
              <NavLink className="button primary" to="/cases">
                Choose another case <ArrowUpRight size={17} />
              </NavLink>
            ) : (
              <button
                className="button primary"
                disabled={!!working}
                onClick={() => void start()}
              >
                {working ? (
                  <Spinner label="Please wait..." />
                ) : (
                  <>
                    Open demo case <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            )}
            {phase === "error" && error?.status !== 404 && (
              <button
                className="button secondary"
                disabled={!!working}
                onClick={() => void refresh(caseId)}
              >
                Retry existing session
              </button>
            )}
          </div>
          <a className="muted-link" href="/cases">
            Choose a case
          </a>
        </div>
      </main>
    );

  const active =
    scopedNavigation.find((row) => row.to === pathname) || scopedNavigation[0];
  const openTasks = data.actions.filter((row) => row.status === "OPEN").length;

  return (
    <div
      className={`workspace route-${active.to === `/case/${caseId}` ? "case" : active.to.split("/").at(-1)}`}
    >
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-case">
          <span className="live-dot" />
          <div>
            <strong>{data.caseId}</strong>
            <small>Practice case · not a real order</small>
          </div>
          <NavLink
            className="case-shortcut"
            to="/cases"
            aria-label="Choose another case"
          >
            ↗
          </NavLink>
        </div>
        <NavLink className="library-switch" to="/cases">
          ← Choose another story
        </NavLink>
        <span className="nav-label">YOUR RETURN DESK</span>
        <nav aria-label="Workspace navigation">
          {scopedNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Evidence" && (
                <small aria-hidden="true">{data.evidence.length}</small>
              )}
              {label === "Follow-up tasks" && openTasks > 0 && (
                <small aria-hidden="true">{openTasks}</small>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <CircleHelp size={17} />
            <p>
              Less confusion.
              <br />
              More “oh, that makes sense.”
            </p>
          </div>
          {!auth.authenticated && (
            <button
              className="nav-item"
              onClick={() => resetDialog.current.showModal()}
              disabled={!!working}
            >
              <RotateCcw size={17} />
              Start fresh demo
            </button>
          )}
          <NavLink
            className="nav-item"
            to={auth.authenticated ? "/account" : "/signin"}
          >
            {auth.authenticated ? "My account" : "Sign in & save a workspace"}
          </NavLink>
          <NavLink className="nav-item" to="/">
            <ArrowLeft size={17} />
            Back to landing
          </NavLink>
        </div>
      </aside>

      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{active.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="session-pill">
              <span />
              {auth.authenticated ? "Saved workspace" : "Private demo"}
            </span>
            <button
              className="icon-button"
              aria-label="Refresh case data"
              disabled={!!working}
              onClick={() => void refresh(caseId)}
            >
              <RefreshCw
                size={16}
                className={working === "refresh" ? "spin" : ""}
              />
            </button>
            <NavLink
              className="avatar account-avatar-link"
              to={auth.authenticated ? "/account" : "/signin"}
              aria-label={auth.authenticated ? `${auth.profile?.displayName?.slice(0, 1) || "R"} · Open account` : "RT · Open sign in"}
            >
              <span>{auth.authenticated
                ? auth.profile?.displayName?.slice(0, 1) || "R"
                : "RT"}</span>
            </NavLink>
          </div>
        </header>

        {mobileOpen && (
          <nav className="mobile-nav" aria-label="Mobile workspace navigation">
            {scopedNavigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                end={end}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            {!auth.authenticated && (
              <button
                className="nav-item"
                disabled={!!working}
                onClick={() => {
                  setMobileOpen(false);
                  resetDialog.current.showModal();
                }}
              >
                <RotateCcw size={17} />
                Start fresh demo
              </button>
            )}
            <NavLink
              to={auth.authenticated ? "/account" : "/signin"}
              onClick={() => setMobileOpen(false)}
              className="nav-item"
            >
              {auth.authenticated ? "My account" : "Sign in & save a workspace"}
            </NavLink>
          </nav>
        )}

        <main id="workspace-main" className="workspace-main">
          <ErrorNotice error={error} />
          <Outlet key={caseId} />
        </main>
        <footer className="workspace-footer">
          <span>Every claim has a source. Every next step has a reason.</span>
          <span>Practice case · No messages or refunds sent</span>
        </footer>
      </div>

      <dialog ref={resetDialog} className="reset-dialog">
        <h2>Start a fresh demo?</h2>
        <p>
          This ends your current demo session. Its saved records may be cleared.
          The new workspace starts without your earlier tasks or manual replies.
        </p>
        <div className="button-row">
          <button
            className="button secondary"
            onClick={() => resetDialog.current.close()}
          >
            Keep this case
          </button>
          <button className="button primary" onClick={() => void fresh()}>
            Start fresh
          </button>
        </div>
      </dialog>
    </div>
  );
}
