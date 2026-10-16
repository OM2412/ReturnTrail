import { useSearchParams } from 'react-router'
import { Brand, ErrorNotice, PageTitle, SourceNote, Spinner } from '../components/UI'
import { useCase } from './CaseContext'

export default function App() {
  const { data, error, working, start, refresh } = useCase()
  const [params] = useSearchParams()
  return <main className="recovery"><Brand/><section className="recovery-card">
    <PageTitle label="RETURNTRAIL / PRACTICE CASE" title="Your return desk." description="Open a made-up case and read the pickup records exactly as they were saved."/>
    <ErrorNotice error={error}/>
    <button className="button primary" disabled={!!working} onClick={() => void (data ? refresh() : start())}>{working ? <Spinner label="Opening the records..."/> : data ? 'Refresh records' : 'Open demo case'}</button>
    {data && <><div className="quote-grid" style={{ marginTop: 24 }}>{data.evidence.map((row) => <article key={row.evidenceId} className={`quote-card claim-${row.claimedStatus.toLowerCase()}`} style={params.get('doc') === row.evidenceId ? { outline: '3px solid #6c3eb4' } : undefined}><code>{row.evidenceId}</code><blockquote>{row.statement}</blockquote><code>{row.pickupId}</code></article>)}</div><SourceNote>These are original recorded claims. Their presence does not independently verify the explanation.</SourceNote></>}
  </section></main>
}
