import { ArrowRight, GitBranch } from "lucide-react";
import { claimLabel } from "../lib/domain";
const positions = {
  Case: [440, 48],
  Order: [170, 155],
  Item: [170, 315],
  ReturnRequest: [650, 155],
  PickupAttempt: [650, 315],
  SupportStatement: [650, 475],
  EvidenceDocument: [170, 475],
};
const names = {
  Case: "This case",
  Order: "Order",
  Item: "Returned item",
  ReturnRequest: "Return request",
  PickupAttempt: "Pickup attempt",
  SupportStatement: "Recorded statement",
  EvidenceDocument: "Source document",
};
const relations = {
  HAS_ORDER: "has order",
  CONTAINS: "contains item",
  HAS_RETURN: "owns return",
  RETURNS: "returns item",
  ATTEMPTS: "attempts return",
  ABOUT: "describes pickup",
  RECORDED_IN: "recorded in",
};
const tones = {
  Case: "#d7fc70",
  Order: "#ffe0be",
  Item: "#ffe0be",
  ReturnRequest: "#c9b8ff",
  PickupAttempt: "#c9b8ff",
  SupportStatement: "#c5ecd9",
  EvidenceDocument: "#d7fc70",
};
function segment(source, target) {
  const [x, y] = source,
    [tx, ty] = target,
    dx = tx - x,
    dy = ty - y;
  const ratio = Math.min(
    94 / Math.max(Math.abs(dx), 0.01),
    30 / Math.max(Math.abs(dy), 0.01),
  );
  return {
    x1: x + dx * ratio,
    y1: y + dy * ratio,
    x2: tx - dx * ratio,
    y2: ty - dy * ratio,
  };
}
export default function GraphProof({ graph, selected }) {
  const paths =
    graph?.paths?.filter((path) => path.evidenceId === selected.evidenceId) ||
    [];
  const keys = new Set(paths.flatMap((path) => path.nodeKeys)),
    edgeKeys = new Set(paths.flatMap((path) => path.edgeKeys));
  const nodes = (graph?.nodes || []).filter((n) => keys.has(n.key)),
    edges = (graph?.edges || []).filter((e) => edgeKeys.has(e.key));
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const same = (graph?.evidence || []).filter(
    (row) => row.pickupId === selected.pickupId,
  );
  const other = (graph?.evidence || []).filter(
    (row) => row.pickupId !== selected.pickupId,
  );
  const different = new Set(same.map((row) => row.claimedStatus)).size > 1;
  if (!paths.length)
    return (
      <div className="empty">
        <h2>No query path was returned for this record.</h2>
        <p>Refresh the case to read its relationships.</p>
      </div>
    );
  return (
    <section className="proof-panel" aria-label="Graph query proof">
      <div className="proof-heading">
        <div>
          <span className="eyebrow">FOLLOW THE ACTUAL LINKS</span>
          <h2>Why this record belongs here.</h2>
        </div>
        <span className="sticker">
          {nodes.length} nodes · {edges.length} links
        </span>
      </div>
      <svg
        className="proof-canvas"
        viewBox="0 0 840 550"
        role="img"
        aria-labelledby="proof-title proof-description"
      >
        <title id="proof-title">
          Source-linked graph path for {selected.evidenceId}
        </title>
        <desc id="proof-description">
          Seven relationships matched in FalkorDB connect this source to its
          statement, pickup, return, item, order and case. Exact directions are
          listed below.
        </desc>
        <defs>
          <marker
            id="proof-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#c6b8d9" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const s = byKey.get(edge.source),
            t = byKey.get(edge.target);
          const from = positions[s?.label],
            to = positions[t?.label];
          if (!from || !to) return null;
          const line = segment(from, to),
            cx = (line.x1 + line.x2) / 2,
            cy = (line.y1 + line.y2) / 2;
          return (
            <g key={edge.key}>
              <line
                {...line}
                stroke="#c6b8d9"
                strokeWidth="2"
                markerEnd="url(#proof-arrow)"
              />
              <rect
                x={cx - 59}
                y={cy - 12}
                width="118"
                height="24"
                rx="8"
                fill="#2c2339"
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fill="#e7dff2"
                fontSize="12"
              >
                {relations[edge.type] || edge.type}
              </text>
            </g>
          );
        })}
        {nodes.map((node) => {
          const pos = positions[node.label];
          if (!pos) return null;
          return (
            <g
              key={node.key}
              transform={`translate(${pos[0] - 94},${pos[1] - 30})`}
            >
              <title>{node.id}</title>
              <rect
                width="188"
                height="60"
                rx="12"
                fill={tones[node.label]}
                stroke="#16121c"
                strokeWidth="2"
              />
              <text
                x="94"
                y="23"
                textAnchor="middle"
                fill="#463c50"
                fontSize="12"
              >
                {names[node.label]}
              </text>
              <text
                x="94"
                y="43"
                textAnchor="middle"
                fill="#21182b"
                fontSize="14"
                fontWeight="700"
              >
                {node.id.length > 22
                  ? `${node.id.slice(0, 10)}…${node.id.slice(-7)}`
                  : node.id}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="proof-insight">
        <GitBranch size={22} />
        <div>
          <strong>
            {selected.claimedStatus === "UNKNOWN"
              ? "The source gives no recorded reason."
              : different
                ? "Different recorded reasons. Same pickup."
                : same.length === 1
                  ? "One record for this attempt."
                  : "These records describe the same attempt."}
          </strong>
          <p>
            {same.map((r) => r.evidenceId).join(", ")}{" "}
            {same.length === 1 ? "is" : "are"} linked to {selected.pickupId}.{" "}
            {other.length
              ? `${other.map((r) => r.evidenceId).join(", ")} ${other.length === 1 ? "belongs" : "belong"} to a different attempt and ${other.length === 1 ? "is" : "are"} excluded from this pickup comparison.`
              : "The relationship establishes context; it does not verify the recorded explanation."}
          </p>
        </div>
      </div>
      <details className="proof-details">
        <summary>Inspect all matched relationships</summary>
        <ul>
          {edges.map((edge) => (
            <li key={edge.key}>
              <code>{byKey.get(edge.source)?.id}</code>
              <span>{edge.type}</span>
              <ArrowRight size={15} />
              <code>{byKey.get(edge.target)?.id}</code>
            </li>
          ))}
        </ul>
        <p>
          Returned by a fixed, parameterized FalkorDB query. This is the
          evidence path, not every node in the workspace.
        </p>
      </details>
      <div className="proof-mobile-record">
        <span>{selected.evidenceId}</span>
        <ArrowRight size={15} />
        <span>{selected.pickupId}</span>
        <small>{claimLabel(selected.claimedStatus)}</small>
      </div>
    </section>
  );
}
