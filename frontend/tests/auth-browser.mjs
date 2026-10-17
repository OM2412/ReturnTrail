import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const base = process.env.APP_URL || "http://127.0.0.1:5174",
  out = path.resolve(import.meta.dirname, "qa/auth");
await mkdir(out, { recursive: true });
const options = { headless: true, args: ["--no-sandbox"] };
if (process.env.CHROMIUM_MODULE) {
  const portable = (await import(process.env.CHROMIUM_MODULE)).default;
  options.executablePath = await portable.executablePath();
  options.args = portable.args;
}
const browser = await chromium.launch(options),
  ctx = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
  }),
  page = await ctx.newPage(),
  errors = [],
  passes = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => requests.push(r.url()));
let account = false,
  guest = false,
  configured = false,
  googleConfigured = false,
  failCheck = false,
  logoutCalls = 0;
const profile = {
  login: "lamp-user",
  displayName: "Om <script>window.pwned=true</script>",
};
const caseInfo = {
  caseId: "CASE-001",
  title: "Practice workspace",
  scenario: "PICKUP_DISAGREEMENT",
  description: "Fictional case",
  lesson: "Read the sources",
};
await ctx.route("**/api/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    method = req.method();
  const send = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: status === 204 ? "" : JSON.stringify(data),
    });
  if (url.pathname === "/api/auth/session") {
    if (failCheck) {
      failCheck = false;
      return send({ error: "Unavailable" }, 503);
    }
    return send({
      authenticated: account,
      githubConfigured: configured,
      googleConfigured,
      workspaceMode: account ? "ACCOUNT" : guest ? "GUEST" : "NONE",
      profile: account ? profile : null,
    });
  }
  if (url.pathname === "/api/auth/csrf")
    return send({ headerName: "X-CSRF-TOKEN", token: "auth-ui-check" });
  if (url.pathname === "/api/auth/logout") {
    assert.equal(method, "POST");
    assert.equal(req.headers()["x-csrf-token"], "auth-ui-check");
    logoutCalls++;
    account = false;
    guest = false;
    return send(null, 204);
  }
  if (url.pathname === "/api/guest-sessions" && method === "POST") {
    assert.equal(req.headers()["x-csrf-token"], "auth-ui-check");
    guest = true;
    return send({
      status: "READY",
      caseId: "CASE-001",
      synthetic: true,
      initializedNow: true,
    });
  }
  if (url.pathname === "/api/cases")
    return guest || account
      ? send({
          synthetic: true,
          cases: [1, 2, 3, 4].map((i) => ({
            ...caseInfo,
            caseId: `CASE-00${i}`,
          })),
        })
      : send({ error: "Create a guest session first." }, 401);
  if (url.pathname.endsWith("/snapshot"))
    return guest || account
      ? send({
          caseId: "CASE-001",
          synthetic: true,
          caseInfo,
          evidence: [],
          findings: [],
          pendingFindings: [],
          actions: [],
          clarifications: [],
          evidenceVersion: 0,
          workflowVersion: 0,
          graph: { paths: [], nodes: [], edges: [] },
          changes: { latestEvidenceIds: [], earlierTaskIds: [] },
        })
      : send({ error: "Sign in first." }, 401);
  return send({ error: "Unknown mock route" }, 404);
});
const pass = (name) => {
  passes.push(name);
  console.log("PASS " + name);
};
async function noOverflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
}
try {
  await page.goto(base + "/signin");
  await page.getByRole("heading", { name: "Come on in." }).waitFor();
  await page.getByText("Saved sign-in is not enabled here yet.").waitFor();
  assert.equal(
    await page.locator(".signin-github:not(.signin-google)").getAttribute("aria-disabled"),
    "true",
  );
  assert.equal(await page.locator(".signin-google").getAttribute("href"), null);
  assert.equal(
    requests.some((u) => u.includes("ThreeScene")),
    false,
  );
  const lamp = page.locator(".desk-lamp");
  await page.getByRole("button", { name: "Turn the desk light off" }).click();
  assert.equal(await lamp.getAttribute("data-lamp-state"), "off");
  await page
    .getByRole("button", { name: "Turn the desk light on" })
    .press("Space");
  assert.equal(await lamp.getAttribute("data-lamp-state"), "on");
  const cord = await page.locator(".lamp-pull").boundingBox();
  await page.mouse.move(cord.x + cord.width / 2, cord.y + cord.height - 10);
  await page.mouse.down();
  await page.mouse.move(cord.x + cord.width / 2, cord.y + cord.height + 35, {
    steps: 8,
  });
  await page.mouse.up();
  assert.equal(await lamp.getAttribute("data-lamp-state"), "off");
  pass(
    "Lamp supports click, keyboard and a real pull gesture; sign-in does not load the WebGL bundle",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/signin");
    await page.locator(".signin-form-card").waitFor();
    await noOverflow();
    await page.getByRole("button", { name: "Turn the desk light off" }).click();
    await noOverflow();
    await page.screenshot({
      path: out + `/lamp-off-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Turn the desk light on" }).click();
    await page.screenshot({
      path: out + `/lamp-on-${width}.png`,
      fullPage: true,
    });
  }
  pass(
    "Both lamp states fit 320,390,768 and1440 pixels; sign-in controls remain available with the light off",
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(base + "/login");
  await page.getByRole("heading", { name: "Come on in." }).waitFor();
  assert.match(page.url(), /\/signin$/);
  await page.getByRole("button", { name: "Explore as a guest" }).click();
  await page
    .getByRole("link", { name: "Open CASE-004", exact: true })
    .waitFor();
  assert.equal(await page.locator(".case-library-card").count(), 4);
  await page.goto(base + "/signin");
  await page
    .getByText("Already investigating as a guest?", { exact: false })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Export guest work first" })
      .getAttribute("href"),
    "/case/CASE-001/brief",
  );
  pass(
    "Legacy login URL redirects; guest entry creates a separate workspace and sign-in offers a guest export link",
  );
  failCheck = true;
  await page.reload();
  await page.getByRole("alert").waitFor();
  configured = true;
  await page.getByRole("button", { name: "Retry session check" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".signin-github:not(.signin-google)")?.getAttribute("href") ===
      "/oauth2/authorization/github",
  );
  pass(
    "Unavailable session check can recover; configured sign-in points only to the server OAuth endpoint",
  );
  account = true;
  await page.goto(base + "/account");
  await page
    .getByRole("heading", { name: "Your context. Your little corner." })
    .waitFor();
  assert.match(
    await page.locator(".account-identity").innerText(),
    /<script>window.pwned=true<\/script>/,
  );
  assert.equal(await page.evaluate(() => window.pwned), undefined);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow();
  }
  await page.screenshot({ path: out + "/account-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByText("You’re signed out. Your saved workspace stays kept.")
    .waitFor();
  assert.equal(logoutCalls, 1);
  await page.goto(base + "/account");
  await page.getByRole("heading", { name: "Come on in." }).waitFor();
  assert.match(page.url(), /\/signin$/);
  pass(
    "Account view escapes profile text; CSRF-protected logout clears UI identity and anonymous account routes return to sign-in",
  );
  googleConfigured = true;
  configured = false;
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".signin-google")?.getAttribute("href") === "/oauth2/authorization/google");
  assert.equal(await page.locator(".signin-github:not(.signin-google)").getAttribute("href"), null);
  const entryOrder = await page.locator(".signin-guest, .signin-google").evaluateAll((els) => els.map((el) => el.classList.contains("signin-guest") ? "guest" : "google"));
  assert.deepEqual(entryOrder, ["guest", "google"]);
  profile.provider = "google";
  account = true;
  await page.goto(base + "/account");
  await page.getByText("Google sign-in", { exact: false }).waitFor();
  assert.equal(await page.getByText("Your password stays with Google", { exact: true }).count(), 1);
  assert.equal(await page.locator(".account-identity").getByText(/@lamp-user/).count(), 0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByText("You’re signed out. Your saved workspace stays kept.").waitFor();
  assert.equal(logoutCalls, 2);
  pass("Guest entry remains first; Google can be enabled independently and account UI identifies the correct provider without a GitHub handle");
  await page.goto(base + "/signin?error=signin_failed");
  await page.getByRole("alert").waitFor();
  assert.match(
    await page.getByRole("alert").innerText(),
    /Sign-in didn’t finish/,
  );
  assert.deepEqual(errors, []);
  pass(
    "Cancelled/failed sign-in has a recovery message; no uncaught browser errors",
  );
  await writeFile(
    out + "/results.json",
    JSON.stringify(
      {
        count: passes.length,
        passed: passes,
        errors,
        api: "Mocked auth and workspace responses. Real security/OAuth isolation is tested separately with Spring filters and a local provider.",
      },
      null,
      2,
    ),
  );
} catch (e) {
  await page.screenshot({ path: out + "/failure.png", fullPage: true });
  throw e;
} finally {
  await browser.close();
}
