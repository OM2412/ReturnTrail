import { useState } from "react";
import { Link, useSearchParams } from "react-router";
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
  async function submit(event) {
    event.preventDefault();
    if (!note.trim()) {
      setError("Add the explanation before saving.");
      return;
    }
    setError("");
    if (await onSave(action.actionId, note)) setNote("");
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
          The first saved reply is preserved. Original records stay unchanged.
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
        disabled={!!working || !note.trim()}
      >
        {working === "clarify" ? (
          <Spinner label="Saving your reply…" />
        ) : (
          <>
            <MessageSquare size={18} />
            Save reply & resolve task
          </>
        )}
      </button>
      <p className="form-disclosure">
        This saves a reply and resolves the local task. It does not verify the
        explanation or close the whole case.
      </p>
    </form>
  );
}
export default function Tasks() {
  const { data, clarify, working } = useCase();
  const [params, setParams] = useSearchParams();
  const selected =
    data.actions.find((row) => row.actionId === params.get("task")) ||
    data.actions[0];
  const clarification = selected
    ? data.clarifications.find((row) => row.actionId === selected.actionId)
    : null;
  const finding = selected
    ? data.findings.find(
        (row) => `FOLLOWUP-${row.findingId}` === selected.actionId,
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
                  <strong>Clarify the pickup reason</strong>
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
            <div className="reference-links">
              {finding?.evidence.map((row, i) => (
                <RecordLink
                  key={`${row.evidenceId}-${i}`}
                  id={row.evidenceId}
                />
              ))}
            </div>
            <CopyReference value={selected.actionId} label="Task reference" />
            {clarification ? (
              <section className="saved-clarification">
                <div className="saved-heading">
                  <span className="chunky-icon">
                    <Check size={26} />
                  </span>
                  <div>
                    <span className="eyebrow">A LITTLE MORE CONTEXT</span>
                    <h3>Manual clarification recorded</h3>
                  </div>
                </div>
                <p className="clarification-note">{clarification.note}</p>
                <small>Saved {timestamp(clarification.recordedAt)}</small>
                <SourceNote>
                  The local task is {clarification.status}. This reply is
                  manually recorded and not independently verified. Both
                  original records stay intact.
                </SourceNote>
                <Link className="button ink-button" to="/case/investigation">
                  Check again with this reply <ArrowRight size={17} />
                </Link>
                <CopyReference
                  value={clarification.clarificationId}
                  label="Reply reference"
                />
              </section>
            ) : selected.status === "OPEN" ? (
              <ClarificationForm
                key={selected.actionId}
                action={selected}
                onSave={clarify}
                working={working}
              />
            ) : (
              <SourceNote>
                This task is {selected.status}. No reply record was returned.
                Refresh the case before taking another action.
              </SourceNote>
            )}
          </article>
        </div>
      )}
    </>
  );
}
