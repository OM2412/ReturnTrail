import { useEffect, useState } from "react";
import { FlaskConical, ArrowRight, RefreshCw, History, ShieldCheck } from "lucide-react";
import { useCase } from "../app/CaseContext";
import Link from "../components/CaseLink";
import GraphProof from "../components/GraphProof";
import { api } from "../lib/api";
import { PageTitle, SourceNote, Spinner, ErrorNotice } from "../components/UI";
import { timestamp } from "../lib/domain";
import "../styles/context.css";

const labels = {
  NO_SOURCE_EVIDENCE: "No source evidence in this preview",
  SUPPORTED_DISAGREEMENT: "The recorded explanations disagree",
  MISSING_CONTEXT: "A recorded reason is missing",
  NO_SUPPORTED_FINDING: "No finding under the supported rules",
};
export default function ContextLab() {
  const { data } = useCase();
  const [selection, setSelection] = useState(null);
  const exclude = selection?.caseId === data.caseId ? selection.exclude : "";
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${data.caseId}:${data.evidenceVersion}:${data.workflowVersion}:${exclude}:${attempt}`;
  const value = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : null;
  useEffect(() => {
    let cancelled = false;
    api.context(data.caseId, exclude).then((response) => {
      if (response.caseId !== data.caseId || !response.preview?.graph || !Array.isArray(response.memories))
        throw new Error("The context response was incomplete. Please refresh.");
      if (!cancelled) setResult({ key, data: response });
    }).catch((e) => { if (!cancelled) setResult({ key, error: { message: e.message } }); });
    return () => { cancelled = true; };
  }, [data.caseId, exclude, key]);
  const preview = value?.preview;
  const previewRecord = preview?.graph.evidence[0];
  return <>
    <PageTitle label="THE CONTEXT LAB / READ ONLY" title="Same records. A different question."
      description="See what an earlier reply covered, then explore how one source changes the supported check. Your original records stay put.">
      <button className="button secondary" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={16} />Refresh context</button>
    </PageTitle>
    <section className="context-lab-intro panel"><FlaskConical size={28} /><div><h2>A thought experiment, with receipts.</h2>
      <p>Set aside one source in a temporary graph query. Compare the rule result and follow its returned links. This never deletes evidence, changes a task, verifies a claim or calls an AI model.</p></div></section>
    <section className="context-experiment panel">
      <label htmlFor="context-exclusion">Which source should this preview set aside?</label>
      <select id="context-exclusion" value={exclude} onChange={(e) => setSelection({ caseId: data.caseId, exclude: e.target.value })}>
        <option value="">Keep every source</option>
        {data.evidence.map((e) => <option key={e.evidenceId} value={e.evidenceId}>{e.sourceLabel || e.evidenceId} · {e.evidenceId}</option>)}
      </select>
      <ErrorNotice error={error} />
      {!value && !error && <Spinner label="Reading the connected context…" />}
      {value && <>
        <div className="context-comparison" aria-live="polite">
          <article><span className="eyebrow">ALL SAVED SOURCES</span><h2>{labels[value.current.state]}</h2>
            <p>{value.current.sourceCount} source(s) · {value.current.findingCount} rule finding(s)</p></article>
          <ArrowRight size={25} aria-hidden="true" />
          <article className="context-preview"><span className="sticker">{exclude ? "TEMPORARY PREVIEW" : "NO SOURCE SET ASIDE"}</span>
            <h2>{labels[preview.assessment.state]}</h2><p>{preview.assessment.sourceCount} source(s) · {preview.assessment.findingCount} rule finding(s)</p>
            <strong>{exclude ? preview.ruleOutcomeChanged ? "The supported rule outcome changes." : "The supported rule outcome stays the same." : "Choose a source to compare."}</strong></article>
        </div>
        <p className="context-caution"><ShieldCheck size={18} />{value.limitation} No finding does not mean the case is resolved.</p>
        <details className="context-proof"><summary>Inspect the graph paths returned for this preview</summary>
          {previewRecord ? <GraphProof graph={preview.graph} selected={previewRecord} /> : <p>No source path remains in this preview.</p>}
        </details>
      </>}
    </section>
    {value && <section className="context-memory"><div className="panel-title"><h2><History size={22} /> What did the saved context cover?</h2></div>
      <p className="muted">These cards follow the saved task’s source links. They describe the current saved case, not the temporary preview above.</p>
      {!value.memories.length ? <div className="panel"><h3>No task memory yet.</h3><p>Prepare a follow-up to attach a reviewed source set to its question.</p><Link className="text-link" to="/case/investigation">Open investigation <ArrowRight size={16} /></Link></div> :
        <div className="context-memory-grid">{value.memories.map((m) => <article className={`panel context-memory-card ${m.coversCurrentSourceSet ? "context-covered" : "context-changed-card"}`} key={m.actionId}>
          <span className="sticker">{m.coversCurrentSourceSet ? "SAME SOURCE SET" : "CONTEXT HAS CHANGED"}</span>
          <h3>{m.coversCurrentSourceSet ? "The task covers these sources." : "Earlier context needs a fresh look."}</h3>
          <p>{m.pickupId} · Task {m.taskStatus.toLowerCase()} · {m.noteCount} manual note(s)</p>
          <dl><div><dt>Reviewed sources</dt><dd>{m.reviewedEvidenceIds.join(", ") || "No linked sources"}</dd></div>
            <div><dt>Added since that review</dt><dd>{m.addedSinceReview.join(", ") || "None"}</dd></div>
            {m.noLongerPresent.length > 0 && <div><dt>No longer in the current path</dt><dd>{m.noLongerPresent.join(", ")}</dd></div>}
            <div><dt>Latest manual note</dt><dd>{m.latestNoteAt ? timestamp(m.latestNoteAt) : "No note recorded"}</dd></div></dl>
          <p className="context-caution">Matching sources do not verify a reply. A resolved task is not a verified case outcome.</p>
          <details><summary>Task reference</summary><code>{m.actionId}</code></details>
        </article>)}</div>}
    </section>}
    <SourceNote>Fixed parameterized FalkorDB queries return the source paths. The supported rules assess the returned claims; no claim is independently verified.</SourceNote>
  </>;
}
