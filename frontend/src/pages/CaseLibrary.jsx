import { useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  GitBranch,
  Layers,
  MessageCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../app/AuthContext";
import { useCase } from "../app/CaseContext";
import { Brand, ErrorNotice, PageTitle, Spinner } from "../components/UI";
const looks = {
  PICKUP_DISAGREEMENT: {
    icon: GitBranch,
    label: "Mixed signals",
    color: "lilac",
    prompt: "Do these stories belong together?",
  },
  SEPARATE_ATTEMPTS: {
    icon: Layers,
    label: "Plot twist",
    color: "peach",
    prompt: "Same words. A different attempt.",
  },
  MISSING_CONTEXT: {
    icon: Search,
    label: "Missing piece",
    color: "lime",
    prompt: "An unknown reason stays unknown.",
  },
  SAVED_CLARIFICATION: {
    icon: MessageCircle,
    label: "Reply included",
    color: "mint",
    prompt: "New context. Original history.",
  },
};
export default function CaseLibrary() {
  const { session: auth } = useAuth();
  const { cases, phase, error, working, refresh, start } = useCase();
  useEffect(() => {
    if (phase === "idle") void refresh();
  }, [phase, refresh]);
  return (
    <div className="case-library">
      <header className="library-nav wrap">
        <Brand />
        <Link
          className="text-link"
          to={auth.authenticated ? "/account" : "/signin"}
        >
          {auth.authenticated ? "My account" : "Sign in"}
        </Link>
        <Link className="text-link" to="/">
          <ArrowLeft size={16} /> Back home
        </Link>
      </header>
      <main className="wrap library-main">
        <PageTitle
          label="THE RETURN DESK / PICK A STORY"
          title="Four cases. More than one plot."
          description="Try the same investigation on different relationships. Every record here is fictional, and each case keeps its own tasks and replies."
        />
        <ErrorNotice error={error} />
        {!cases.length ? (
          <section className="panel library-welcome">
            <span className="chunky-icon">
              <ShieldCheck size={28} />
            </span>
            <h2>Open your practice workspace.</h2>
            <p>
              No account needed. Your own copy of the cases, with room to
              investigate.
            </p>
            <button
              className="button primary"
              disabled={!!working}
              onClick={() => void start()}
            >
              {working ? (
                <Spinner label="Opening the case shelf…" />
              ) : (
                <>
                  Start practice workspace <ArrowUpRight size={18} />
                </>
              )}
            </button>
          </section>
        ) : (
          <div className="case-card-grid">
            {cases.map((row, index) => {
              const look = looks[row.scenario] || looks.PICKUP_DISAGREEMENT;
              const Icon = look.icon;
              return (
                <article
                  className={`case-library-card tone-${look.color}`}
                  key={row.caseId}
                >
                  <div className="case-card-top">
                    <span className="sticker">{look.label}</span>
                    <span className="case-card-number">0{index + 1}</span>
                  </div>
                  <span className="library-case-icon">
                    <Icon size={32} />
                  </span>
                  <p className="eyebrow">{row.caseId} / SYNTHETIC</p>
                  <h2>{row.title}</h2>
                  <p>{row.description}</p>
                  <div className="case-lesson">{look.prompt}</div>
                  <Link
                    className={`button ${working ? "secondary" : "ink-button"}`}
                    aria-label={`Open ${row.caseId}`}
                    to={`/case/${row.caseId}`}
                  >
                    Unpack this case <ArrowUpRight size={18} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        <div className="library-footnote">
          <ShieldCheck size={18} />
          <p>
            These are teaching scenarios, not real complaints. The saved-reply
            example contains a prewritten, unverified synthetic note. Demo dates
            are illustrative.
          </p>
        </div>
      </main>
    </div>
  );
}
