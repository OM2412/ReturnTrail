import test from 'node:test';
import assert from 'node:assert/strict';
import {api,resetSessionCheck} from '../src/lib/api.js';

test('starting a guest session invalidates the pre-session CSRF token',async()=>{
  const original=globalThis.fetch;
  const observed=[];
  let tokenCount=0;
  globalThis.fetch=async(path,options={})=>{
    observed.push({path,token:options.headers?.['X-CSRF-TOKEN']});
    const body=path==='/api/auth/csrf'
      ? {headerName:'X-CSRF-TOKEN',token:++tokenCount===1?'bootstrap-token':'guest-token'}
      : path==='/api/guest-sessions'?{status:'READY'}
      : {caseId:'CASE-001'};
    return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
  };
  try {
    resetSessionCheck();
    await api.createSession();
    await api.investigate('CASE-001');
    assert.deepEqual(observed.map(x=>x.path),[
      '/api/auth/csrf','/api/guest-sessions','/api/auth/csrf','/api/cases/CASE-001/investigate']);
    assert.equal(observed[1].token,'bootstrap-token');
    assert.equal(observed[3].token,'guest-token');
  }finally{globalThis.fetch=original;resetSessionCheck();}
});
