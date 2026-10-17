import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  GitBranch,
  MessageCircle,
  PackageOpen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../app/AuthContext";
import { useCase } from "../app/CaseContext";
import { Brand, ErrorNotice, Spinner } from "../components/UI";
import ParcelExperience from "../components/ParcelExperience";
import TeamSection from "../components/TeamSection";
import VideoGuide from "../components/VideoGuide";
import PublicFooter from "../components/PublicFooter";
import GitHubMark from "../components/GitHubMark";
import { YouTubeMark } from "../components/SocialMarks";
import { demoVideoId, project } from "../config/publicSite";
import "../styles/public.css";
const illustration = [
  { evidenceId: "DOC-001", pickupId: "PICKUP-001" },
  { evidenceId: "DOC-002", pickupId: "PICKUP-001" },
];

export default function Landing() {
  const { start, working, error } = useCase();
  const { session: auth } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("DOC-001");
  async function open() {
    if (await start()) navigate("/cases");
  }
  return (
    <div className="landing">
      <header className="landing-nav wrap">
        <Brand />
        <nav aria-label="Landing navigation">
          <Link to={auth.authenticated ? "/account" : "/signin"}>
            {auth.authenticated ? "My account" : "Sign in"}
          </Link>
          <a href="#process">The how-to</a>
          <Link to="/about">The team</Link>
          <a
            href={project.repository}
            target="_blank"
            rel="noreferrer"
          >
            <GitHubMark size={17}/> Source code <ArrowUpRight size={14} />
          </a>
        </nav>
        <span className="session-pill">
          <span />
          Try it. No sign-up.
        </span>
      </header>
      <nav className="public-guide-links wrap" aria-label="Public guides"><a href="/how-it-works.html">How the evidence workflow works</a><a href="/privacy.html">Demo privacy & data boundaries</a></nav>
      <main>
        <section className="landing-hero wrap">
          <div className="landing-copy">
            <span className="sticker eyebrow-sticker">
              <Sparkles size={14} /> A RETURN DESERVES A CLEAR STORY
            </span>
            <h1>
              Return drama?
              <br />
              Let’s <span className="headline-highlight">unpack it.</span>
              <span className="headline-star" aria-hidden="true">
                ✳
              </span>
            </h1>
            <p className="lead">
              “You cancelled.” “No courier was available.”
              <br />
              Two records. One pickup. Compare their original words and build a
              source-linked brief for your next support conversation.
            </p>
            <div className="button-row">
              <button
                className="button primary large"
                onClick={() => void open()}
                disabled={!!working}
              >
                {working ? (
                  <Spinner label="Opening your case…" />
                ) : (
                  <>
                    {auth.authenticated
                      ? "Open my workspace"
                      : "Explore the demo case"}{" "}
                    <ArrowUpRight size={20} />
                  </>
                )}
              </button>
              <a className="text-link" href="#process">
                How does this work? <ArrowRight size={17} />
              </a>
              {demoVideoId && <a className="text-link" href="#walkthrough"><YouTubeMark size={21}/>Watch the demo</a>}
            </div>
            <p className="micro-note">
              <ShieldCheck size={16} />
              Made-up case. Your own demo space. Zero real refunds.
            </p>
            <ErrorNotice error={error} />
            <div className="landing-proof">
              <span className="proof-icon">
                <PackageOpen size={20} />
              </span>
              <div>
                <strong>Less “wait, what?”</strong>
                <span>More context. A clearer next step.</span>
              </div>
              <span className="tiny-star" aria-hidden="true">
                ✦
              </span>
            </div>
          </div>
          <div className="landing-scene">
            <ParcelExperience
              rows={illustration}
              selected={selected}
              onSelect={setSelected}
              illustration
            />
          </div>
        </section>
        <div
          className="story-ribbon"
          aria-label="Read the records. Connect the stories. Ask the next question."
        >
          <span>READ THE RECORDS</span>
          <b aria-hidden="true">✳</b>
          <span>CONNECT THE STORIES</span>
          <b aria-hidden="true">✳</b>
          <span>ASK THE NEXT QUESTION</span>
          <b aria-hidden="true">✳</b>
        </div>
        <section className="landing-process wrap" id="process">
          <div className="section-title">
            <div>
              <p className="eyebrow">NO DETECTIVE DEGREE REQUIRED</p>
              <h2>
                From tangled to
                <br />
                <span className="serif-word">“that makes sense.”</span>
              </h2>
            </div>
            <p>
              Each step gets its own space.
              <br />
              You choose where to go next.
            </p>
          </div>
          <div className="process-grid">
            {[
              {
                icon: FileText,
                title: "Read both stories.",
                copy: "Open the original statements. Compare what was actually recorded.",
                color: "peach",
              },
              {
                icon: GitBranch,
                title: "Find the common thread.",
                copy: "See which records belong to the same pickup. No graph knowledge needed.",
                color: "lilac",
              },
              {
                icon: MessageCircle,
                title: "Keep the reply attached.",
                copy: "Save a manual explanation with the task. The original records stay intact.",
                color: "lime",
              },
            ].map(({ icon: Icon, title, copy, color }, i) => (
              <article className={`process-card tone-${color}`} key={title}>
                <div>
                  <span className="chunky-icon">
                    <Icon size={26} />
                  </span>
                  <code>0{i + 1}</code>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="card-doodle" aria-hidden="true">
                  {["↗", "✳", "✓"][i]}
                </span>
              </article>
            ))}
          </div>
        </section>
        <VideoGuide/>
        <TeamSection compact/>
        <section className="landing-last wrap">
          <div>
            <span className="eyebrow">THE BOX IS OPEN. YOUR MOVE.</span>
            <h2>
              A tiny case.
              <br />A much clearer picture.
            </h2>
          </div>
          <button
            className="button primary large"
            disabled={!!working}
            onClick={() => void open()}
          >
            {working ? (
              <Spinner label="Opening…" />
            ) : (
              <>
                Let’s follow the trail <ArrowUpRight size={21} />
              </>
            )}
          </button>
        </section>
      </main>
      <PublicFooter/>
    </div>
  );
}
