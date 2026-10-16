import { Link } from 'react-router'
import { ArrowRight, FileText, GitBranch } from 'lucide-react'
import { useCase } from '../app/CaseContext'
import { EvidenceQuote, PageTitle, SourceNote } from '../components/UI'
export default function Overview() {
  const { data } = useCase()
  return <><PageTitle label={`YOUR RETURN DESK / ${data.caseId}`} title="Okay, let’s unpack this." description="Read the original records and compare the different explanations."><Link className="button primary" to="/case/evidence"><FileText size={18}/>Read the evidence</Link></PageTitle>
    <div className="metric-grid"><article className="metric-card tone-peach"><div><span>Original records</span><FileText size={20}/></div><strong>{String(data.evidence.length).padStart(2, '0')}</strong><small>The statements we can read</small></article><article className="metric-card tone-lilac"><div><span>Disagreements found</span><GitBranch size={20}/></div><strong>{String(data.findings.length).padStart(2, '0')}</strong><small>Preserved in the original history</small></article></div>
    <section className="panel source-panel"><div className="panel-title"><h2>Here’s what the records say.</h2></div><div className="quote-grid">{data.evidence.map((row) => <EvidenceQuote key={row.evidenceId} row={row}/>)}</div><SourceNote>A recorded claim does not independently verify the explanation or establish fault.</SourceNote></section>
    <div className="page-next"><span>Explore which records belong to the same pickup.</span><Link className="text-link" to="/case/graph">View connections <ArrowRight size={17}/></Link></div>
  </>
}
