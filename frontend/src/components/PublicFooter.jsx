import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./UI";
import GitHubMark from "./GitHubMark";
import { YouTubeMark } from "./SocialMarks";
import { demoVideoId, project } from "../config/publicSite";
export default function PublicFooter() {
  return <footer className="public-footer wrap">
    <div className="public-footer-main"><Brand /><p>Less return drama.<br/>More “oh, that makes sense.”</p>
      <nav aria-label="Project links"><Link to="/about">Meet the builders</Link><a href={project.repository} target="_blank" rel="noopener noreferrer"><GitHubMark size={17}/>Source code <ArrowUpRight size={14}/></a>{demoVideoId && <a href={`https://www.youtube.com/watch?v=${demoVideoId}`} target="_blank" rel="noopener noreferrer"><YouTubeMark size={19}/>Demo video <ArrowUpRight size={14}/></a>}<a href="/how-it-works.html">How it works</a><a href="/privacy.html">Privacy & demo data</a></nav>
    </div><div className="public-footer-note"><span>Built with <a href="https://www.falkordb.com/" target="_blank" rel="noopener noreferrer">FalkorDB</a> for <a href={project.event} target="_blank" rel="noopener noreferrer">Graph Hacks</a>.</span><span>Practice cases. Original records stay original.</span></div>
  </footer>;
}
