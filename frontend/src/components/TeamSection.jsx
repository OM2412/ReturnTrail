import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import GitHubMark from "./GitHubMark";
import { LinkedInMark } from "./SocialMarks";
import { team } from "../config/publicSite";
export function TeamCard({ person, compact = false }) {
  const [failed, setFailed] = useState(false);
  return <article className={`builder-card builder-${person.id}${compact ? " builder-compact" : ""}`}>
    <div className="builder-photo-frame"><span className="builder-pin" aria-hidden="true"/>{failed ? <span className="builder-initials" role="img" aria-label={`${person.name} portrait unavailable`}>{person.initials}</span> : <img className={`builder-photo portrait-${person.id}`} src={person.image} alt={`Portrait of ${person.name}`} width="240" height="240" loading="lazy" decoding="async" onError={() => setFailed(true)}/>}<span className="builder-photo-note" aria-hidden="true">{person.id === "om" ? "CONNECT THE DOTS" : "KEEP THE CONTEXT"}</span></div>
    <div className="builder-details"><span className="eyebrow">THE RETURNTRAIL TEAM</span><h3>{person.name}</h3><p>{person.role}</p><nav aria-label={`${person.name} profiles`}><a href={person.github} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on GitHub`}><GitHubMark size={18}/>GitHub <ArrowUpRight size={14}/></a><a href={person.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on LinkedIn`}><LinkedInMark size={17}/>LinkedIn <ArrowUpRight size={14}/></a></nav></div>
  </article>;
}
export default function TeamSection({ compact = false }) {
  return <section className={`builders-section wrap${compact ? " builders-preview" : ""}`} aria-labelledby="builders-title"><div className="builders-heading"><div><span className="eyebrow">SMALL TEAM. SHARED CURIOSITY.</span><h2 id="builders-title">People behind<br/><span>the paper trail.</span></h2></div><p>Om and Ajeet build across the frontend and backend, making connected evidence easier to follow.</p></div>
    <div className="builders-grid">{team.map(person => <TeamCard key={person.id} person={person} compact={compact}/>)}</div>{compact && <Link to="/about" className="text-link builders-more">Meet the builders & the idea <ArrowRight size={17}/></Link>}
  </section>;
}
