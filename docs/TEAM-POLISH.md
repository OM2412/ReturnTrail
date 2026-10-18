# Team, public story and optional video — 17 October 2026

This update adds a public team/About experience to the existing Context release. It uses the supplied portraits, names and profile destinations. It does not modify authentication credentials, case records, Google configuration, Git authors or remote history.

## What is included

- Two real team portraits in tactile pastel cards; GitHub/LinkedIn links have recognizable SVG marks and accessible names.
- Both people are labeled full-stack developers. The shared contribution statement reflects the team's reported frontend/backend work without inventing individual ownership percentages.
- A compact landing preview links to a separate `/about` page. About has the project idea, actual graph role, supported limits, keyboard-operable FAQs and a practice-workspace entry.
- A shared footer provides source code, team, how-it-works and privacy links, plus a video link only after configuration.
- Existing case routes and Google/guest workflows stay separate from the public story. Browsing About does not create a guest workspace.
- `/about` works as a production Spring deep link and is included in the public sitemap. Client metadata indexes public Home/About routes and keeps private routes noindex. The React-rendered About page is not a promise of search indexing/rank.

## Photos and links

The supplied first/suit portrait is assigned to Om and the second/white-background portrait to Ajeet. If that order needs changing, update the `image` values in `frontend/src/config/publicSite.js`.

Om:
- https://github.com/OM2412
- https://www.linkedin.com/in/om-singh-jadon-b92679314/

Ajeet:
- https://github.com/AjeetGadekar
- https://www.linkedin.com/in/ajeet-gadekar-1b5692363/

Project source: https://github.com/OM2412/ReturnTrail

Portraits are local assets; they are not hotlinked from LinkedIn. Photos reserve their layout space, load lazily and fall back to initials if a file fails. Public WebP files total roughly 156 KB. Original files and the exact image-edit prompt are preserved in `PHOTO-EDIT.md` and `team-originals`. The source screenshots are documentation assets, not files served by the public frontend build.

## Published YouTube demo — 18 October 2026

The published walkthrough is https://youtu.be/5lfysyQZOO0. The production Docker build defaults `DEMO_VIDEO_URL` to this public link and passes it to Vite as `VITE_DEMO_VIDEO_URL`. The landing page, About page and shared footer expose the demo after that build is deployed. The thumbnail is a local image, so it does not contact YouTube before the user chooses to load the player.

To override the video for a local development session, stop Vite, then run:

```powershell
Set-Location "$env:USERPROFILE\Projects\returntrail\frontend"
$env:VITE_DEMO_VIDEO_URL = (Read-Host "Paste the real HTTPS YouTube video URL").Trim()
npm.cmd run dev
```

For persistence, put one `VITE_DEMO_VIDEO_URL=https://www.youtube.com/watch?v=YOUR_VIDEO_ID` line in `frontend/.env.local`. Preserve any existing settings in that file. Restart Vite after changing it; a production build needs to be rebuilt with the setting present.

Supported inputs are HTTPS YouTube watch, youtu.be share, shorts and embed links with a valid video ID. Other hosts, credentials, custom ports and non-HTTPS values are ignored. An absent/invalid URL hides the feature.

The video is present on Landing/About with a local poster, an explicit load button and an external YouTube link. Only choosing Load creates the privacy-enhanced YouTube iframe; autoplay is not enabled. YouTube's own policies apply after loading. The uploaded video is linked above. Real playback, embed permission and final accessibility/captions remain separate from mocked player tests.

## Suggested video sequence

1. The original conflicting pickup statements.
2. Actual returned ownership/source paths and a different-attempt negative example.
3. Context lab's read-only source exclusion.
4. New source arrival requiring a fresh review while the old explanation remains historical.
5. A local follow-up and fresh source-linked brief.
6. Saved account logout/re-login and guest access.

Use an actual Groq tool trace if demonstrating AI investigation. Label deterministic rule review clearly. Do not show client secrets, API keys, cookies or real order documents in the recording. Review the hackathon submission form's actual duration/link requirements; no video length is claimed as an organizer rule here.

## Scope and provenance

GitHub mark: the existing Primer Octicons asset and its included MIT notice. LinkedIn and YouTube SVG marks identify profile/video destinations. Brand names belong to their respective owners; the page describes the technologies and event used to build this prototype without claiming an endorsement.

See `TEAM-VALIDATION.md` for current checks. Earlier `CONTEXT-VALIDATION` describes the prior release and should not be interpreted as fresh testing of every current flow.
