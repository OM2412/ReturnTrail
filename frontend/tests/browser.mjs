import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

let chromium
try { ({ chromium } = await import('playwright')) }
catch {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw new Error('Install playwright to run browser tests.')
  const runtimeRequire = createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/package.json`)
  ;({ chromium } = runtimeRequire('playwright'))
}
const base = process.env.APP_URL || 'http://127.0.0.1:5174'
const out = path.resolve(import.meta.dirname, 'qa')
await mkdir(out, { recursive: true })
const launchOptions = { headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }
if (process.env.CHROMIUM_MODULE) {
  const portable = (await import(process.env.CHROMIUM_MODULE)).default
  launchOptions.executablePath = await portable.executablePath()
  launchOptions.args = [...portable.args, '--enable-unsafe-swiftshader']
}
const browser = await chromium.launch(launchOptions)
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
const sessions = new Map()
let counter = 0, creations = 0, investigations = 0, limited = false
const errors = [], passes = []
const findingId = '99e92762-31ed-3f4c-9265-8fab0a287363'
const revision = 'a'.repeat(64)
const actionId = `FOLLOWUP-${findingId}-${revision.slice(0,16)}`
const evidence = [
  { caseId: 'CASE-001', pickupId: 'PICKUP-001', evidenceId: 'DOC-001', claimedStatus: 'CUSTOMER_CANCELLED', statement: 'Pickup cancelled by customer.' },
  { caseId: 'CASE-001', pickupId: 'PICKUP-001', evidenceId: 'DOC-002', claimedStatus: 'COURIER_UNAVAILABLE', statement: 'Pickup failed because the courier was unavailable.' },
]
const finding = { findingId, evidenceRevision:revision, caseId: 'CASE-001', pickupId: 'PICKUP-001', type: 'PICKUP_REASON_DISAGREEMENT', status: 'REQUIRES_CLARIFICATION', summary: 'Records give different reasons for the same pickup failure.', questionToAsk: 'Please confirm why pickup PICKUP-001 failed and explain the conflicting recorded reasons.', evidence }
const caseInfo = { caseId: 'CASE-001', title: 'Pickup cancellation disagreement', scenario: 'PICKUP_DISAGREEMENT', description: 'Two records, one pickup.', lesson: 'Compare the same attempt.' }
const nodes = [['Case','CASE-001'],['Order','ORDER-001'],['Item','ITEM-001'],['ReturnRequest','RETURN-001'],['PickupAttempt','PICKUP-001'],['SupportStatement','STATEMENT-001'],['EvidenceDocument','DOC-001'],['SupportStatement','STATEMENT-002'],['EvidenceDocument','DOC-002']].map(([label,id])=>({key:`${label}:${id}`,label,id}))
const edges = [
 ['Case:CASE-001','HAS_ORDER','Order:ORDER-001'],['Order:ORDER-001','CONTAINS','Item:ITEM-001'],['Case:CASE-001','HAS_RETURN','ReturnRequest:RETURN-001'],['ReturnRequest:RETURN-001','RETURNS','Item:ITEM-001'],['PickupAttempt:PICKUP-001','ATTEMPTS','ReturnRequest:RETURN-001'],
 ...['001','002'].flatMap(id=>[[`SupportStatement:STATEMENT-${id}`,'ABOUT','PickupAttempt:PICKUP-001'],[`SupportStatement:STATEMENT-${id}`,'RECORDED_IN',`EvidenceDocument:DOC-${id}`]])
].map(([source,type,target])=>({key:`${source}|${type}|${target}`,source,type,target}))
const graph = {caseId:'CASE-001',source:'FALKORDB_QUERY_PATHS',evidence,nodes,edges,paths:['001','002'].map(id=>({evidenceId:`DOC-${id}`,statementId:`STATEMENT-${id}`,pickupId:'PICKUP-001',sourceType:'SYNTHETIC',nodeKeys:nodes.filter(n=>!['SupportStatement','EvidenceDocument'].includes(n.label)||n.id.endsWith(id)).map(n=>n.key),edgeKeys:edges.filter(e=>!e.source.startsWith('SupportStatement:')||e.source.endsWith(id)).map(e=>e.key)}))}
await context.route('**/api/**', async (route) => {
  const request = route.request(), url = new URL(request.url()), method = request.method()
  const token = (request.headers().cookie || '').match(/RTSESSION=([^;]+)/)?.[1]
  let state = sessions.get(token)
  const send = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: status === 204 ? '' : JSON.stringify(data) })
  if(url.pathname==='/api/auth/session')return send({authenticated:false,githubConfigured:false,workspaceMode:state?'GUEST':'NONE',profile:null})
  if(url.pathname==='/api/auth/csrf')return send({headerName:'X-CSRF-TOKEN',token:'browser-test-csrf'})
  if (url.pathname === '/api/guest-sessions' && method === 'POST') {
    if (state) return send({ status: 'READY', caseId: 'CASE-001', synthetic: true, initializedNow: false })
    const id = `guest-${++counter}`; creations++
    state = { actions: [], clarifications: [] }; sessions.set(id, state)
    return send({ status: 'READY', caseId: 'CASE-001', synthetic: true, initializedNow: true }, 200, { 'set-cookie': `RTSESSION=${id}; Path=/; HttpOnly; SameSite=Strict` })
  }
  if (url.pathname === '/api/guest-sessions' && method === 'DELETE') { sessions.delete(token); return send(null, 204) }
  if (!state) return send({ error: 'Create a guest session first.' }, 401)
  const leaf = url.pathname.split('/').at(-1)
  if (url.pathname === '/api/cases') return send({ synthetic:true, count:1, cases:[caseInfo] })
  if (leaf === 'snapshot') return send({ caseId:'CASE-001', synthetic:true, evidenceVersion:0, workflowVersion:0, changes:{latestEvidenceIds:[],earlierTaskIds:[]}, caseInfo, assessment:state.clarifications.length ? 'FOLLOWUP_RECORDED':'NEEDS_CLARIFICATION', evidence, findings:[finding], pendingFindings:state.clarifications.length ? []:[finding], actions:state.actions, clarifications:state.clarifications, graph })

  if (leaf === 'evidence') return send({ caseId: 'CASE-001', source: 'FALKORDB', synthetic: true, count: evidence.length, evidence })
  if (leaf === 'findings') return send({ caseId: 'CASE-001', count: 1, findings: [finding] })
  if (leaf === 'actions') return send({ caseId: 'CASE-001', count: state.actions.length, actions: state.actions })
  if (leaf === 'clarifications') return send({ caseId: 'CASE-001', count: state.clarifications.length, clarifications: state.clarifications })
  if (leaf === 'clarification' && method === 'POST') {
    const body = request.postDataJSON()
    assert.equal(body.actionId, actionId)
    if (!state.clarifications.length) state.clarifications.push({ actionId, findingId, status: 'RESOLVED', evidenceRevision:revision, outcome:'EXPLANATION_PROVIDED', clarificationId: `CLARIFICATION-${actionId}`, note: body.note, source: 'MANUAL_SYNTHETIC_CLARIFICATION', recordedAt: '2026-10-16T02:00:00Z' })
    state.actions[0].status = 'RESOLVED'
    return send(state.clarifications[0])
  }
  if (leaf === 'investigate' && method === 'POST') {
    investigations++
    if (limited) return send({ error: 'Rate limited' }, 429, { 'retry-after': '300' })
    await new Promise((resolve) => setTimeout(resolve, 350))
    const resolved = state.clarifications.length > 0
    if (!resolved && !state.actions.length) state.actions.push({ actionId, findingId, evidenceRevision:revision, evidenceIds:['DOC-001','DOC-002'], pickupId:'PICKUP-001', status: 'OPEN', question: finding.questionToAsk, createdAt: '2026-10-16T01:00:00Z' })
    const trace = [
      { tool: 'get_case_evidence', resultCount: 2, evidenceIds: ['DOC-001', 'DOC-002'], actionIds: [] },
      { tool: 'get_case_clarifications', resultCount: state.clarifications.length, evidenceIds: ['DOC-001', 'DOC-002'], actionIds: resolved ? [actionId] : [] },
      { tool: 'get_case_findings', resultCount: resolved ? 0 : 1, evidenceIds: ['DOC-001', 'DOC-002'], actionIds: [] },
    ]
    if (!resolved) trace.push({ tool: 'prepare_followup_action', resultCount: 1, evidenceIds: ['DOC-001', 'DOC-002'], actionIds: [actionId] })
    return send({ caseId: 'CASE-001', synthetic: true, method: 'AI_TOOL_CALLING', summaryMethod: 'DETERMINISTIC_FROM_TOOL_RESULTS', model: 'openai/gpt-oss-120b', modelRequests: resolved ? 3 : 4, summary: `Original evidence: DOC-001, DOC-002.\nHistorical disagreements: 1.\nPending follow-up findings: ${resolved ? 0 : 1}.\n${resolved ? 'Manual clarification is not independently verified. Task status: RESOLVED.' : `Task ${actionId}; status: OPEN.`}`, toolTrace: trace, evidence, findings: [finding], pendingFindings: resolved ? [] : [finding], actions: resolved ? [] : state.actions, clarifications: state.clarifications })
  }
  return send({ error: 'Unknown mock endpoint' }, 404)
})

await context.addInitScript(() => {
  window.sceneDraws = 0
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original=type.prototype[name]
      if (original) type.prototype[name]=function(...args){ window.sceneDraws++; return original.apply(this,args) }
    }
  }
})
const page = await context.newPage()
page.on('pageerror', (error) => errors.push(error.message))
async function nav(label) { await page.getByRole('navigation', { name: 'Workspace navigation', exact: true }).getByRole('link', { name: label, exact: true }).click(); if(label==='Connections') await page.getByRole('button',{name:'3D story',exact:true}).click() }
async function pass(name) { passes.push(name); console.log(`PASS ${name}`) }
async function noOverflow() { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true) }
try {
  await page.goto(base)
  await page.getByRole('heading', { name: /Return drama/ }).waitFor()
  await page.locator('.scene-records').getByRole('button', { name: /DOC-002/ }).click()
  assert.match(await page.locator('.scene-records button.selected').innerText(), /DOC-002/)
  await page.screenshot({ path: `${out}/landing-desktop.png`, fullPage: true })
  await pass('Landing document selection updates the indicator')
  await page.getByRole('button', { name: /Explore the demo case/ }).click()
  await page.getByRole('link', { name:'Open CASE-001',exact:true }).click()
  await page.getByRole('heading', { name: 'Okay, let’s unpack this.', exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/case/CASE-001')
  assert.equal(creations, 1)
  await page.screenshot({ path: `${out}/overview-desktop.png`, fullPage: true })
  await noOverflow(); await pass('CTA opens a dedicated overview with one isolated session')

  await nav('Evidence')
  await page.getByRole('heading', { name: 'Original words. The whole paper trail.' }).waitFor()
  await page.getByRole('button', { name: /DOC-002 Courier unavailable/ }).click()
  assert.match(page.url(), /doc=DOC-002/)
  await page.getByRole('button', { name: /Compare pickup claims/ }).click()
  await page.getByRole('heading', { name: 'Compare the records for this attempt.' }).waitFor()
  await page.screenshot({ path: `${out}/evidence-desktop.png`, fullPage: true })
  await pass('Dedicated evidence reader, URL selection and shared-pickup comparison')
  await page.reload()
  await page.getByRole('heading', { name: 'Original words. The whole paper trail.' }).waitFor()
  assert.match(page.url(), /doc=DOC-002/); assert.equal(creations, 1)
  await pass('Deep-link refresh preserves session and selected source')
  await page.goBack(); await page.goForward()
  await page.getByRole('heading', { name: 'Original words. The whole paper trail.' }).waitFor()
  await pass('Browser Back/Forward preserves route navigation')

  await nav('Connections')
  await page.getByRole('heading', { name: 'Follow the links. Find the context.' }).waitFor()
  await page.locator('.scene-records').getByRole('button', { name: /DOC-002/ }).click()
  await page.locator('.graph-inspector blockquote').filter({ hasText: evidence[1].statement }).waitFor()
  assert.equal(await page.locator('.graph-inspector blockquote').innerText(), evidence[1].statement)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/graph-desktop.png`, fullPage: true })
  await pass('Connections selection synchronizes URL and actual source inspector')

  await nav('Investigation')
  await page.getByRole('button', { name: 'Run investigation', exact: true }).waitFor()
  assert.equal(investigations, 0)
  await page.getByRole('button', { name: 'Run investigation', exact: true }).click()
  await page.getByRole('status').waitFor()
  await page.locator('.result-verdict').waitFor()
  await page.locator('.technical-details>summary').click()
  await page.locator('.grounded-summary').waitFor()
  assert.equal(investigations, 1)
  assert.match(await page.locator('.grounded-summary').innerText(), /Pending follow-up findings: 1/)
  assert.equal(await page.locator('.tool-trace>li').count(), 4)
  await page.locator('.technical-details>summary').click()
  await page.screenshot({ path: `${out}/investigation-desktop.png`, fullPage: true })
  await pass('AI runs only on click, then shows grounded summary and returned tool trace')

  await nav('Follow-up tasks')
  await page.getByLabel('Add the explanation you received').fill('Synthetic manual clarification: courier unavailable. Not independently verified. <script>alert(1)</script>')
  await page.getByRole('radio', { name: /An explanation was provided/ }).check()
  await page.getByRole('button', { name: /Save explanation & resolve task/ }).click()
  await page.getByText('Manual explanation recorded', { exact: true }).waitFor()
  assert.match(await page.locator('.clarification-note').innerText(), /<script>alert\(1\)<\/script>/)
  assert.equal(await page.locator('.clarification-form').count(), 0)
  await page.screenshot({ path: `${out}/tasks-resolved-desktop.png`, fullPage: true })
  await pass('Clarification resolves task, refreshes state and safely renders note text')
  await page.getByText('Task reference', { exact: true }).click()
  await page.getByRole('button', { name: 'Copy Task reference', exact: true }).click()
  await page.getByText('Copied', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), actionId)
  await pass('Task references expand on demand and copy the exact saved ID')
  await page.reload()
  await page.getByText('Manual explanation recorded', { exact: true }).waitFor()
  assert.equal(creations, 1)
  assert.equal(await page.locator('.clarification-form').count(), 0)
  await pass('Page refresh preserves the resolved task and manual reply without creating another guest')

  await nav('Case history')
  await page.locator('.history-timeline>li').first().waitFor()
  assert.equal(await page.locator('.history-timeline>li').count(), 2)
  await page.screenshot({ path: `${out}/history-desktop.png`, fullPage: true })
  await pass('History contains only saved task and clarification events')
  await nav('Investigation')
  assert.equal(await page.locator('.grounded-summary').count(), 0)
  await page.getByRole('button', { name: 'Run investigation', exact: true }).click()
  await page.locator('.result-verdict').waitFor()
  await page.locator('.technical-details>summary').click()
  await page.locator('.grounded-summary').waitFor()
  assert.match(await page.locator('.grounded-summary').innerText(), /Pending follow-up findings: 0/)
  assert.equal(await page.locator('.tool-trace>li').count(), 3)
  await pass('Old result is invalidated after clarification; re-investigation uses resolved context')

  await page.setViewportSize({ width: 390, height: 844 })
  for (const [label, slug, title] of [['Overview','overview','Okay, let’s unpack this.'],['Evidence','evidence','Original words. The whole paper trail.'],['Connections','graph','Follow the links. Find the context.'],['Investigation','investigation','A clearer story starts here.'],['Follow-up tasks','tasks','Give the missing context a home.'],['Case history','history','Receipts? Kept.']]) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('navigation', { name: 'Mobile workspace navigation' }).getByRole('link', { name: label, exact: true }).click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(200)
    await noOverflow()
    await page.screenshot({ path: `${out}/${slug}-mobile.png`, fullPage: true })
  }
  await pass('All six workspace routes fit at 390px, including resolved task and history')
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [label, title] of [['Overview','Okay, let’s unpack this.'],['Evidence','Original words. The whole paper trail.'],['Connections','Follow the links. Find the context.'],['Investigation','A clearer story starts here.'],['Follow-up tasks','Give the missing context a home.'],['Case history','Receipts? Kept.']]) {
      if (width <= 800) {
        await page.getByRole('button', { name: 'Open navigation' }).click()
        await page.getByRole('navigation', { name: 'Mobile workspace navigation' }).getByRole('link', { name: label, exact: true }).click()
      } else await nav(label)
      await page.getByRole('heading', { name: title, exact: true }).waitFor()
      await noOverflow()
    }
  }
  await pass('All six routes also fit at 320px, 768px and 1024px')

  await page.setViewportSize({ width: 1440, height: 1000 })
  await nav('Investigation')
  limited = true
  await page.getByRole('button', { name: 'Run investigation again' }).click()
  await page.getByRole('alert').waitFor()
  assert.match(await page.getByRole('alert').innerText(), /request limit/)
  assert.match(await page.getByRole('alert').innerText(), /5 minutes/)
  limited = false
  await pass('429 response is visible and never silently retried')

  const beforeExpiry = creations
  sessions.clear()
  await page.getByRole('button', { name: 'Refresh case data' }).click()
  await page.getByRole('heading', { name: 'Your demo session has ended.' }).waitFor()
  assert.equal(creations, beforeExpiry)
  await page.getByRole('button', { name: 'Open demo case', exact: true }).click()
  await page.getByRole('heading', { name: 'A clearer story starts here.' }).waitFor()
  assert.equal(creations, beforeExpiry + 1)
  await pass('Expired session clears old data and requires explicit recovery')

  await nav('Overview')
  await page.getByRole('button', { name: 'Start fresh demo', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Keep this case' }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  await pass('Reset dialog supports cancellation without deleting session')

  await page.setViewportSize({ width: 390, height: 844 })
  await noOverflow()
  await page.screenshot({ path: `${out}/overview-mobile.png`, fullPage: true })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('navigation', { name: 'Mobile workspace navigation' }).getByRole('link', { name: 'Evidence', exact: true }).click()
  await page.getByRole('heading', { name: 'Original words. The whole paper trail.' }).waitFor()
  await noOverflow()
  await page.screenshot({ path: `${out}/evidence-mobile.png`, fullPage: true })
  await pass('390px mobile navigation and evidence layout have no horizontal overflow')

  await page.goto(`${base}/does-not-exist`)
  await page.getByRole('heading', { name: 'That trail ends here.' }).waitFor()
  await pass('Unknown routes show a useful recovery page')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(base)
  await page.getByRole('heading', { name: /Return drama/ }).waitFor()
  await page.locator('.parcel-experience').scrollIntoViewIfNeeded()
  await page.locator('.parcel-viewport canvas').waitFor()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/unboxing-early.png`, fullPage: false })
  await page.getByText('Connected. But the stories disagree.', { exact: true }).waitFor({ timeout: 45000 })
  await page.screenshot({ path: `${out}/unboxing-complete.png`, fullPage: false })
  assert.equal(await page.locator('.parcel-experience').getAttribute('data-scene-state'), 'idle')
  await page.waitForTimeout(1500)
  const draws = await page.evaluate(() => window.sceneDraws)
  assert.ok(draws > 0, 'WebGL actually rendered')
  await page.waitForTimeout(1000)
  assert.equal(await page.evaluate(() => window.sceneDraws), draws, 'Completed scene must stop continuous WebGL drawing')
  await page.getByRole('button', { name: 'Replay unboxing animation' }).click()
  await page.getByRole('button', { name: 'Pause scene animation' }).click()
  await page.getByRole('button', { name: 'Play scene animation' }).waitFor()
  await page.getByRole('button', { name: 'Replay unboxing animation' }).click()
  await page.getByText('A return, still in its box.', { exact: true }).waitFor()
  await pass('Real WebGL unboxing advances to connections and supports pause/replay')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(base)
  assert.equal(await page.getByRole('button', { name: 'Replay unboxing animation' }).count(), 0)
  await page.getByText('Reduced motion: showing the complete scene.').waitFor()
  await pass('Reduced motion shows all evidence without automatic movement')
  await noOverflow()
  await page.screenshot({ path: `${out}/landing-mobile.png`, fullPage: true })
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (String(type).startsWith('webgl') || type === 'experimental-webgl') return null
      return getContext.call(this, type, ...args)
    }
  })
  await page.goto(base)
  await page.getByText('Your evidence stays connected.', { exact: true }).waitFor()
  await page.getByRole('button', { name: /Explore the demo case/ }).click()
  await page.getByRole('link', { name:'Open CASE-001',exact:true }).click()
  await page.getByRole('heading', { name: 'Okay, let’s unpack this.', exact: true }).waitFor()
  await pass('WebGL-unavailable fallback preserves demo access')
  assert.deepEqual(errors, [])
  await pass('No uncaught browser JavaScript errors')
  await writeFile(`${out}/results.json`, JSON.stringify({ passed: passes, count: passes.length, errors, backend: 'Mocked matching the published backend contracts; no real Groq calls', viewport: '1440x1000, 390x844, 320x900, 768x900 and 1024x900' }, null, 2))
} finally { await browser.close() }
