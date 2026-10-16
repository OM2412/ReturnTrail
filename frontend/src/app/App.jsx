import { lazy, Suspense } from 'react'
import { Link, Route, Routes, useSearchParams } from 'react-router'
import CaseShell from './CaseShell'
import { useCase } from './CaseContext'
import { PageTitle, SourceNote, Spinner } from '../components/UI'
const Landing = lazy(() => import('../pages/Landing'))
const Graph = lazy(() => import('../pages/Graph'))

function CaseReader() {
  const { data } = useCase()
  const [params] = useSearchParams()
  return <><PageTitle label="THE ORIGINAL WORDS" title="Your return records." description="Read both explanations, then explore how they connect."/>
    <div className="quote-grid">{data.evidence.map((row) => <article key={row.evidenceId} className={`quote-card claim-${row.claimedStatus.toLowerCase()}`} style={params.get('doc') === row.evidenceId ? { outline: '3px solid #6c3eb4' } : undefined}><code>{row.evidenceId}</code><blockquote>{row.statement}</blockquote><code>{row.pickupId}</code></article>)}</div>
    <SourceNote>These are recorded claims, not independently verified explanations.</SourceNote><Link className="button primary" to="/case/graph" style={{ marginTop: 24 }}>Explore connections</Link>
  </>
}
export default function App() {
  return <Suspense fallback={<div className="route-loading"><Spinner label="Opening your workspace..."/></div>}><Routes>
    <Route path="/" element={<Landing/>}/><Route path="/case" element={<CaseShell/>}><Route index element={<CaseReader/>}/><Route path="graph" element={<Graph/>}/></Route>
    <Route path="*" element={<main className="recovery"><h1>That trail ends here.</h1><Link className="button primary" to="/">Back to ReturnTrail</Link></main>}/>
  </Routes></Suspense>
}
