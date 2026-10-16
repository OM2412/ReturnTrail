import { Link, useSearchParams } from "react-router";
import { ArrowUpRight, FileText, GitBranch } from "lucide-react";
import { useCase } from "../app/CaseContext";
import { Empty, PageTitle, SourceNote } from "../components/UI";
import ParcelExperience from "../components/ParcelExperience";
import { claimLabel } from "../lib/domain";

export default function Graph() {
  const { data } = useCase();
  const [params, setParams] = useSearchParams();
  const selected =
    data.evidence.find((row) => row.evidenceId === params.get("doc")) ||
    data.evidence[0];
  return (
    <>
      <PageTitle
        label="CONNECT THE DOTS"
        title="Same pickup. Different stories."
        description="Watch the records leave the box. Pick one to see what it says and which pickup it belongs to."
      />
      {!selected ? (
        <Empty icon={GitBranch} title="No source-linked relationships to show.">
          Refresh the case to check its evidence.
        </Empty>
      ) : (
        <div className="graph-layout">
          <div className="graph-stage">
            <ParcelExperience
              rows={data.evidence}
              selected={selected.evidenceId}
              onSelect={(id) => setParams({ doc: id })}
            />
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
              to={`/case?doc=${encodeURIComponent(selected.evidenceId)}`}
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
      <SourceNote>
        This is a simplified map of the returned evidence and pickup links. The
        original records stay unchanged.
      </SourceNote>
    </>
  );
}
