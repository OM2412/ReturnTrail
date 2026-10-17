import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from 'playwright'
const base=process.env.APP_URL||'http://127.0.0.1:5174',options={headless:true,args:['--no-sandbox']}
if(process.env.CHROMIUM_MODULE){const portable=(await import(process.env.CHROMIUM_MODULE)).default;options.executablePath=await portable.executablePath();options.args=portable.args}
const browser=await chromium.launch(options),context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await context.route('**/api/**',route=>{
 const u=new URL(route.request().url()),send=value=>route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
 if(u.pathname==='/api/auth/session')return send({authenticated:false,githubConfigured:true,workspaceMode:'GUEST',workspaceReference:'export-check',profile:null})
 const row={caseId:'CASE-004',title:'Guest case four',scenario:'SAVED_CLARIFICATION'}
 if(u.pathname==='/api/cases')return send({cases:[row]})
 if(u.pathname.endsWith('/snapshot'))return send({caseId:'CASE-004',caseInfo:row,evidence:[],actions:[],clarifications:[],findings:[],pendingFindings:[],graph:{paths:[],nodes:[],edges:[]},evidenceVersion:0,workflowVersion:0})
 return route.fulfill({status:404,body:'{}'})
})
try{
 await page.goto(base+'/case/CASE-004/evidence');await page.getByRole('heading',{name:'Original words. The whole paper trail.'}).waitFor()
 await page.getByRole('link',{name:'Sign in & save a workspace',exact:true}).click()
 await page.getByRole('heading',{name:'Come on in.'}).waitFor()
 assert.equal(await page.getByRole('link',{name:'Export guest work first'}).getAttribute('href'),'/case/CASE-004/brief')
 const out=path.resolve(import.meta.dirname,'qa/auth');await mkdir(out,{recursive:true});await writeFile(out+'/export-result.json',JSON.stringify({count:1,errors,passed:['Active guest case preserved in the sign-in export link']}));
 assert.deepEqual(errors,[]);console.log('PASS Sign-in guest export follows the active case instead of always linking CASE-001')
}finally{await browser.close()}
