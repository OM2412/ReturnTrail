import { useEffect, useState } from "react";
import { Download, FileText, Printer, RefreshCw, Copy } from "lucide-react";
import { supportDraft } from "../lib/supportDraft";
import "../styles/context.css";
import { useCase } from "../app/CaseContext";
import { api } from "../lib/api";
import {
  PageTitle,
  SourceNote,
  Status,
  Spinner,
  ErrorNotice,
} from "../components/UI";
import { timestamp, claimLabel } from "../lib/domain";
export default function Brief() {
  const { data } = useCase();
  const [brief, setBrief] = useState(null),
    [error, setError] = useState(null),
    [attempt, setAttempt] = useState(0),
    [copyStatus, setCopyStatus] = useState("");
  const loadKey = `${data.caseId}:${data.evidenceVersion}:${data.workflowVersion}:${attempt}`;
  const report = brief?.loadKey === loadKey ? brief.value : null;
  useEffect(() => {
    let cancelled = false;
    api
      .brief(data.caseId)
      .then((value) => {
        if (!cancelled) {
          setBrief({ value, loadKey });
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError({ message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [data.caseId, loadKey]);
  function retry() {
    setBrief(null);
    setError(null);
    setAttempt((n) => n + 1);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ReturnTrail-${report.snapshot.caseId}-v${report.snapshot.evidenceVersion}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const snap = report?.snapshot;
  return (
    <>
      <div className="brief-controls">
        <PageTitle
          label="YOUR CASE, READY TO HAND OVER"
          title="Take the paper trail with you."
          description="A source-linked brief from a fresh case read. Download the structured record or print the report you see here."
        >
          <button
            className="button primary"
            disabled={!snap || !!error}
            onClick={download}
          >
            <Download size={17} />
            Download JSON
          </button>
          <button
            className="button secondary"
            disabled={!snap || !!error}
            onClick={() => window.print()}
          >
            <Printer size={17} />
            Print / Save PDF
          </button>
          <button
            className="icon-button"
            aria-label="Refresh case brief"
            onClick={retry}
          >
            <RefreshCw size={17} />
          </button>
        </PageTitle>
        <ErrorNotice error={error} />
        {!snap && !error && <Spinner label="Preparing a fresh case brief…" />}
      </div>
      {snap && !error && <details className="panel support-draft">
        <summary>Prepare a support message</summary>
        <span className="sticker">READY TO REVIEW / NOTHING SENT</span>
        <h2>A clearer support conversation.</h2>
        <p>A fictional source-linked message draft, prepared from this fresh brief. Read it before copying; sending is always your choice.</p>
        <label htmlFor="support-message">Support message draft</label>
        <textarea id="support-message" readOnly value={supportDraft(snap)} />
        <button className="button secondary" onClick={async () => {
          try { await navigator.clipboard.writeText(supportDraft(snap)); setCopyStatus("Draft copied. No message was sent."); }
          catch { setCopyStatus("Copy is unavailable here. Select the draft text above to copy it manually."); }
        }}><Copy size={16} />Copy reviewed draft</button>
        {copyStatus && <p role="status">{copyStatus}</p>}
      </details>}
      {snap && (
        <article className="case-brief">
          <header className="brief-header">
            <span className="sticker">RETURNTRAIL / CASE BRIEF</span>
            <h2>{snap.caseInfo.title}</h2>
            <p>
              {snap.caseId} · Evidence version {snap.evidenceVersion} · Workflow
              version {snap.workflowVersion}
            </p>
            <small>
              Captured {timestamp(report.generatedAt)} · Synthetic practice case
            </small>
          </header>
          <div className="brief-stats">
            <span>
              <b>{snap.evidence.length}</b>source records
            </span>
            <span>
              <b>{snap.pendingFindings.length}</b>pending questions
            </span>
            <span>
              <b>{snap.actions.length}</b>saved tasks
            </span>
          </div>
          <SourceNote>{report.verification}</SourceNote>
          <section>
            <h3>
              <FileText size={20} />
              Original source records
            </h3>
            {snap.evidence.map((row) => (
              <article className="brief-source" key={row.evidenceId}>
                <div>
                  <strong>{row.sourceLabel || row.evidenceId}</strong>
                  <code>{row.evidenceId}</code>
                </div>
                <p>
                  {row.pickupId} · Recorded claim:{" "}
                  {claimLabel(row.claimedStatus)}
                </p>
                <blockquote>{row.statement}</blockquote>
                {row.originalText !== row.statement && (
                  <div className="brief-original">
                    <strong>Complete original text</strong>
                    <p className="inbox-original">{row.originalText}</p>
                  </div>
                )}
                <small>
                  {row.origin === "MANUAL_SYNTHETIC_EVIDENCE"
                    ? `Manually added at version ${row.addedVersion}, ${timestamp(row.recordedAt)}`
                    : "Prewritten synthetic source"}
                </small>
              </article>
            ))}
          </section>
          <section>
            <h3>Questions that still need context</h3>
            {snap.pendingFindings.length ? (
              snap.pendingFindings.map((f) => (
                <div className="brief-question" key={f.findingId}>
                  <strong>{f.questionToAsk}</strong>
                  <p>
                    Sources: {f.evidence.map((e) => e.evidenceId).join(", ")}
                  </p>
                  <code>Reviewed source set: {f.evidenceRevision}</code>
                </div>
              ))
            ) : (
              <p>
                No pending follow-up under the supported check. This does not
                establish whole-case resolution.
              </p>
            )}
          </section>
          <section>
            <h3>Saved tasks and manual notes</h3>
            {!snap.actions.length && <p>No local tasks saved.</p>}
            {snap.actions.map((action) => (
              <div className="brief-task" key={action.actionId}>
                <Status value={action.status} />
                <h4>{action.question}</h4>
                <code>{action.actionId}</code>
                <p>Created {timestamp(action.createdAt)}</p>
                {snap.clarifications
                  .filter((n) => n.actionId === action.actionId)
                  .map((note) => (
                    <blockquote key={note.clarificationId}>
                      <p>{note.note}</p>
                      <small>
                        Manually recorded {timestamp(note.recordedAt)} · Task{" "}
                        {note.status} when recorded · Not independently verified
                      </small>
                    </blockquote>
                  ))}
              </div>
            ))}
          </section>
          <footer>
            This report preserves recorded claims and manual replies. It is not
            a verified explanation, refund approval or complete audit of every
            read/model request. Export schema: {report.schemaVersion}.
          </footer>
        </article>
      )}
    </>
  );
}
