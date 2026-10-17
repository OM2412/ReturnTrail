import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const base = process.env.APP_URL || "http://127.0.0.1:5174",
  out = path.resolve(import.meta.dirname, "qa/evidence");
await mkdir(out, { recursive: true });
const options = {
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
};
if (process.env.CHROMIUM_MODULE) {
  const portable = (await import(process.env.CHROMIUM_MODULE)).default;
  options.executablePath = await portable.executablePath();
  options.args = [...portable.args, "--enable-unsafe-swiftshader"];
}
const browser = await chromium.launch(options),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  }),
  page = await context.newPage(),
  passes = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const pass = (name) => {
  passes.push(name);
  console.log("PASS " + name);
};
const nav = async (name) =>
  page
    .getByRole("navigation", { name: "Workspace navigation", exact: true })
    .getByRole("link", { name, exact: true })
    .click();
try {
  await page.goto(base + "/cases");
  await page.getByRole("button", { name: "Start practice workspace" }).click();
  await page.getByRole("link", { name: "Open CASE-004", exact: true }).click();
  await page.locator(".overview-hero").waitFor();
  await nav("Evidence inbox");
  await page
    .getByRole("heading", { name: "New receipt. New context." })
    .waitFor();
  await page.getByRole("button", { name: "Load fictional example" }).click();
  await page
    .getByLabel("Original fictional text")
    .fill(
      "Fictional original: courier unavailable. <script>window.sourceExecuted=true</script> Full original context.",
    );
  await page.getByLabel("Exact supporting quote").fill("different wording");
  await page.getByLabel("This record is fictional.").check();
  await page.getByRole("button", { name: "Review source & link" }).click();
  await page
    .getByText("Copy a supporting quote exactly from your original text.")
    .waitFor();
  await page.getByLabel("Exact supporting quote").fill("courier unavailable");
  await page.getByRole("button", { name: "Review source & link" }).click();
  await page.locator(".inbox-review mark").waitFor();
  assert.equal(
    await page.locator(".inbox-review mark").innerText(),
    "courier unavailable",
  );
  assert.equal(await page.evaluate(() => window.sourceExecuted), undefined);
  await page.screenshot({ path: out + "/inbox-review.png", fullPage: true });
  pass(
    "Inbox requires an exact quote, shows the full original and safely renders script-shaped text",
  );
  // The POST succeeds, then its snapshot read fails once. The UI must keep the commit receipt.
  let failRead = false;
  await page.route("**/api/cases/CASE-004/evidence", async (route) => {
    const response = await route.fetch();
    failRead = true;
    await route.fulfill({ response });
  });
  await page.route("**/api/cases/CASE-004/snapshot", async (route) => {
    if (failRead) {
      failRead = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"Temporary read failure"}',
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Save source & update context" })
    .click();
  await page
    .getByRole("heading", { name: "A source joined the paper trail." })
    .waitFor();
  await page
    .getByText("The save completed, but the case could not be refreshed.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Add another source" }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Refresh the saved case" }).click();
  await page
    .getByRole("button", { name: "Add another source" })
    .waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (b) => b.textContent.includes("Add another source") && !b.disabled,
    ),
  );
  let snap = await (
    await context.request.get(base + "/api/cases/CASE-004/snapshot")
  ).json();
  assert.equal(snap.evidence.length, 3);
  assert.equal(snap.pendingFindings.length, 1);
  assert.equal(snap.actions[0].status, "RESOLVED");
  pass(
    "Successful save remains acknowledged after a failed refresh; one source and earlier reply survive recovery",
  );
  await page.getByRole("link", { name: "Read the saved source" }).click();
  await page.locator(".source-original summary").click();
  assert.match(
    await page.locator(".source-original").innerText(),
    /Full original context/,
  );
  await nav("Overview");
  await page.locator(".context-changed").waitFor();
  assert.match(
    await page.locator(".context-changed").innerText(),
    /version 1/i,
  );
  await nav("Follow-up tasks");
  assert.equal(await page.locator(".clarification-form").count(), 0);
  assert.match(
    await page.locator(".task-detail").innerText(),
    /earlier source set/,
  );
  const prepared = await context.request.post(
    base + "/api/cases/CASE-004/actions",
    {
      headers: {
        "X-CSRF-TOKEN": (
          await (await context.request.get(base + "/api/auth/csrf")).json()
        ).token,
      },
    },
  );
  assert.equal(prepared.status(), 200);
  await page.getByRole("button", { name: "Refresh case data" }).click();
  await page.locator(".clarification-form").waitFor();
  await page
    .getByLabel("Add the explanation you received")
    .fill("Still unknown, recorded manually for the fictional demo.");
  await page.getByRole("radio", { name: /Still unknown/ }).check();
  await page.getByRole("button", { name: "Save note & keep open" }).click();
  await page
    .getByRole("heading", { name: "Note saved. Question still open." })
    .waitFor();
  await nav("Case history");
  await page.locator(".history-timeline").waitFor();
  assert.match(
    await page.locator(".history-timeline").innerText(),
    /status when recorded was OPEN/,
  );
  assert.match(
    await page.locator(".history-timeline").innerText(),
    /A SOURCE JOINED THE TRAIL/,
  );
  pass(
    "New evidence needs review; fresh task keeps unknown reply OPEN and history includes source arrival",
  );
  await nav("Case brief");
  await page.locator(".case-brief").waitFor();
  assert.match(
    await page.locator(".brief-header").innerText(),
    /Evidence version 1/,
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const d = await downloaded;
  const artifact = await d.path();
  const { readFile } = await import("node:fs/promises");
  const brief = JSON.parse(await readFile(artifact, "utf8"));
  assert.equal(brief.snapshot.evidenceVersion, 1);
  assert.equal(brief.snapshot.evidence.length, 3);
  assert.equal(brief.snapshot.clarifications.length, 2);
  assert.match(d.suggestedFilename(), /CASE-004-v1/);
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: out + "/case-brief.pdf",
    printBackground: true,
    format: "A4",
  });
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({ path: out + "/brief-desktop.png", fullPage: true });
  pass(
    "Fresh case brief downloads structured sources, versions, history and prints to a readable report",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "inbox",
      "brief",
      "evidence",
      "tasks",
      "history",
      "graph",
    ]) {
      await page.goto(base + "/case/CASE-004/" + route);
      await page.locator(".workspace-main h1").waitFor();
      if (route === "brief") await page.locator(".case-brief").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `${route} at ${width}px overflows`,
      );
    }
    if (width === 390) {
      await page.goto(base + "/case/CASE-004/inbox");
      await page.locator(".inbox-form").waitFor();
      await page.screenshot({
        path: out + "/inbox-mobile.png",
        fullPage: true,
      });
    }
  }
  pass(
    "Inbox, brief and existing evidence workflows fit 320,390,768 and1440 pixels with long source IDs",
  );
  assert.deepEqual(errors, []);
  pass("Evidence workflow has no uncaught browser errors");
  await writeFile(
    out + "/results.json",
    JSON.stringify(
      {
        passed: passes,
        count: passes.length,
        errors,
        backend:
          "Real Spring Boot/FalkorDB; one read failure injected; zero live model calls",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: out + "/failure.png", fullPage: true });
  throw error;
} finally {
  await browser.close();
}
