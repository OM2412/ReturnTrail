import { useState } from "react";
import { useSearchParams } from "react-router";
import Link from "../components/CaseLink";
import {
  ArrowRight,
  Columns2,
  FileText,
  GitBranch,
  Search,
} from "lucide-react";
import { useCase } from "../app/CaseContext";
import { Empty, EvidenceQuote, PageTitle, SourceNote } from "../components/UI";
import { claimLabel, plural } from "../lib/domain";
export default function Evidence() {
  const { data } = useCase();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [compare, setCompare] = useState(false);
  const rows = data.evidence;
  const filtered = rows.filter((row) =>
    `${row.evidenceId} ${row.statement} ${row.pickupId} ${row.claimedStatus} ${claimLabel(row.claimedStatus)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const selected =
    rows.find((row) => row.evidenceId === params.get("doc")) || rows[0];
  const related = selected
    ? rows.filter((row) => row.pickupId === selected.pickupId)
    : [];
  return (
    <>
      <PageTitle
        label="STRAIGHT FROM THE RECORDS"
        title="Original words. The whole paper trail."
        description="Read each statement exactly as it was recorded. Compare the accounts without guessing who is right."
      >
        <Link className="button primary" to="/case/inbox">
          Add a synthetic source <ArrowRight size={17} />
        </Link>
        <Link className="button secondary" to="/case/graph">
          <GitBranch size={17} />
          View connections
        </Link>
      </PageTitle>
      {!rows.length ? (
        <Empty title="No evidence records were returned.">
          Refresh the case to check for source records.
        </Empty>
      ) : (
        <>
          <div className="evidence-browser">
            <aside className="record-list">
              <div className="record-list-title">
                <strong>The paper trail</strong>
                <span className="sticker">{rows.length}</span>
              </div>
              <label className="search-box">
                <Search size={17} />
                <input
                  aria-label="Search evidence"
                  placeholder="Find a record…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="record-items">
                {filtered.map((row, i) => (
                  <button
                    key={`${row.evidenceId}-${i}`}
                    className={`record-item claim-${row.claimedStatus.toLowerCase()} ${row === selected ? "selected" : ""}`}
                    onClick={() => setParams({ doc: row.evidenceId })}
                    aria-pressed={row === selected}
                  >
                    <span className="record-file">
                      <FileText size={23} />
                    </span>
                    <span>
                      <strong>{row.evidenceId}</strong>
                      <small>{claimLabel(row.claimedStatus)}</small>
                      <code>{row.pickupId}</code>
                    </span>
                    <span className="record-dot" />
                  </button>
                ))}
                {!filtered.length && (
                  <p className="search-empty">
                    No matching records. Try “courier” or a document ID.
                  </p>
                )}
              </div>
              <div className="record-list-foot">
                <span aria-hidden="true">✳</span>Original words.
                <br />
                No creative editing.
              </div>
            </aside>
            <article
              className={`document-reader claim-${selected.claimedStatus.toLowerCase()}`}
            >
              <div className="reader-toolbar">
                <span>
                  <FileText size={18} />
                  {selected.evidenceId}
                </span>
                <button
                  className="button small secondary"
                  onClick={() => setCompare((value) => !value)}
                  aria-pressed={compare}
                >
                  <Columns2 size={16} />
                  {compare ? "Back to one record" : "Compare pickup claims"}
                </button>
              </div>
              {compare ? (
                <div className="inline-comparison">
                  <span className="sticker">
                    SIDE BY SIDE / {selected.pickupId}
                  </span>
                  <h2>Compare the records for this attempt.</h2>
                  <p>{plural(related.length, "record")} about this pickup.</p>
                  <div className="quote-grid">
                    {related.map((row, i) => (
                      <EvidenceQuote key={`${row.evidenceId}-${i}`} row={row} />
                    ))}
                  </div>
                  <SourceNote>
                    This comparison includes records about the selected pickup
                    only. It does not independently verify their explanations.
                  </SourceNote>
                </div>
              ) : (
                <div className="document-sheet">
                  <div className="document-paper-top">
                    <span className="sticker">ORIGINAL WORDS</span>
                    <span className="document-number" aria-hidden="true">
                      0{rows.indexOf(selected) + 1}
                    </span>
                  </div>
                  <span className="eyebrow">SUPPORTING QUOTE</span>
                  <blockquote>{selected.statement}</blockquote>
                  {selected.originalText &&
                    selected.originalText !== selected.statement && (
                      <details className="source-original">
                        <summary>Read the complete original text</summary>
                        <p>{selected.originalText}</p>
                      </details>
                    )}
                  <p className="source-metadata">
                    {selected.sourceLabel || selected.evidenceId} ·{" "}
                    {selected.origin === "MANUAL_SYNTHETIC_EVIDENCE"
                      ? `Added manually at version ${selected.addedVersion}`
                      : "Seeded practice source"}
                  </p>
                  <span className="claim-pill">
                    {claimLabel(selected.claimedStatus)}
                  </span>
                  <div className="document-rule" />
                  <div className="document-connection">
                    <GitBranch size={22} />
                    <div>
                      <span>About this pickup</span>
                      <strong>{selected.pickupId}</strong>
                    </div>
                    <Link
                      className="round-link"
                      to={`/case/graph?doc=${encodeURIComponent(selected.evidenceId)}`}
                      aria-label="View this record’s connections"
                    >
                      <ArrowRight size={19} />
                    </Link>
                  </div>
                  <SourceNote>
                    This is what the record says. The explanation has not been
                    independently verified.
                  </SourceNote>
                  <details className="reference-detail">
                    <summary>Original record details</summary>
                    <dl>
                      <div>
                        <dt>Document</dt>
                        <dd>
                          <code>{selected.evidenceId}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>Recorded status</dt>
                        <dd>
                          <code>{selected.claimedStatus}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>Case</dt>
                        <dd>
                          <code>{selected.caseId}</code>
                        </dd>
                      </div>
                    </dl>
                  </details>
                </div>
              )}
            </article>
          </div>
          <div className="page-next">
            <span>Different explanations deserve a clearer next question.</span>
            <Link className="text-link" to="/case/investigation">
              Open investigation <ArrowRight size={17} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}
