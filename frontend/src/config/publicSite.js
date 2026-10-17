// Public profile destinations supplied by the team. No credentials belong here.
export const project = Object.freeze({
  repository: "https://github.com/OM2412/ReturnTrail",
  event: "https://www.wemakedevs.org/hackathons/falkordb",
});
export const team = Object.freeze([
  { id: "om", name: "Om Singh Jadon", role: "Full-stack developer", image: "/team/om.webp",
    github: "https://github.com/OM2412", linkedin: "https://www.linkedin.com/in/om-singh-jadon-b92679314/", initials: "OSJ" },
  { id: "ajeet", name: "Ajeet Gadekar", role: "Full-stack developer", image: "/team/ajeet.webp",
    github: "https://github.com/AjeetGadekar", linkedin: "https://www.linkedin.com/in/ajeet-gadekar-1b5692363/", initials: "AG" },
]);
// Only HTTPS YouTube video URLs are accepted. Never pass arbitrary markup to an iframe.
export function youtubeVideoId(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (["youtu.be", "www.youtu.be"].includes(host)) id = url.pathname.slice(1);
    else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(embed|shorts)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch { return null; }
}
export const demoVideoId = youtubeVideoId(import.meta.env?.VITE_DEMO_VIDEO_URL || "");
