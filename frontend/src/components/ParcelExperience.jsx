import { lazy, Suspense, useState } from "react";
import { FileText, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Spinner } from "./UI";
const ThreeScene = lazy(() => import("./ThreeScene"));
const phases = [
  "A return, still in its box.",
  "Two records. Coming right up.",
  "Same pickup. Connecting the dots.",
  "Connected. But the stories disagree.",
];

export default function ParcelExperience({
  rows,
  selected,
  onSelect,
  illustration = false,
}) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [replay, setReplay] = useState(0);
  const [phase, setPhase] = useState(0);
  return (
    <section
      className="parcel-experience"
      aria-label={
        illustration
          ? "Illustrative return story"
          : "Interactive evidence connections"
      }
    >
      <div className="experience-heading">
        <span>
          <Sparkles size={15} />
          {illustration ? "A LITTLE RETURN DRAMA" : "YOUR RECORDS, CONNECTED"}
        </span>
        <span className="scene-tag">
          {illustration ? "Illustration" : `${rows.length} records`}
        </span>
      </div>
      <div className="parcel-viewport">
        <Suspense
          fallback={
            <div className="scene-loading">
              <Spinner label="Unpacking the scene…" />
            </div>
          }
        >
          <ThreeScene
            rows={rows}
            selected={selected}
            onSelect={onSelect}
            playing={playing}
            replay={replay}
            onPhase={setPhase}
          />
        </Suspense>
        <span className="scene-sticker" aria-hidden="true">
          same parcel.
          <br />
          different plot.
        </span>
      </div>
      <div className="experience-status">
        <span className="scene-status-dot" />
        <p aria-live="polite">{reduced ? phases[3] : phases[phase]}</p>
        <div className="scene-controls">
          {!reduced && (
            <>
              <button
                className="icon-button"
                aria-label={
                  playing ? "Pause scene animation" : "Play scene animation"
                }
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                className="icon-button"
                aria-label="Replay unboxing animation"
                onClick={() => {
                  setPhase(0);
                  setReplay((n) => n + 1);
                  setPlaying(true);
                }}
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="scene-records">
        {rows.map((row, i) => (
          <button
            key={`${row.evidenceId}-${i}`}
            aria-pressed={row.evidenceId === selected}
            className={row.evidenceId === selected ? "selected" : ""}
            onClick={() => onSelect(row.evidenceId)}
          >
            <FileText size={15} />
            {row.evidenceId}
            <span>{i % 2 ? "Story B" : "Story A"}</span>
          </button>
        ))}
      </div>
      <p className="scene-caption">
        {reduced
          ? "Reduced motion: showing the complete scene."
          : "Drag to rotate. Tap a record to explore."}
        {!illustration && " Simplified view of evidence and pickup links."}
      </p>
    </section>
  );
}
