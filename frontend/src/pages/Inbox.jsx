import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FilePlus2,
  Inbox as InboxIcon,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "../components/CaseLink";
import { useCase } from "../app/CaseContext";
import { PageTitle, SourceNote, Spinner } from "../components/UI";
import { claimLabel } from "../lib/domain";
function Original({ text, quote }) {
  const at = text.indexOf(quote);
  return (
    <p className="inbox-original">
      {text.slice(0, at)}
      <mark>{quote}</mark>
      {text.slice(at + quote.length)}
    </p>
  );
}
export default function Inbox() {
  const { data, working, ingest, lastImport, needsRefresh, refresh } =
    useCase();
  const pickups = [...new Set(data.evidence.map((row) => row.pickupId))];
  const [draft, setDraft] = useState({
    pickupId: pickups[0] || "",
    sourceLabel: "",
    sourceType: "SUPPORT_REPLY",
    originalText: "",
    quote: "",
    claimedStatus: "",
    synthetic: false,
  });
  const [preview, setPreview] = useState(null),
    [error, setError] = useState("");
  const receiptKey = useRef(null);
  const busy = !!working,
    full = data.evidence.length >= 30;
  const saved =
    preview && lastImport?.requestId === preview.requestId ? lastImport : null;
  const stale = preview && preview.expectedVersion !== data.evidenceVersion;
  function change(event) {
    const { name, type, checked, value } = event.target;
    setDraft((old) => ({
      ...old,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  }
  function review(event) {
    event.preventDefault();
    if (!draft.originalText.includes(draft.quote) || !draft.quote.trim()) {
      setError("Copy a supporting quote exactly from your original text.");
      return;
    }
    if (!draft.synthetic) {
      setError("Confirm that this practice record is fictional.");
      return;
    }
    const fingerprint = JSON.stringify({
      ...draft,
      expectedVersion: data.evidenceVersion,
    });
    if (receiptKey.current?.fingerprint !== fingerprint)
      receiptKey.current = { fingerprint, id: crypto.randomUUID() };
    setPreview({
      ...draft,
      expectedVersion: data.evidenceVersion,
      requestId: receiptKey.current.id,
    });
    setError("");
  }
  function another() {
    setPreview(null);
    setDraft({
      ...draft,
      sourceLabel: "",
      originalText: "",
      quote: "",
      claimedStatus: "",
      synthetic: false,
    });
    receiptKey.current = null;
  }
  function example() {
    const text =
      "Fictional support reply: the courier was unavailable for this pickup. Please arrange another attempt.";
    setDraft({
      ...draft,
      sourceLabel: "Fictional support reply",
      originalText: text,
      quote: "the courier was unavailable for this pickup",
      claimedStatus: "COURIER_UNAVAILABLE",
      synthetic: false,
    });
  }
  return (
    <>
      <PageTitle
        label="THE EVIDENCE INBOX / KEEP THE ORIGINAL"
        title="New receipt. New context."
        description="Add a short fictional record to an existing pickup. Keep its original words, choose the recorded claim, and review the link before saving."
      >
        <Link className="button secondary" to="/case/evidence">
          <ArrowLeft size={17} />
          Back to the records
        </Link>
      </PageTitle>
      <div className="inbox-progress" aria-label="Record import steps">
        {["Keep the source", "Review the link", "Save the context"].map(
          (label, i) => (
            <span
              className={i === (saved ? 2 : preview ? 1 : 0) ? "active" : ""}
              key={label}
            >
              <b>{saved && i === 2 ? <Check size={16} /> : i + 1}</b>
              {label}
            </span>
          ),
        )}
      </div>
      {saved ? (
        <section className="panel inbox-success" role="status">
          <span className="chunky-icon">
            <Check size={30} />
          </span>
          <span className="sticker">ON THE RECORD.</span>
          <h2>
            {saved.created
              ? "A source joined the paper trail."
              : "This source was already saved."}
          </h2>
          <p>
            Added at evidence version {saved.addedVersion}. Original records and
            earlier replies stay intact.
          </p>
          <div className="button-row">
            <Link
              className="button ink-button"
              to={`/case/evidence?doc=${encodeURIComponent(saved.evidenceId)}`}
            >
              Read the saved source <ArrowRight size={17} />
            </Link>
            <Link className="button secondary" to="/case/investigation">
              Review the next question
            </Link>
            <button
              className="button secondary"
              disabled={busy || needsRefresh}
              onClick={another}
            >
              Add another source
            </button>
          </div>
          {needsRefresh && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh the saved case <RefreshCw size={16} />
            </button>
          )}
          <SourceNote>
            Saving a claim does not verify it. A previous reply covers its
            reviewed source set, not every record added later.
          </SourceNote>
        </section>
      ) : preview ? (
        <div className="inbox-layout">
          <section className="panel inbox-review">
            <span className="sticker">ONE LAST LOOK</span>
            <h2>{preview.sourceLabel}</h2>
            <p className="inbox-review-meta">
              {preview.pickupId} · {claimLabel(preview.claimedStatus)}
            </p>
            <Original text={preview.originalText} quote={preview.quote} />
            <SourceNote>
              The highlighted words occur exactly in the original text. You
              selected the claim and pickup; this is not an AI extraction or
              independent verification.
            </SourceNote>
            {stale && (
              <p className="notice notice-error" role="alert">
                The case has changed. Go back and review the latest context
                before saving.
              </p>
            )}
            <div className="button-row">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                <ArrowLeft size={16} />
                Edit this record
              </button>
              <button
                className="button primary"
                disabled={busy || stale || needsRefresh}
                onClick={() => void ingest(preview)}
              >
                {working === "ingest" ? (
                  <Spinner label="Saving the source…" />
                ) : (
                  <>
                    Save source & update context <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </section>
          <aside className="panel inbox-context">
            <span className="chunky-icon">
              <ShieldCheck size={25} />
            </span>
            <h2>What will change?</h2>
            <ul>
              <li>
                One immutable source and its exact quote join this pickup.
              </li>
              <li>
                The case moves from version {preview.expectedVersion} to{" "}
                {preview.expectedVersion + 1}.
              </li>
              <li>
                Earlier explanations are checked against their original source
                set.
              </li>
              <li>No follow-up, message or refund is automatically sent.</li>
            </ul>
            <p className="inbox-counter">
              {data.evidence.length} / 30 sources currently saved
            </p>
          </aside>
        </div>
      ) : (
        <div className="inbox-layout">
          <form className="panel inbox-form" onSubmit={review}>
            <div className="panel-title">
              <h2>Keep the words. Add the context.</h2>
              <button
                type="button"
                className="button small secondary"
                disabled={busy || full}
                onClick={example}
              >
                Load fictional example
              </button>
            </div>
            <fieldset disabled={busy || full || needsRefresh}>
              <div className="inbox-field-grid">
                <label>
                  Source label
                  <input
                    name="sourceLabel"
                    value={draft.sourceLabel}
                    onChange={change}
                    maxLength={80}
                    required
                    placeholder="For example: Support reply, attempt A"
                  />
                </label>
                <label>
                  Source type
                  <select
                    name="sourceType"
                    value={draft.sourceType}
                    onChange={change}
                  >
                    <option value="SUPPORT_REPLY">Support reply</option>
                    <option value="COURIER_STATUS">Courier status</option>
                    <option value="CUSTOMER_NOTE">Customer note</option>
                    <option value="DEMO_NOTE">Demo note</option>
                  </select>
                </label>
              </div>
              <label>
                Original fictional text
                <textarea
                  name="originalText"
                  value={draft.originalText}
                  onChange={change}
                  maxLength={4000}
                  required
                  rows={6}
                  placeholder="Paste a fictional record. Its original text will be preserved."
                />
                <small>{draft.originalText.length} / 4000 characters</small>
              </label>
              <label>
                Exact supporting quote
                <textarea
                  name="quote"
                  value={draft.quote}
                  onChange={change}
                  maxLength={500}
                  required
                  rows={3}
                  placeholder="Copy the words that support the recorded claim."
                />
                <small>
                  Use the exact spelling, spaces and punctuation from the
                  original.
                </small>
              </label>
              <div className="inbox-field-grid">
                <label>
                  About which pickup?
                  <select
                    name="pickupId"
                    value={draft.pickupId}
                    onChange={change}
                    required
                  >
                    {pickups.map((id) => (
                      <option key={id}>{id}</option>
                    ))}
                  </select>
                </label>
                <label>
                  What does the record claim?
                  <select
                    name="claimedStatus"
                    value={draft.claimedStatus}
                    onChange={change}
                    required
                  >
                    <option value="">Choose the recorded claim</option>
                    <option value="CUSTOMER_CANCELLED">
                      Customer cancelled
                    </option>
                    <option value="COURIER_UNAVAILABLE">
                      Courier unavailable
                    </option>
                    <option value="UNKNOWN">Reason not recorded</option>
                  </select>
                </label>
              </div>
              <label className="synthetic-check">
                <input
                  type="checkbox"
                  name="synthetic"
                  checked={draft.synthetic}
                  onChange={change}
                  required
                />
                <span>
                  This record is fictional. It contains no private receipts,
                  personal messages or payment details.
                </span>
              </label>
              <button className="button primary" type="submit">
                <FilePlus2 size={18} />
                Review source & link <ArrowRight size={17} />
              </button>
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <aside className="panel inbox-context">
            <span className="chunky-icon">
              <InboxIcon size={26} />
            </span>
            <h2>Receipts, with receipts.</h2>
            <p>
              Keep one source per entry. Link it to the attempt it actually
              describes.
            </p>
            <ul>
              <li>Original text stays unchanged.</li>
              <li>Only exact quotes can be saved.</li>
              <li>Your recorded claim is a manual label.</li>
              <li>Identical retries reuse the saved record.</li>
            </ul>
            <span className="inbox-counter">
              {data.evidence.length} / 30 sources
            </span>
            {full && (
              <p role="status">
                This practice case has reached its record limit.
              </p>
            )}
            <SourceNote>
              Text import only. PDF/OCR and AI extraction are not part of this
              step.
            </SourceNote>
          </aside>
        </div>
      )}
    </>
  );
}
