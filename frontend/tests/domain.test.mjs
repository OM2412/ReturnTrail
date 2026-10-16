import test from 'node:test'
import assert from 'node:assert/strict'
import { pendingFindings, workflowEvents } from '../src/lib/domain.js'
import { api, ApiError } from '../src/lib/api.js'

test('resolution removes only its linked pending finding and preserves history', () => {
  const findings = [{ findingId: 'F1', status: 'REQUIRES_CLARIFICATION' }, { findingId: 'F2', status: 'REQUIRES_CLARIFICATION' }]
  const result = pendingFindings(findings, [{ findingId: 'F1', status: 'RESOLVED' }, { findingId: 'F2', status: 'OPEN' }])
  assert.deepEqual(result.map((row) => row.findingId), ['F2'])
  assert.equal(findings[0].status, 'REQUIRES_CLARIFICATION')
})

test('unrelated clarification cannot suppress a finding', () => {
  assert.equal(pendingFindings([{ findingId: 'F1' }], [{ findingId: 'OTHER', status: 'RESOLVED' }]).length, 1)
})

test('workflow events use saved timestamps and chronological order', () => {
  const events = workflowEvents([{ actionId: 'A1', question: 'Clarify', createdAt: '2026-10-16T01:00:00Z' }], [{ actionId: 'A1', clarificationId: 'N1', status: 'RESOLVED', note: 'Manual', recordedAt: '2026-10-16T02:00:00Z' }])
  assert.deepEqual(events.map((row) => row.kind), ['task', 'clarification'])
  assert.equal(events[0].at, '2026-10-16T01:00:00Z')
})

test('API sends same-origin credentials and never retries a failed write', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (_url, options) => { calls++; assert.equal(options.credentials, 'same-origin'); assert.equal(options.method, 'POST'); return new Response('{"error":"limited"}', { status: 429, headers: { 'Retry-After': '300' } }) }
  try {
    await assert.rejects(api.investigate(), (error) => error instanceof ApiError && error.status === 429 && error.retryAfter === '300')
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})

test('API handles empty 204 response for ending a session', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(null, { status: 204 })
  try { assert.equal(await api.endSession(), null) }
  finally { globalThis.fetch = original }
})

test('API preserves a session-expiry status without creating a new session', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return new Response('{"error":"expired"}', { status: 401 }) }
  try {
    await assert.rejects(api.evidence(), (error) => error instanceof ApiError && error.status === 401)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
