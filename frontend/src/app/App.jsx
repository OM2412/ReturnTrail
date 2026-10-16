import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router'
import CaseShell from './CaseShell'
import { Spinner } from '../components/UI'
const Landing = lazy(() => import('../pages/Landing'))
const Overview = lazy(() => import('../pages/Overview'))
const Evidence = lazy(() => import('../pages/Evidence'))
const Investigation = lazy(() => import('../pages/Investigation'))
const Tasks = lazy(() => import('../pages/Tasks'))
const History = lazy(() => import('../pages/History'))
const Graph = lazy(() => import('../pages/Graph'))

function RouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const name = pathname.split('/').filter(Boolean).at(-1) || 'Home'
    document.title = `${name === 'case' ? 'Case overview' : name[0].toUpperCase() + name.slice(1)} | ReturnTrail`
    document.querySelector('[data-route-heading]')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}
export default function App() {
  return <><RouteEffects/><Suspense fallback={<div className="route-loading"><Spinner label="Opening workspace..."/></div>}><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/case" element={<CaseShell/>}>
      <Route index element={<Overview/>}/>
      <Route path="evidence" element={<Evidence/>}/>
      <Route path="graph" element={<Graph/>}/>
      <Route path="investigation" element={<Investigation/>}/>
      <Route path="tasks" element={<Tasks/>}/>
      <Route path="history" element={<History/>}/>
    </Route>
    <Route path="*" element={<main className="recovery"><h1>That trail ends here.</h1><p>This page could not be found.</p><Link className="button primary" to="/">Back to ReturnTrail</Link></main>}/>
  </Routes></Suspense></>
}
