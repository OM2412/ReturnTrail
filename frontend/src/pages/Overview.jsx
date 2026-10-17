import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  GitBranch,
  History,
  MessageCircle,
  PackageOpen,
  ScanLine,
  SquareCheck,
} from "lucide-react";
import Link from "../components/CaseLink";
import { useCase } from "../app/CaseContext";
import {
  EvidenceQuote,
  FeatureLink,
  PageTitle,
  SourceNote,
  Status,
} from "../components/UI";
import { pendingFindings, plural } from "../lib/domain";

export default function Overview() {
  const { data, run } = useCase();
  const pending = pendingFindings(data.findings, data.clarifications);
  const open = data.actions.filter((row) => row.status === "OPEN");
  const resolved = data.actions.filter((row) => row.status === "RESOLVED");
  const disagreements = data.findings.filter(
    (row) => row.type === "PICKUP_REASON_DISAGREEMENT",
  );
  const hasConflict = disagreements.length > 0;
  const next = pending.length
    ? open.length
      ? {
          title: "One question needs a reply.",
          copy: "Your follow-up is ready. Add the explanation you received, and keep it with the original records.",
          to: "/case/tasks",
          cta: "Open the follow-up",
        }
      : {
          title: "Let’s find the missing context.",
          copy: "Run a check to read the records, review saved replies, and prepare a question if it is still needed.",
          to: "/case/investigation",
          cta: "Investigate case",
        }
    : {
        title: "No question pending under this check.",
        copy: data.clarifications.length
          ? "No follow-up is pending under this check. Review the manual reply alongside the original records."
          : "The supported check found no pending question. Review the original records and their pickup links; this does not verify their explanations.",
        to: data.clarifications.length ? "/case/tasks" : "/case/investigation",
        cta: data.clarifications.length
          ? "Read the saved reply"
          : "Open investigation",
      };
  return (
    <>
      <PageTitle
        label={`YOUR RETURN DESK / ${data.caseId}`}
        title="Okay, let’s unpack this."
        description="The short version of your case. What was said, what differs, and what you can do next."
      >
        <Link className="button primary" to="/case/investigation">
          <ScanLine size={18} />
          {run ? "Review investigation" : "Investigate case"}
        </Link>
      </PageTitle>
      {data.changes?.latestEvidenceIds?.length > 0 && (
        <section className="context-changed">
          <span className="sticker">
            NEW CONTEXT / VERSION {data.evidenceVersion}
          </span>
          <div>
            <strong>A source joined the story.</strong>
            <p>
              {data.changes.latestEvidenceIds.length} new source at the latest
              evidence version.{" "}
              {data.changes.earlierTaskIds.length > 0
                ? "Earlier task history stays; the current source set needs its own review."
                : "Review the updated records before taking the next step."}
            </p>
          </div>
          <Link className="button ink-button" to="/case/investigation">
            Review what’s pending <ArrowRight size={16} />
          </Link>
        </section>
      )}
      <section className="overview-hero">
        <div>
          <span className="sticker dark-sticker">
            PRACTICE CASE / {data.caseId}
          </span>
          <h2>
            {hasConflict ? (
              <>
                One pickup.
                <br />
                <span>Two different explanations.</span>
              </>
            ) : (
              <>
                {data.caseInfo.title}
                <br />
                <span>
                  {data.assessment === "MISSING_CONTEXT"
                    ? "We need one more piece."
                    : "The relationships matter."}
                </span>
              </>
            )}
          </h2>
          <p>
            {hasConflict
              ? "One record says the customer cancelled. Another says the courier was unavailable. Here’s the context, in one place."
              : data.caseInfo.lesson}
          </p>
          <Link className="text-link" to="/case/graph">
            See how the stories connect <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="overview-art" aria-hidden="true">
          {hasConflict && (
            <>
              <div className="mini-note note-a">
                <FileText size={22} />
                <span>Story A</span>
                <b>You cancelled?</b>
              </div>
              <div className="mini-note note-b">
                <FileText size={22} />
                <span>Story B</span>
                <b>No courier?</b>
              </div>
            </>
          )}
          <div className="mini-parcel">
            <PackageOpen size={58} />
          </div>
          <span className="art-spark">✳</span>
        </div>
      </section>
      <div className="metric-grid">
        {[
          {
            label: "Original records",
            value: data.evidence.length,
            sub: "The statements we can read",
            icon: FileText,
            color: "peach",
          },
          {
            label: "Disagreements found",
            value: disagreements.length,
            sub: "Kept in the original history",
            icon: GitBranch,
            color: "lilac",
          },
          {
            label: "Questions still pending",
            value: pending.length,
            sub: "After saved replies are checked",
            icon: MessageCircle,
            color: "lime",
          },
          {
            label: "Questions with an explanation",
            value: resolved.length,
            sub: "Task status, not case closure",
            icon: SquareCheck,
            color: "mint",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <article className={`metric-card tone-${color}`} key={label}>
            <div>
              <span>{label}</span>
              <Icon size={20} />
            </div>
            <strong>{value.toString().padStart(2, "0")}</strong>
            <small>{sub}</small>
          </article>
        ))}
      </div>
      <div className="overview-columns">
        <section className="panel source-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">THE PLOT THICKENS</span>
              <h2>
                {hasConflict
                  ? "Here’s where they disagree."
                  : "Here’s what the records say."}
              </h2>
            </div>
            <Link
              className="round-link"
              to="/case/evidence"
              aria-label="Explore evidence"
            >
              <ArrowUpRight size={21} />
            </Link>
          </div>
          <div className="quote-grid">
            {data.evidence.slice(0, 2).map((row, i) => (
              <EvidenceQuote key={`${row.evidenceId}-${i}`} row={row} compact />
            ))}
          </div>
          <SourceNote>
            A recorded claim is an account of what happened. It does not prove
            who was at fault.
          </SourceNote>
        </section>
        <section className="next-step-card">
          <span className="sticker">YOUR NEXT LITTLE MOVE</span>
          <span className="next-icon">
            {pending.length ? <ArrowUpRight size={33} /> : <Check size={33} />}
          </span>
          <h2>{next.title}</h2>
          <p>{next.copy}</p>
          <Link className="button ink-button" to={next.to}>
            {next.cta}
            <ArrowRight size={18} />
          </Link>
        </section>
      </div>
      <div className="overview-columns bottom-columns">
        <section className="panel desk-panel">
          <div className="panel-title">
            <h2>Pick your next stop.</h2>
            <span className="eyebrow">YOUR CALL</span>
          </div>
          <FeatureLink
            to="/case/evidence"
            icon={FileText}
            label="Read the evidence"
            detail="Original statements, scoped to each pickup"
            number={data.evidence.length}
          />
          <FeatureLink
            to="/case/graph"
            icon={GitBranch}
            label="Connect the dots"
            detail="A 3D look at what belongs together"
          />
          <FeatureLink
            to="/case/history"
            icon={History}
            label="Follow the timeline"
            detail="When tasks and manual replies were saved"
          />
        </section>
        <section className="panel task-preview">
          <div className="panel-title">
            <h2>Your follow-up shelf.</h2>
            <Link to="/case/tasks">
              {plural(data.actions.length, "task")} <ArrowUpRight size={15} />
            </Link>
          </div>
          {data.actions.length ? (
            data.actions.map((action) => (
              <Link
                className="saved-task"
                key={action.actionId}
                to={`/case/tasks?task=${encodeURIComponent(action.actionId)}`}
              >
                <span className="chunky-icon">
                  <SquareCheck size={22} />
                </span>
                <div>
                  <strong>Clarify the pickup reason</strong>
                  <small>
                    {action.status === "RESOLVED"
                      ? "A manual reply has been saved."
                      : "One explanation is still needed."}
                  </small>
                </div>
                <Status value={action.status} />
              </Link>
            ))
          ) : (
            <div className="quiet-empty">
              <MessageCircle size={30} />
              <p>No task on the shelf yet.</p>
              <Link to="/case/investigation">
                Run a check to see what’s needed <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
