import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { api } from '../lib/api'

const CaseContext = createContext(null)
const initial = { phase: 'idle', data: null, error: null, working: null, run: null }

async function snapshot() {
  // A protected read establishes session validity. Never create a new session on refresh.
  const evidence = await api.evidence()
  const [findings, actions, clarifications] = await Promise.all([api.findings(), api.actions(), api.clarifications()])
  if (![evidence.evidence, findings.findings, actions.actions, clarifications.clarifications].every(Array.isArray)) {
    throw new Error('The case response was incomplete. Please refresh the case.')
  }
  return { caseId: evidence.caseId, evidence: evidence.evidence, findings: findings.findings, actions: actions.actions, clarifications: clarifications.clarifications }
}

export function CaseProvider({ children }) {
  const [state, setState] = useState(initial)
  const inFlight = useRef(null)

  const transact = useCallback((name, job) => {
    if (inFlight.current) return inFlight.current
    setState((old) => ({ ...old, working: name, error: null }))
    const promise = (async () => {
      try { await job(); return true }
      catch (error) {
        setState((old) => ({ ...old, phase: error.status === 401 ? 'expired' : 'error',
          data: error.status === 401 ? null : old.data,
          run: error.status === 401 ? null : old.run,
          error: { message: error.message || 'The request failed.', status: error.status, retryAfter: error.retryAfter } }))
        return false
      } finally { inFlight.current = null; setState((old) => ({ ...old, working: null })) }
    })()
    inFlight.current = promise
    return promise
  }, [])

  const refresh = useCallback(() => transact('refresh', async () => {
    const data = await snapshot()
    setState((old) => ({ ...old, phase: 'ready', data, error: null, run: null }))
  }), [transact])

  const start = useCallback(() => transact('start', async () => {
    const session = await api.createSession()
    if (session.initializedNow) setState((old) => ({ ...old, data: null, run: null }))
    const data = await snapshot()
    setState((old) => ({ ...old, phase: 'ready', data, error: null }))
  }), [transact])

  const reset = useCallback(() => transact('reset', async () => {
    await api.endSession()
    setState((old) => ({ ...old, data: null, run: null }))
    await api.createSession()
    const data = await snapshot()
    setState((old) => ({ ...old, phase: 'ready', data, error: null }))
  }), [transact])

  const investigate = useCallback(() => transact('investigate', async () => {
    const run = await api.investigate()
    if (!Array.isArray(run.toolTrace) || !Array.isArray(run.pendingFindings) || typeof run.summary !== 'string') {
      throw new Error('The investigation response was incomplete. Refresh the case before retrying.')
    }
    setState((old) => ({ ...old, run }))
    const data = await snapshot()
    setState((old) => ({ ...old, phase: 'ready', data, error: null }))
  }), [transact])

  const clarify = useCallback((actionId, note) => transact('clarify', async () => {
    await api.clarify(actionId, note.trim())
    // The previous investigation describes older context. Require an explicit new run.
    setState((old) => ({ ...old, run: null }))
    const data = await snapshot()
    setState((old) => ({ ...old, phase: 'ready', data, error: null }))
  }), [transact])

  return <CaseContext.Provider value={{ ...state, refresh, start, reset, investigate, clarify }}>{children}</CaseContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCase() {
  const value = useContext(CaseContext)
  if (!value) throw new Error('CaseProvider is required')
  return value
}
