import { Link } from "react-router";
import { ArrowLeft, ArrowRight, FileText, GitBranch, History, Sparkles } from "lucide-react";
import { Brand } from "../components/UI";
import PublicFooter from "../components/PublicFooter";
import TeamSection from "../components/TeamSection";
import VideoGuide from "../components/VideoGuide";
import GitHubMark from "../components/GitHubMark";
import { project } from "../config/publicSite";
import "../styles/public.css";
const questions = [
  ["Can I use this with my real order documents?", "This release uses fictional practice cases and fictional source capture. It is not ready for arbitrary receipts, private support chats or real personal case data. It does not contact a courier or issue a refund."],
  ["Do I need an account?", "No. Explore as a guest opens a separate temporary practice workspace. Optional Google sign-in keeps a separate saved workspace while the database is retained. Guest work is not automatically moved into an account."],
  ["Does a saved explanation prove what happened?", "No. A manually recorded explanation is not independently verified. A resolved follow-up task and no pending questions do not establish that an entire case is resolved."],
  ["What does the graph actually do?", "FalkorDB follows the recorded links between cases, items, returns, pickup attempts, statements and documents. The workflow compares the same pickup attempt, returns its source paths, and records which sources a saved question reviewed. Context lab can temporarily leave one source out without deleting it."],
  ["What if the AI service is unavailable?", "You can still inspect records, use Context lab, review the supported rules, prepare a local follow-up question and create a source-linked brief. The separate AI investigation needs the operator’s configured model key."],
];
export default function About() {
  return <div className="about-page"><header className="public-nav wrap"><Brand/><nav aria-label="About navigation"><Link to="/"><ArrowLeft size={16}/>Back to the story</Link><Link className="button primary" to="/cases">Try the practice workspace <ArrowRight size={16}/></Link></nav></header>
    <main id="main-content"><section className="about-hero wrap"><span className="sticker"><Sparkles size={15}/>THE PEOPLE & THE WHY</span><h1 data-route-heading tabIndex={-1}>A clearer story.<br/><span>A human starting point.</span></h1><p>When two records tell different stories about one pickup, the next useful step is a clear question with the original words attached.</p><div className="about-handnote" aria-hidden="true">Keep the receipts.<br/>Follow the thread. ✳</div></section>
      <TeamSection/>
      <section className="about-idea wrap" aria-labelledby="idea-title"><div className="about-idea-intro"><span className="eyebrow">THE IDEA THAT STARTED IT</span><h2 id="idea-title">“You cancelled.”<br/>“There was no courier.”<br/><span>Okay. Which pickup?</span></h2><p>ReturnTrail is a synthetic prototype for preparing an evidence-linked support conversation. It separates what was recorded, how records connect and what someone later explained.</p><a className="text-link" href={project.repository} target="_blank" rel="noopener noreferrer"><GitHubMark size={19}/>Read the source code <ArrowRight size={16}/></a></div><div className="about-principles">{[[FileText,"Original words first.","Keep each source and its exact recorded claim available to inspect."],[GitBranch,"Connections with a purpose.","Compare records about the same pickup attempt, then show the returned path."],[History,"Memory with boundaries.","Show what an earlier reply covered when a new source changes the context."]].map(([Icon,title,copy])=><article key={title}><span><Icon size={23}/></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
      <VideoGuide/>
      <section className="about-faq wrap" aria-labelledby="faq-title"><div><span className="eyebrow">BEFORE YOU UNPACK</span><h2 id="faq-title">Good questions.<br/><span>Plain answers.</span></h2><p>What this version can do, what it remembers and where its limits are.</p></div><div className="faq-list">{questions.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="about-next wrap"><div><span className="eyebrow">YOUR TURN TO FOLLOW THE THREAD</span><h2>Start with a practice case.</h2><p>Original records, connected context and one useful next question.</p></div><Link className="button primary large" to="/cases">Explore as a guest <ArrowRight size={18}/></Link></section>
    </main><PublicFooter/>
  </div>;
}
