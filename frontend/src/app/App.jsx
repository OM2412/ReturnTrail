import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import CaseShell from './CaseShell'
import { Spinner } from '../components/UI'
const Landing = lazy(() => import('../pages/Landing'))
const Overview = lazy(() => import('../pages/Overview'))
const Evidence = lazy(() => import('../pages/Evidence'))
const Graph = lazy(() => import('../pages/Graph'))
export default function App() {
  return <Suspense fallback={<div className="route-loading"><Spinner label="Opening your workspace..."/></div>}><Routes>
    <Route path="/" element={<Landing/>}/><Route path="/case" element={<CaseShell/>}><Route index element={<Overview/>}/><Route path="evidence" element={<Evidence/>}/><Route path="graph" element={<Graph/>}/></Route>
    <Route path="*" element={<main className="recovery"><h1>That trail ends here.</h1><Link className="button primary" to="/">Back to ReturnTrail</Link></main>}/>
  </Routes></Suspense>
}
