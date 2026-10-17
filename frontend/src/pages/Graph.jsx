import { useState } from "react";
import GraphProof from "../components/GraphProof";
import { useSearchParams } from "react-router";
import Link from "../components/CaseLink";
import { ArrowUpRight, FileText, GitBranch } from "lucide-react";
import { useCase } from "../app/CaseContext";
import { Empty, PageTitle, SourceNote } from "../components/UI";
import ParcelExperience from "../components/ParcelExperience";
import { claimLabel } from "../lib/domain";

export default function Graph() {
  const { data } = useCase();
  const [view, setView] = useState("proof");
  const [params, setParams] = useSearchParams();
  const selected =
    data.evidence.find((row) => row.evidenceId === params.get("doc")) ||
    data.evidence[0];
  return (
    <>
      <PageTitle
        label="CONNECT THE DOTS"
        title="Follow the links. Find the context."
        description="Choose a record, then inspect the relationships returned by the graph or replay its 3D story."
      />
      {!selected ? (
        <Empty icon={GitBranch} title="No source-linked relationships to show.">
          Refresh the case to check its evidence.
        </Empty>
      ) : (
        <div className="graph-layout">
          <div className="graph-stage graph-with-proof">
            <div
              className="graph-view-tabs"
              role="group"
              aria-label="Connection view"
            >
              <button
                aria-pressed={view === "proof"}
                onClick={() => setView("proof")}
              >
                Graph proof
              </button>
              <button
                aria-pressed={view === "story"}
                onClick={() => setView("story")}
              >
                3D story
              </button>
            </div>
            <div
              className="proof-record-picker"
              role="group"
              aria-label="Choose proof record"
            >
              {data.evidence.map((row) => (
                <button
                  key={row.evidenceId}
                  aria-pressed={selected.evidenceId === row.evidenceId}
                  onClick={() => setParams({ doc: row.evidenceId })}
                >
                  {row.evidenceId}
                </button>
              ))}
            </div>
            {view === "proof" ? (
              <GraphProof graph={data.graph} selected={selected} />
            ) : (
              <>
                <ParcelExperience
                  rows={data.evidence}
                  selected={selected.evidenceId}
                  onSelect={(id) => setParams({ doc: id })}
                />
              </>
            )}
          </div>
          <aside
            className={`panel graph-inspector claim-${selected.claimedStatus.toLowerCase()}`}
          >
            <span className="eyebrow">THE SELECTED STORY</span>
            <div className="inspector-top">
              <span className="chunky-icon">
                <FileText size={25} />
              </span>
              <span className="sticker">{selected.evidenceId}</span>
            </div>
            <h2>{claimLabel(selected.claimedStatus)}</h2>
            <blockquote>{selected.statement}</blockquote>
            <div className="inspector-explainer">
              <GitBranch size={18} />
              <p>
                Linked to <strong>{selected.pickupId}</strong>. A line means the
                record is about this pickup—not that its explanation is
                verified.
              </p>
            </div>
            <Link
              className="button secondary"
              to={`/case/evidence?doc=${encodeURIComponent(selected.evidenceId)}`}
            >
              Read the original record <ArrowUpRight size={17} />
            </Link>
            <details className="reference-detail">
              <summary>Record details</summary>
              <dl>
                <div>
                  <dt>Record ID</dt>
                  <dd>{selected.evidenceId}</dd>
                </div>
                <div>
                  <dt>Recorded status</dt>
                  <dd>
                    <code>{selected.claimedStatus}</code>
                  </dd>
                </div>
              </dl>
            </details>
          </aside>
        </div>
      )}
      <Link className="button secondary" to="/case/context">
        What changes if a source is set aside? <ArrowUpRight size={17} />
      </Link>
      <SourceNote>
        The proof view shows query-matched relationships; the 3D view
        illustrates the returned evidence and pickup links. The original records
        stay unchanged.
      </SourceNote>
    </>
  );
}
