import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import Link from "../components/CaseLink";
import {
  ArrowRight,
  Check,
  MessageCircle,
  MessageSquare,
  SquareCheck,
} from "lucide-react";
import { useCase } from "../app/CaseContext";
import {
  CopyReference,
  Empty,
  PageTitle,
  RecordLink,
  SourceNote,
  Spinner,
  Status,
} from "../components/UI";
import { timestamp } from "../lib/domain";
function ClarificationForm({ action, onSave, working }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState("");
  const reply = useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (!note.trim()) {
      setError("Add the explanation before saving.");
      return;
    }
    if (!outcome) {
      setError("Choose whether you have an explanation or still need one.");
      return;
    }
    setError("");
    const fingerprint = `${note.trim()}|${outcome}`;
    if (reply.current?.fingerprint !== fingerprint)
      reply.current = { fingerprint, id: crypto.randomUUID() };
    if (await onSave(action.actionId, note, outcome, reply.current.id)) {
      setNote("");
      setOutcome("");
      reply.current = null;
    }
  }
  return (
    <form
      className="clarification-form"
      onSubmit={(event) => void submit(event)}
    >
      <div className="form-heading">
        <span className="chunky-icon">
          <MessageCircle size={24} />
        </span>
        <div>
          <label htmlFor="clarification-note">
            Add the explanation you received
          </label>
          <p>
            A manual note for this practice case. Keep any uncertainty in your
            reply.
          </p>
        </div>
      </div>
      <fieldset className="reply-outcomes" disabled={!!working}>
        <legend>What does this reply tell us?</legend>
        <label>
          <input
            type="radio"
            name="reply-outcome"
            value="STILL_UNKNOWN"
            checked={outcome === "STILL_UNKNOWN"}
            onChange={(e) => setOutcome(e.target.value)}
            required
          />
          <span>
            <strong>Still unknown</strong>
            <small>Save a note. Keep the question open.</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="reply-outcome"
            value="EXPLANATION_PROVIDED"
            checked={outcome === "EXPLANATION_PROVIDED"}
            onChange={(e) => setOutcome(e.target.value)}
            required
          />
          <span>
            <strong>An explanation was provided</strong>
            <small>Record the manual explanation and resolve this task.</small>
          </span>
        </label>
      </fieldset>
      <textarea
        id="clarification-note"
        aria-describedby="clarification-help"
        required
        maxLength={2000}
        rows={5}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="For example: A manual reply says the courier was unavailable. This has not been independently verified."
        disabled={!!working}
      />
      <div className="form-meta">
        <span id="clarification-help">
          Saved notes are preserved. Original records stay unchanged.
        </span>
        <span>{note.length} / 2000</span>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button
        className="button primary"
        type="submit"
        disabled={!!working || !note.trim() || !outcome}
      >
        {working === "clarify" ? (
          <Spinner label="Saving your reply…" />
        ) : (
          <>
            <MessageSquare size={18} />
            {outcome === "EXPLANATION_PROVIDED"
              ? "Save explanation & resolve task"
              : "Save note & keep open"}
          </>
        )}
      </button>
      <p className="form-disclosure">
        You choose whether this reply supplies an explanation. A manual reply is
        not independently verified and does not close the whole case.
      </p>
    </form>
  );
}
export default function Tasks() {
  const { data, clarify, working, needsRefresh } = useCase();
  const [params, setParams] = useSearchParams();
  const selected =
    data.actions.find((row) => row.actionId === params.get("task")) ||
    data.actions.find(
      (action) =>
        action.status === "OPEN" &&
        data.findings.some(
          (f) =>
            f.findingId === action.findingId &&
            f.evidenceRevision === action.evidenceRevision,
        ),
    ) ||
    data.actions[0];
  const replies = selected
    ? data.clarifications
        .filter((row) => row.actionId === selected.actionId)
        .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
    : [];
  const finding = selected
    ? data.findings.find(
        (row) =>
          row.findingId === selected.findingId &&
          row.evidenceRevision === selected.evidenceRevision,
      )
    : null;
  return (
    <>
      <PageTitle
        label="ONE QUESTION. KEEP THE REPLY CLOSE."
        title="Give the missing context a home."
        description="Review the follow-up, open its sources, and save the explanation you received."
      />
      {!selected ? (
        <Empty icon={SquareCheck} title="No follow-up task has been prepared.">
          <p>
            Run an investigation. If the records need an explanation, the check
            will prepare a task here.
          </p>
          <Link className="button primary" to="/case/investigation">
            Open investigation <ArrowRight size={17} />
          </Link>
        </Empty>
      ) : (
        <div className="task-layout">
          <aside className="task-list">
            <span className="eyebrow">
              YOUR FOLLOW-UPS / {data.actions.length}
            </span>
            {data.actions.map((action) => (
              <button
                className={`task-list-item ${action === selected ? "selected" : ""}`}
                key={action.actionId}
                onClick={() => setParams({ task: action.actionId })}
                aria-pressed={action === selected}
              >
                <SquareCheck size={23} />
                <span>
                  <strong>Clarify the missing context</strong>
                  <small>{timestamp(action.createdAt)}</small>
                  <Status value={action.status} />
                </span>
              </button>
            ))}
          </aside>
          <article className="panel task-detail">
            <div className="panel-title">
              <div>
                <span className="eyebrow">THE QUESTION ON THE TABLE</span>
                <h2>What happened with this pickup?</h2>
              </div>
              <Status value={selected.status} />
            </div>
            <h3 className="task-question">{selected.question}</h3>
            <div className="task-created">
              Question saved {timestamp(selected.createdAt)}
            </div>
            {!finding && (
              <SourceNote>
                This task belongs to an earlier source set. Its history stays
                here. Run a fresh investigation to prepare any current question.
              </SourceNote>
            )}
            <div className="reference-links">
              {(
                selected.evidenceIds ||
                finding?.evidence.map((row) => row.evidenceId) ||
                []
              ).map((id, i) => (
                <RecordLink key={`${id}-${i}`} id={id} />
              ))}
            </div>
            <CopyReference value={selected.actionId} label="Task reference" />
            {replies.map((clarification) => (
              <section
                key={clarification.clarificationId}
                className="saved-clarification"
              >
                <div className="saved-heading">
                  <span className="chunky-icon">
                    <Check size={26} />
                  </span>
                  <div>
                    <span className="eyebrow">A LITTLE MORE CONTEXT</span>
                    <h3>
                      {clarification.status === "RESOLVED"
                        ? "Manual explanation recorded"
                        : "Note saved. Question still open."}
                    </h3>
                  </div>
                </div>
                <p className="clarification-note">{clarification.note}</p>
                <small>Saved {timestamp(clarification.recordedAt)}</small>
                <SourceNote>
                  Task status when this reply was recorded:{" "}
                  {clarification.status}. This reply is manually recorded and
                  not independently verified. Both original records stay intact.
                </SourceNote>
                <Link className="button ink-button" to="/case/investigation">
                  Check again with this reply <ArrowRight size={17} />
                </Link>
                <CopyReference
                  value={clarification.clarificationId}
                  label="Reply reference"
                />
              </section>
            ))}
            {selected.status === "OPEN" && finding ? (
              <ClarificationForm
                key={selected.actionId}
                action={selected}
                onSave={clarify}
                working={working || (needsRefresh ? "refresh-required" : null)}
              />
            ) : (
              <SourceNote>
                This task is {selected.status}.
                {!replies.length && " No reply record was returned."}
                {!finding && " It belongs to an earlier source set."}
                {" Refresh the case before taking another action."}
              </SourceNote>
            )}
          </article>
        </div>
      )}
    </>
  );
}
