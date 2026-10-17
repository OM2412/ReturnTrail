import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { demoVideoId } from "../config/publicSite";
import { YouTubeMark } from "./SocialMarks";
export default function VideoGuide({ videoId = demoVideoId }) {
  const [loaded, setLoaded] = useState(false);
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId || "")) return null;
  return <section className="video-guide wrap" id="walkthrough" aria-labelledby="walkthrough-title"><div><span className="eyebrow">THE PAPER TRAIL, IN MOTION</span><h2 id="walkthrough-title">See the story<br/>come together.</h2><p>A recorded walkthrough of the project. Explore the live practice workspace to try the workflow yourself.</p><a className="text-link" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"><YouTubeMark size={21}/>Watch on YouTube <ArrowUpRight size={16}/></a></div><div className="video-screen">{loaded ? <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`} title="ReturnTrail project demo" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <button className="video-poster" onClick={() => setLoaded(true)} aria-label="Load the ReturnTrail demo video from YouTube"><img src="/share-card.png" alt="" width="1200" height="630" loading="lazy"/><span className="video-play"><Play size={30} fill="currentColor"/></span><span className="video-poster-label">Load demo video</span></button>}</div><p className="video-privacy">YouTube loads only when you choose to load the video. Playback does not start automatically.</p></section>;
}
