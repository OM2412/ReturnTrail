# ReturnTrail: Let’s unpack it

A colourful return desk for people who want to understand a case without learning
about graph databases, model requests, tool names, or UUIDs.

## What changed

| Space | Experience |
|---|---|
| Landing | An original unboxing story, a lime headline sticker, a short how-to, and an explicit demo CTA |
| Overview | A short case story, four coloured counters, two original statements, and a state-aware next action |
| Evidence | Peach/lilac document surfaces, search, URL-based selection, and comparison inside the reader |
| Connections | A hollow 3D carton opens; documents rise sequentially; curved links draw afterward; selection updates the real record inspector |
| Investigation | A plain-language result, source cards, actual completed steps, and an expandable full report |
| Follow-up tasks | A focused manual reply form, source links, exact reference copy, and a readable saved reply |
| Case history | Chapter cards with the task/reply timestamps the backend actually returns |

The theme uses ink borders and shadows, lilac surfaces, peach records, mint replies,
and lime actions. Playful copy stays around the workflow. Original statements and
manual notes are rendered verbatim as escaped text.

## Visual and implementation references

These are researched principles, not copied screens, logos, mascots, or assets.
All parcel/document geometry, the favicon, and the layout composition are original.

| Reference | What informed this implementation |
|---|---|
| [Mailchimp’s official brand assets](https://mailchimp.com/about/brand-assets/) | Confident colour and dark accents; ReturnTrail uses its own lime/lilac/peach palette |
| [Linear’s design refresh](https://linear.app/now/behind-the-latest-design-refresh) | A predictable navigation frame, hierarchy, and placing secondary detail one level deeper |
| [Motion accessibility](https://motion.dev/docs/react-accessibility) | Respect reduced motion; make transforms optional; retain the educational information |
| [React Three Fiber hooks](https://r3f.docs.pmnd.rs/api/hooks) | Frame-based animation inside the Canvas, without driving React state on every frame |
| [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) | Reveal the indexed tube geometry progressively with setDrawRange |

## Motion rules

The scene plays once on entering its page. The box flaps open, the first document
rises and fans out, the next follows, and the connecting curves grow afterward.
Replay restarts the sequence; pause freezes scene time; dragging rotates the camera.
Reduced-motion mode renders the complete arrangement and omits playback controls.
A failed/unavailable WebGL context shows a readable fallback; source selection and
the inspector remain available through normal buttons.

No graphical phase is presented as live backend or model progress. The investigation
trace shows only steps returned by a completed API response.

## Behavior preserved

- Same-origin API requests and guest cookies; API keys remain on the backend.
- The seeded case remains synthetic; both contradictory claims are preserved.
- Saving a manual reply resolves a local task, not the whole case.
- Notes are not independently verified. They never become a new verified fact.
- No messages are sent and no refunds are issued by the frontend.
- No investigation runs automatically on navigation or refresh.
- Session expiry clears stale context and requires an explicit new guest session.
- No automatic retry of writes; rate-limit and timeout states remain visible.
- Original model/tool names and the full deterministic report remain in details.

## Development

Node 24 was used for validation. From frontend:

```powershell
npm.cmd ci
npm.cmd run dev
```

Vite uses http://127.0.0.1:5174 and proxies /api to http://127.0.0.1:8085.
The backend must already be running for the real guest workflow.

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

For the optional browser contract tests, install Playwright’s Chromium once, then:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Stop another Vite instance using 5174 before running the browser test runner. It
starts/stops its own dev server. Browser endpoints are mocked; it does not send
real Groq requests. Fonts are local npm assets. Playwright is a development dependency.

The 3D chunk remains lazy-loaded; it is not needed to use the record/reply pages.
