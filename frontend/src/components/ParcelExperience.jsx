import { lazy, Suspense, useState, useMemo, useEffect, useRef } from "react";
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
  const element = useRef(null);
  const [near, setNear] = useState(false);
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setEntered(true);
      },
      { rootMargin: "150px" },
    );
    observer.observe(element.current);
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const sceneRows = useMemo(() => {
    if (rows.length <= 6) return rows;
    const first = rows.slice(0, 6);
    const chosen = rows.find((row) => row.evidenceId === selected);
    return chosen && !first.includes(chosen)
      ? [...first.slice(0, 5), chosen]
      : first;
  }, [rows, selected]);
  const animate = playing && near && visible && phase < 3 && !reduced;
  const labels = illustration
    ? phases
    : [
        "The records, ready to unpack.",
        `${sceneRows.length} records. Coming right up.`,
        new Set(sceneRows.map((row) => row.pickupId)).size > 1
          ? "Separate attempts. Follow their links."
          : "One pickup. Follow the links.",
        "Connections shown. Inspect the recorded claims.",
      ];
  return (
    <section
      className="parcel-experience"
      ref={element}
      data-scene-state={
        animate ? "playing" : phase === 3 || reduced ? "idle" : "paused"
      }
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
          {entered ? (
            <ThreeScene
              rows={sceneRows}
              selected={selected}
              onSelect={onSelect}
              playing={animate}
              replay={replay}
              onPhase={setPhase}
            />
          ) : (
            <div className="scene-loading">
              <Spinner label="Scene loads when it comes into view…" />
            </div>
          )}
        </Suspense>
        <span className="scene-sticker" aria-hidden="true">
          same parcel.
          <br />
          different plot.
        </span>
      </div>
      <div className="experience-status">
        <span className="scene-status-dot" />
        <p aria-live="polite">{reduced ? labels[3] : labels[phase]}</p>
        <div className="scene-controls">
          {!reduced && (
            <>
              <button
                className="icon-button"
                disabled={phase === 3}
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
        {sceneRows.map((row, i) => (
          <button
            key={`${row.evidenceId}-${i}`}
            aria-pressed={row.evidenceId === selected}
            className={row.evidenceId === selected ? "selected" : ""}
            onClick={() => onSelect(row.evidenceId)}
          >
            <FileText size={15} />
            <span className="scene-record-id" title={row.evidenceId}>
              {row.evidenceId.length > 20
                ? `${row.evidenceId.slice(0, 8)}…${row.evidenceId.slice(-6)}`
                : row.evidenceId}
            </span>
            <span>Record {i + 1}</span>
          </button>
        ))}
      </div>
      <p className="scene-caption">
        {reduced
          ? "Reduced motion: showing the complete scene."
          : "Drag to rotate. Tap a record to explore."}
        {!illustration && " Simplified view of evidence and pickup links."}
        {rows.length > 6 &&
          ` Showing ${sceneRows.length} of ${rows.length} records, including your selection. All sources remain available in the reader and proof view.`}
      </p>
    </section>
  );
}
