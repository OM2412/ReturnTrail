import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const base = process.env.APP_URL || "http://127.0.0.1:5174";
const out = path.resolve(import.meta.dirname, "qa/context");
await mkdir(out, { recursive: true });
const options = { headless: true, args: ["--no-sandbox"] };
if (process.env.CHROMIUM_MODULE) {
  const portable = (await import(process.env.CHROMIUM_MODULE)).default;
  options.executablePath = await portable.executablePath(); options.args = portable.args;
}
const browser = await chromium.launch(options);
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
const page = await context.newPage(), errors = [], passes = [];
page.on("pageerror", (e) => errors.push(e.message));
let aiCalls = 0; page.on("request", (r) => { if (r.url().endsWith("/investigate")) aiCalls++; });
const pass = (name) => { passes.push(name); console.log("PASS " + name); };
const nav = (name) => page.getByRole("navigation", { name: "Workspace navigation", exact: true }).getByRole("link", { name, exact: true }).click();
async function get(route) { const res = await page.request.get(base + route); assert.equal(res.status(), 200, await res.text()); return res.json(); }
async function post(route, body) {
  const check = await get("/api/auth/csrf");
  const res = await page.request.post(base + route, { headers: { "X-CSRF-TOKEN": check.token }, ...(body ? { data: body } : {}) });
  assert.equal(res.status(), 200, await res.text()); return res.json();
}
try {
  await page.goto(base + "/cases");
  await page.getByRole("button", { name: "Start practice workspace" }).click();
  await page.getByRole("link", { name: "Open CASE-001", exact: true }).click();
  await page.locator(".overview-hero").waitFor();
  const before = await get("/api/cases/CASE-001/snapshot");
  await nav("Context lab"); await page.locator(".context-comparison").waitFor();
  await page.getByLabel("Which source should this preview set aside?").selectOption("DOC-001");
  await page.getByText("The supported rule outcome changes.", { exact: true }).waitFor();
  const after = await get("/api/cases/CASE-001/snapshot");
  assert.equal(after.evidenceVersion, before.evidenceVersion); assert.equal(after.workflowVersion, before.workflowVersion);
  assert.deepEqual(after.evidence, before.evidence); assert.equal(after.actions.length, 0);
  const apiPreview = await get("/api/cases/CASE-001/context?exclude=DOC-001");
  assert.equal(apiPreview.preview.assessment.state, "NO_SUPPORTED_FINDING");
  assert.equal(apiPreview.preview.graph.paths.length, 1); assert.equal(apiPreview.preview.graph.paths[0].evidenceId, "DOC-002");
  assert.equal((await page.request.get(base + "/api/cases/CASE-001/context?exclude=DOC-004")).status(), 404);
  await page.screenshot({ path: out + "/preview-desktop.png", fullPage: true });
  pass("Counterfactual changes the supported finding through a read-only graph path; original sources, versions and tasks stay unchanged; foreign source is rejected");
  await nav("Investigation"); await page.getByRole("button", { name: "Review rules & prepare question" }).click();
  await page.getByText(/Rule review completed\./).waitFor();
  const taskSnapshot = await get("/api/cases/CASE-001/snapshot"); assert.equal(taskSnapshot.actions.length, 1); assert.equal(aiCalls, 0);
  await nav("Context lab"); await page.getByText("The task covers these sources.", { exact: true }).waitFor();
  pass("Explicit rule review prepares the real local source-linked task without an AI call or a fabricated AI trace");
  await page.goto(base + "/case/CASE-002/context"); await page.locator(".context-comparison").waitFor();
  const separate = await get("/api/cases/CASE-002/context?exclude=DOC-003");
  assert.equal(separate.current.findingCount, 0); assert.equal(separate.preview.assessment.findingCount, 0);
  assert.equal(separate.preview.ruleOutcomeChanged, false);
  pass("Separate pickup attempts do not become a same-attempt disagreement in the baseline or preview");
  await page.goto(base + "/case/CASE-004/context"); await page.getByText("The task covers these sources.", { exact: true }).waitFor();
  await post("/api/cases/CASE-004/evidence", { pickupId: "PICKUP-004", sourceLabel: "New fictional context", sourceType: "DEMO_NOTE", originalText: "A fictional additional source: courier unavailable.", quote: "courier unavailable", claimedStatus: "COURIER_UNAVAILABLE", synthetic: true, expectedVersion: 0, requestId: crypto.randomUUID() });
  await page.reload(); await page.getByText("Earlier context needs a fresh look.", { exact: true }).waitFor();
  const changed = await get("/api/cases/CASE-004/context");
  assert.equal(changed.memories[0].coversCurrentSourceSet, false); assert.equal(changed.memories[0].addedSinceReview.length, 1); assert.equal(changed.memories[0].taskStatus, "RESOLVED");
  await page.screenshot({ path: out + "/memory-desktop.png", fullPage: true });
  pass("New source is visibly outside the earlier saved task's REFERENCES set while its historical resolved status remains intact");
  await nav("Case brief"); await page.getByText("Prepare a support message", { exact: true }).click(); await page.getByLabel("Support message draft").waitFor();
  const draft = await page.getByLabel("Support message draft").inputValue();
  assert.match(draft, /CASE-004/); assert.match(draft, /FICTIONAL PRACTICE CASE/); assert.match(draft, /No message has been sent/);
  await page.screenshot({ path: out + "/brief-desktop.png", fullPage: true });
  pass("Fresh brief offers a clearly fictional support draft linked to the active case and sources; no external send occurs");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/case/CASE-004/context"); await page.locator(".context-comparison").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `overflow at ${width}`);
  }
  await page.screenshot({ path: out + "/memory-mobile.png", fullPage: true });
  assert.equal(aiCalls, 0); assert.deepEqual(errors, []);
  pass("Context lab fits 320/390/768px, direct links reload, and no uncaught browser error or model request occurs");
  const require = createRequire(import.meta.url);
  const axe = require.resolve("axe-core/axe.min.js");
  const accessibility = [];
  await page.setViewportSize({ width: 1440, height: 1050 });
  for (const route of ["/signin", "/case/CASE-004", "/case/CASE-004/context", "/case/CASE-004/brief", "/case/CASE-004/investigation"]) {
    await page.goto(base + route);
    await page.locator(route === "/signin" ? ".signin-form-card" : ".page-title").waitFor();
    if (route.endsWith("/context")) await page.locator(".context-comparison").waitFor();
    if (route.endsWith("/brief")) await page.locator(".case-brief").waitFor();
    await page.addScriptTag({ path: axe });
    const result = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa"] } })).violations);
    accessibility.push({ route, violations: result.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  await writeFile(out + "/accessibility.json", JSON.stringify(accessibility, null, 2));
  const serious = accessibility.flatMap((r) => r.violations.filter((v) => ["serious","critical"].includes(v.impact)).map((v) => ({ route: r.route, ...v })));
  assert.deepEqual(serious, [], "Critical/serious automated accessibility violations; see qa/context/accessibility.json");
  pass("Five representative live routes have no serious/critical axe WCAG A/AA findings; this is not a full accessibility certification");
  await writeFile(out + "/results.json", JSON.stringify({ count: passes.length, passed: passes, errors, liveModelCalls: 0, api: "Real Spring Boot and FalkorDB; no mocked context responses" }, null, 2));
} catch (error) {
  await page.screenshot({ path: out + "/failure.png", fullPage: true });
  await writeFile(out + "/failure-dom.json", JSON.stringify(await page.locator(".context-preview").evaluateAll((els) => els.map((el) => ({ text: el.innerText, ancestors: [el, el.parentElement, el.parentElement?.parentElement, el.closest("main")].filter(Boolean).map((node) => ({ tag: node.tagName, classes: node.className, display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility, rect: node.getBoundingClientRect().toJSON() })) }))), null, 2));
  throw error;
} finally { await browser.close(); }
