import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const base = process.env.APP_URL || "http://127.0.0.1:5174";
const out = path.resolve(import.meta.dirname, "qa/workspace");
await mkdir(out, { recursive: true });
const options = { headless: true, args: ["--no-sandbox"] };
if (process.env.CHROMIUM_MODULE) {
  const portable = (await import(process.env.CHROMIUM_MODULE)).default;
  options.executablePath = await portable.executablePath();
  options.args = [...portable.args, "--enable-unsafe-swiftshader"];
}
const browser = await chromium.launch(options),
  passes = [],
  errors = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
async function pass(name) {
  passes.push(name);
  console.log("PASS " + name);
}
async function nav(name) {
  await page
    .getByRole("navigation", { name: "Workspace navigation", exact: true })
    .getByRole("link", { name, exact: true })
    .click();
}
async function overflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
}
async function waitOverview() {
  await page
    .getByRole("heading", { name: "Okay, let’s unpack this.", exact: true })
    .waitFor();
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await page.goto(base + "/cases");
  await page.getByRole("button", { name: "Start practice workspace" }).click();
  await page
    .getByRole("link", { name: "Open CASE-004", exact: true })
    .waitFor();
  assert.equal(await page.locator(".case-library-card").count(), 4);
  await page.screenshot({ path: out + "/library-desktop.png", fullPage: true });
  await pass(
    "Real guest workspace displays four database-backed scenario cards",
  );
  await page.getByRole("link", { name: "Open CASE-002", exact: true }).click();
  await waitOverview();
  assert.match(page.url(), /\/case\/CASE-002$/);
  assert.match(
    await page.locator(".overview-hero").innerText(),
    /Different attempts/,
  );
  await nav("Connections");
  await page.locator(".proof-panel").waitFor();
  assert.match(
    await page.locator(".proof-insight").innerText(),
    /DOC-004 belongs to a different attempt/,
  );
  await page.getByRole("button", { name: "DOC-004", exact: true }).click();
  await page
    .locator(".proof-insight")
    .filter({ hasText: "DOC-003 belongs to a different attempt" })
    .waitFor();
  assert.match(
    await page.locator(".proof-insight").innerText(),
    /DOC-003 belongs to a different attempt/,
  );
  await page.locator(".proof-details summary").click();
  assert.equal(await page.locator(".proof-details li").count(), 7);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: out + "/proof-desktop.png", fullPage: true });
  await pass(
    "Real proof explains why different attempts are excluded and lists seven matched links",
  );
  await nav("Evidence");
  await page.getByRole("button", { name: "Compare pickup claims" }).click();
  assert.equal(await page.locator(".inline-comparison .quote-card").count(), 1);
  await pass("Evidence comparison includes only the selected pickup attempt");
  await page.goto(base + "/case/CASE-003");
  await waitOverview();
  assert.match(
    await page.locator(".overview-hero").innerText(),
    /missing piece/i,
  );
  const response = await context.request.post(
    base + "/api/cases/CASE-003/actions",
    {
      headers: {
        "X-CSRF-TOKEN": (
          await (await context.request.get(base + "/api/auth/csrf")).json()
        ).token,
      },
    },
  );
  assert.equal(response.status(), 200);
  await page.getByRole("button", { name: "Refresh case data" }).click();
  await nav("Follow-up tasks");
  await page
    .getByLabel("Add the explanation you received")
    .fill(
      "Still unknown. Waiting for a fictional courier reply. <script>window.bad=true</script>",
    );
  await page.getByRole("radio", { name: /Still unknown/ }).check();
  await page.getByRole("button", { name: "Save note & keep open" }).click();
  await page
    .getByRole("heading", { name: "Note saved. Question still open." })
    .waitFor();
  assert.equal(await page.locator(".clarification-form").count(), 1);
  assert.equal(await page.evaluate(() => window.bad), undefined);
  let snapshot = await (
    await context.request.get(base + "/api/cases/CASE-003/snapshot")
  ).json();
  assert.equal(snapshot.pendingFindings.length, 1);
  assert.equal(snapshot.actions[0].status, "OPEN");
  await page.screenshot({
    path: out + "/unknown-note-desktop.png",
    fullPage: true,
  });
  await pass(
    "Real unknown reply preserves the pending question and safely renders source text",
  );
  await page
    .getByLabel("Add the explanation you received")
    .fill(
      "A synthetic manual reply reports courier unavailability. Not independently verified.",
    );
  await page
    .getByRole("radio", { name: /An explanation was provided/ })
    .check();
  await page
    .getByRole("button", { name: "Save explanation & resolve task" })
    .click();
  await page
    .getByRole("heading", { name: "Manual explanation recorded" })
    .waitFor();
  assert.equal(await page.locator(".saved-clarification").count(), 2);
  assert.equal(await page.locator(".clarification-form").count(), 0);
  snapshot = await (
    await context.request.get(base + "/api/cases/CASE-003/snapshot")
  ).json();
  assert.equal(snapshot.pendingFindings.length, 0);
  assert.equal(snapshot.evidence.length, 1);
  assert.equal(snapshot.findings.length, 1);
  await pass(
    "Explicit explanation resolves only its task and retains both manual notes and original evidence",
  );
  await nav("Case history");
  await page.locator(".history-timeline").waitFor();
  assert.equal(await page.locator(".history-timeline>li").count(), 3);
  await page.reload();
  await page.locator(".history-timeline").waitFor();
  assert.equal(await page.locator(".history-timeline>li").count(), 3);
  await pass("Case-specific deep-link refresh retains saved events");
  await page.goto(base + "/cases");
  await page.getByRole("link", { name: "Open CASE-001", exact: true }).click();
  await waitOverview();
  await nav("Follow-up tasks");
  await page
    .getByRole("heading", { name: "No follow-up task has been prepared." })
    .waitFor();
  await page.goto(base + "/case/CASE-003/tasks");
  await page
    .getByRole("heading", { name: "Manual explanation recorded" })
    .waitFor();
  assert.match(page.url(), /CASE-003\/tasks/);
  const sourceLink = page.locator(".reference-links .record-chip").first();
  assert.match(
    await sourceLink.getAttribute("href"),
    /\/case\/CASE-003\/evidence\?doc=DOC-005/,
  );
  await pass(
    "Case switching and source links preserve case scope without leaking replies",
  );
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/cases",
      "/case/CASE-001",
      "/case/CASE-002/graph",
      "/case/CASE-003/tasks",
      "/case/CASE-004/history",
    ]) {
      await page.goto(base + route);
      if (route === "/cases")
        await page
          .getByRole("link", { name: "Open CASE-004", exact: true })
          .waitFor();
      else await page.locator(".workspace-main h1").waitFor();
      await overflow();
    }
    if (width === 390) {
      await page.goto(base + "/cases");
      await page
        .getByRole("link", { name: "Open CASE-004", exact: true })
        .waitFor();
      await page.screenshot({
        path: out + "/library-mobile.png",
        fullPage: true,
      });
      await page.goto(base + "/case/CASE-002/graph");
      await page.locator(".proof-panel").waitFor();
      await page.screenshot({
        path: out + "/proof-mobile.png",
        fullPage: true,
      });
    }
  }
  await pass(
    "Library, proof, overview, tasks and history fit at 320,390,768,1024 and1440 pixels",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/case/CASE-999");
  await page
    .getByRole("heading", { name: "The case could not be opened." })
    .waitFor();
  assert.equal(await page.locator(".workspace-main").count(), 0);
  await pass("Unknown case does not display the previous cases records");
  assert.deepEqual(errors, []);
  await pass("Real API browser workflow has no uncaught JavaScript errors");
  await writeFile(
    out + "/results.json",
    JSON.stringify(
      {
        passed: passes,
        count: passes.length,
        errors,
        backend:
          "Real Spring Boot and FalkorDB. Deterministic action endpoint used; no Groq calls.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
