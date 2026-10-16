import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Check,
  FileText,
  GitBranch,
  MessageCircle,
  PackageOpen,
  Play,
  ScanLine,
  ShieldCheck,
  Sparkles,
  SquareCheck,
} from "lucide-react";
import { useCase } from "../app/CaseContext";
import {
  EvidenceQuote,
  PageTitle,
  RecordLink,
  SourceNote,
  Spinner,
} from "../components/UI";
import { pendingFindings, plural } from "../lib/domain";
const toolInfo = {
  get_case_evidence: {
    label: "Read the original records",
    icon: FileText,
    singular: "record",
  },
  get_case_clarifications: {
    label: "Look for saved replies",
    icon: MessageCircle,
    singular: "reply",
    multiple: "replies",
  },
  get_case_findings: {
    label: "Check what still needs a reply",
    icon: GitBranch,
    singular: "pending question",
  },
  prepare_followup_action: {
    label: "Save or reuse the follow-up",
    icon: SquareCheck,
    singular: "task",
  },
};
export default function Investigation() {
  const { data, run, working, investigate } = useCase();
  const [duration, setDuration] = useState(null);
  const pending = pendingFindings(data.findings, data.clarifications);
  const running = working === "investigate";
  async function perform() {
    const start = performance.now();
    if (await investigate())
      setDuration(((performance.now() - start) / 1000).toFixed(1));
  }
  return (
    <>
      <PageTitle
        label="LET’S UNTANGLE IT"
        title="A clearer story starts here."
        description="Read the records, check earlier replies, and find out whether another question is needed."
      >
        <button
          className="button primary"
          disabled={!!working}
          onClick={() => void perform()}
        >
          {running ? (
            <Spinner label="Checking the case…" />
          ) : (
            <>
              <Play size={17} />
              {run ? "Run investigation again" : "Run investigation"}
            </>
          )}
        </button>
      </PageTitle>
      {running && (
        <div className="investigation-running" role="status">
          <span className="scan-orbit">
            <PackageOpen size={34} />
          </span>
          <div>
            <h2>Unpacking the plot. One moment.</h2>
            <p>
              The check is running. Completed steps will appear when the
              response arrives. You can visit the other case pages while you
              wait.
            </p>
          </div>
          <span className="sticker">ON IT.</span>
        </div>
      )}
      <div className="investigation-layout">
        <section className="panel investigation-result">
          <div className="panel-title">
            <h2>
              {run
                ? "Here’s the short version."
                : "Let’s connect the whole story."}
            </h2>
            <span className="sticker">
              {run ? "RECORDS FIRST" : "YOUR CALL"}
            </span>
          </div>
          {run ? (
            <>
              <div
                className={`result-verdict ${run.pendingFindings.length ? "needs-reply" : "reply-saved"}`}
              >
                <span className="chunky-icon">
                  {run.pendingFindings.length ? (
                    <MessageCircle size={27} />
                  ) : (
                    <Check size={27} />
                  )}
                </span>
                <div>
                  <span className="eyebrow">
                    {run.pendingFindings.length
                      ? "ONE MORE PIECE OF CONTEXT"
                      : "SAVED CONTEXT CHECKED"}
                  </span>
                  <h3>
                    {run.pendingFindings.length
                      ? "The records still need an explanation."
                      : run.clarifications?.length
                        ? "Reply saved. History kept."
                        : "No follow-up is pending."}
                  </h3>
                  <p>
                    {run.pendingFindings.length
                      ? "The recorded reasons differ. A local follow-up keeps the question with its sources."
                      : "No pending follow-up was returned by this check. That does not mean the entire case is resolved."}
                  </p>
                </div>
              </div>
              <div className="summary-scoreboard">
                <span>
                  <b>{(run.evidence || data.evidence).length}</b> original
                  records
                </span>
                <span>
                  <b>{(run.findings || data.findings).length}</b> historical
                  disagreements
                </span>
                <span>
                  <b>{run.pendingFindings.length}</b> pending questions
                </span>
              </div>
              <div className="quote-grid result-quotes">
                {(run.evidence || data.evidence).slice(0, 2).map((row, i) => (
                  <EvidenceQuote
                    key={`${row.evidenceId}-${i}`}
                    row={row}
                    compact
                  />
                ))}
              </div>
              {run.clarifications?.length > 0 && (
                <section className="result-replies">
                  <h3>
                    <MessageCircle size={18} />
                    The saved manual reply
                  </h3>
                  {run.clarifications.map((row) => (
                    <p key={row.clarificationId}>{row.note}</p>
                  ))}
                  <span>Manually recorded. Not independently verified.</span>
                </section>
              )}
              <Link
                className="button ink-button"
                to={
                  run.pendingFindings.length || data.clarifications.length
                    ? "/case/tasks"
                    : "/case/evidence"
                }
              >
                {run.pendingFindings.length
                  ? "Open the follow-up task"
                  : data.clarifications.length
                    ? "Review the saved reply"
                    : "Review the records"}
                <ArrowRight size={17} />
              </Link>
              <details className="technical-details">
                <summary>Full report & technical details</summary>
                <pre className="grounded-summary">{run.summary}</pre>
                <div className="run-metadata">
                  <span>
                    Model <code>{run.model}</code>
                  </span>
                  <span>{plural(run.modelRequests, "model request")}</span>
                  {duration && <span>{duration}s including data refresh</span>}
                </div>
              </details>
            </>
          ) : (
            <div className="investigation-intro">
              <div className="intro-art" aria-hidden="true">
                <PackageOpen size={65} />
                <Sparkles size={25} />
              </div>
              <span className="sticker">LESS GUESSWORK. MORE CONTEXT.</span>
              <h2>Two stories walk into a return.</h2>
              <p>
                This check reads the original records and earlier manual
                replies. If a question is still pending, it saves a follow-up
                task for you.
              </p>
              <div className="mini-flow">
                <span>
                  <FileText size={17} />
                  Read
                </span>
                <ArrowRight size={15} />
                <span>
                  <GitBranch size={17} />
                  Compare
                </span>
                <ArrowRight size={15} />
                <span>
                  <MessageCircle size={17} />
                  Follow up
                </span>
              </div>
              <SourceNote>
                No messages are sent. No refund decisions are made. You choose
                when to run the check.
              </SourceNote>
            </div>
          )}
        </section>
        <aside className="panel trace-panel">
          <div className="panel-title">
            <h2>What the check did.</h2>
            <span className="source-badge">
              {run ? plural(run.toolTrace.length, "step") : "NO RUN YET"}
            </span>
          </div>
          {run ? (
            <ol className="tool-trace">
              {run.toolTrace.map((step, index) => {
                const info = toolInfo[step.tool] || {
                  label: step.tool,
                  icon: ScanLine,
                  singular: "result",
                };
                const Icon = info.icon;
                return (
                  <li key={`${step.tool}-${index}`}>
                    <span className="trace-marker">
                      <Icon size={19} />
                    </span>
                    <div>
                      <strong>{info.label}</strong>
                      <small>
                        {plural(step.resultCount, info.singular, info.multiple)}
                      </small>
                      <details>
                        <summary>See sources & step details</summary>
                        <div className="reference-links">
                          {step.evidenceIds?.map((id) => (
                            <RecordLink key={id} id={id} />
                          ))}
                        </div>
                        <code>{step.tool}</code>
                        {step.actionIds?.length > 0 && (
                          <p>
                            {plural(step.actionIds.length, "linked task")} ·{" "}
                            <Link to="/case/tasks">View task →</Link>
                          </p>
                        )}
                      </details>
                    </div>
                    <Check size={17} className="trace-check" />
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="quiet-empty">
              <GitBranch size={38} />
              <p>No mystery progress bars here.</p>
              <small>
                These are actual completed steps, shown after a successful
                check.
              </small>
            </div>
          )}
          <div className="trace-note">
            <ShieldCheck size={17} />
            <span>
              Every result comes from the returned records and checks.
            </span>
          </div>
        </aside>
      </div>
      <section className="panel findings-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">THE ORIGINAL DISAGREEMENT</span>
            <h2>The history stays on the record.</h2>
          </div>
          <span>{plural(pending.length, "pending question")}</span>
        </div>
        {data.findings.map((finding) => {
          const isPending = pending.some(
            (row) => row.findingId === finding.findingId,
          );
          return (
            <article className="finding-row" key={finding.findingId}>
              <span className="finding-icon">
                <GitBranch size={23} />
              </span>
              <div>
                <h3>{finding.summary}</h3>
                <p>
                  {isPending
                    ? finding.questionToAsk
                    : "A manual reply resolved the linked task. Both original explanations remain in the records."}
                </p>
                <div className="reference-links">
                  {finding.evidence.map((row, i) => (
                    <RecordLink
                      key={`${row.evidenceId}-${i}`}
                      id={row.evidenceId}
                    />
                  ))}
                </div>
              </div>
              <span className={`finding-state ${isPending ? "" : "settled"}`}>
                {isPending ? "Needs a reply" : "Reply saved"}
              </span>
            </article>
          );
        })}
        {!data.findings.length && (
          <p className="muted">
            The current check found no pickup-reason disagreement.
          </p>
        )}
        <SourceNote>
          A manual reply is not independently verified. Resolving a task does
          not settle the whole case or establish refund eligibility.
        </SourceNote>
      </section>
      <div className="page-next">
        <span>The next question has a home. So does the reply.</span>
        <Link className="text-link" to="/case/tasks">
          Open tasks <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
