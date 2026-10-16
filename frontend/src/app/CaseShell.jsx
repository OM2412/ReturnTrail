import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleHelp,
  FileText,
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
import { useCase } from "./CaseContext";
import { Brand, ErrorNotice, Spinner } from "../components/UI";

const navigation = [
  { to: "/case", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/case/evidence", label: "Evidence", icon: FileText },
  { to: "/case/graph", label: "Connections", icon: GitBranch },
  { to: "/case/investigation", label: "Investigation", icon: ScanLine },
  { to: "/case/tasks", label: "Follow-up tasks", icon: SquareCheck },
  { to: "/case/history", label: "Case history", icon: History },
].filter((row) => ["/case", "/case/graph"].includes(row.to));

export default function CaseShell() {
  const { phase, data, error, working, refresh, start, reset } = useCase();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const resetDialog = useRef(null);

  useEffect(() => {
    if (phase === "idle") void refresh();
  }, [phase, refresh]);

  async function fresh() {
    resetDialog.current.close();
    if (await reset()) navigate("/case");
  }

  if (!data || phase === "expired")
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
              : "Try a made-up return case. Compare two different explanations and see what needs a reply."}
          </p>
          <ErrorNotice error={error} />
          <div className="button-row">
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
            {phase === "error" && (
              <button
                className="button secondary"
                disabled={!!working}
                onClick={() => void refresh()}
              >
                Retry existing session
              </button>
            )}
          </div>
          <a className="muted-link" href="/">
            Return to landing
          </a>
        </div>
      </main>
    );

  const active = navigation.find((row) => row.to === pathname) || navigation[0];
  const openTasks = data.actions.filter((row) => row.status === "OPEN").length;

  return (
    <div className={`workspace route-${active.to.split("/").at(-1)}`}>
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-case">
          <span className="live-dot" />
          <div>
            <strong>Demo case 001</strong>
            <small>Practice case · not a real order</small>
          </div>
          <span className="case-shortcut">01</span>
        </div>
        <span className="nav-label">YOUR RETURN DESK</span>
        <nav aria-label="Workspace navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
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
          <button
            className="nav-item"
            onClick={() => resetDialog.current.showModal()}
            disabled={!!working}
          >
            <RotateCcw size={17} />
            Start fresh demo
          </button>
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
              Private demo
            </span>
            <button
              className="icon-button"
              aria-label="Refresh case data"
              disabled={!!working}
              onClick={() => void refresh()}
            >
              <RefreshCw
                size={16}
                className={working === "refresh" ? "spin" : ""}
              />
            </button>
            <span className="avatar">RT</span>
          </div>
        </header>

        {mobileOpen && (
          <nav className="mobile-nav" aria-label="Mobile workspace navigation">
            {navigation.map(({ to, label, icon: Icon, end }) => (
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
          </nav>
        )}

        <main id="workspace-main" className="workspace-main">
          <ErrorNotice error={error} />
          <Outlet />
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
          The new case starts without earlier tasks or manual replies.
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
