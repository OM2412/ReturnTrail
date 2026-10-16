import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  FileText,
  LoaderCircle,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { claimLabel } from "../lib/domain";

export function Brand({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="ReturnTrail home">
      <span className="brand-symbol">
        <Package size={21} strokeWidth={1.7} />
      </span>
      {!compact && (
        <span>
          ReturnTrail<span className="accent">.</span>
        </span>
      )}
    </Link>
  );
}
export function Spinner({ label = "Loading" }) {
  return (
    <span className="loading-label">
      <LoaderCircle size={17} className="spin" />
      {label}
    </span>
  );
}
export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>;
}
export function PageTitle({ label, title, description, children }) {
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <header className="page-title">
      <div>
        <Eyebrow>{label}</Eyebrow>
        <h1 ref={heading} data-route-heading tabIndex={-1}>
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </header>
  );
}
export function Status({ value }) {
  return (
    <span className={`status status-${String(value).toLowerCase()}`}>
      <span />
      {String(value).replaceAll("_", " ")}
    </span>
  );
}
export function ErrorNotice({ error }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <CircleAlert size={18} />
      <div>
        <strong>{error.message || error}</strong>
        {error.retryAfter && (
          <p>
            Wait about {Math.ceil(Number(error.retryAfter) / 60) || 5} minutes
            before retrying.
          </p>
        )}
      </div>
    </div>
  );
}
export function Empty({ icon: Icon = FileText, title, children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
export function EvidenceQuote({ row, compact = false }) {
  return (
    <article
      className={`quote-card ${compact ? "quote-compact" : ""} claim-${row.claimedStatus.toLowerCase()}`}
    >
      <div className="quote-header">
        <RecordLink id={row.evidenceId} />
        <span>On the record</span>
      </div>
      <span className="quote-mark" aria-hidden="true">
        “
      </span>
      <blockquote>{row.statement}</blockquote>
      <div className="quote-footer">
        <code>{row.pickupId}</code>
        <span>{claimLabel(row.claimedStatus)}</span>
      </div>
    </article>
  );
}
export function RecordLink({ id }) {
  return (
    <Link
      className="record-chip"
      to={`/case/evidence?doc=${encodeURIComponent(id)}`}
    >
      <FileText size={13} />
      {id}
      <ArrowUpRight size={12} />
    </Link>
  );
}
export function CopyReference({ value, label = "Reference ID" }) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied");
    } catch {
      setMessage("Select the ID below to copy it manually.");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 3500);
  }
  return (
    <details className="reference-detail">
      <summary>{label}</summary>
      <div>
        <code>{value}</code>
        <button
          className="icon-button"
          aria-label={`Copy ${label}`}
          onClick={() => void copy()}
        >
          {message === "Copied" ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <span role="status">{message}</span>
    </details>
  );
}
export function SourceNote({ children }) {
  return (
    <div className="source-note">
      <ShieldCheck size={16} />
      <p>{children}</p>
    </div>
  );
}
export function FeatureLink({ to, icon: Icon, label, detail, number }) {
  return (
    <Link className="feature-link" to={to}>
      <span className="feature-icon">
        <Icon size={21} />
      </span>
      <span className="feature-description">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="feature-count">
        {number ?? <ArrowUpRight size={18} />}
      </span>
    </Link>
  );
}
