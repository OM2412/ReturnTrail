import test from 'node:test';
import assert from 'node:assert/strict';
import {exchangeAuthorizationCode} from '../src/oauthExchange.js';

const base={provider:'GITHUB',code:'valid_code',pkceVerifier:'a'.repeat(43),
  clientId:'client-id',clientSecret:'test-secret',redirectUri:'https://example.test/oauth/callback',nonce:'test-nonce'};

test('GitHub code exchange validates identity at GitHub and does not return access token',async()=>{
  const urls=[];
  const identity=await exchangeAuthorizationCode({...base,fetcher:async(url,options)=>{
    urls.push(url);
    if (urls.length===1) {
      assert.equal(options.method,'POST');
      assert.equal(options.redirect,'manual');
      const params=new URLSearchParams(options.body);
      assert.equal(params.get('code_verifier'),base.pkceVerifier);
      assert.equal(params.get('client_secret'),'test-secret');
      return {ok:true,json:async()=>({access_token:'provider-secret'})};
    }
    assert.equal(options.headers.Authorization,'Bearer provider-secret');
    return {ok:true,json:async()=>({id:432,login:'om'})};
  }});
  assert.deepEqual(urls,['https://github.com/login/oauth/access_token','https://api.github.com/user']);
  assert.deepEqual(identity,{provider:'GITHUB',subject:'432',email:null,emailVerified:false,login:'om'});
  assert.equal('access_token' in identity,false);
});

test('provider failures and untrusted callback parameters fail closed',async()=>{
  await assert.rejects(()=>exchangeAuthorizationCode({...base,code:'bad code'}),/Invalid OAuth/);
  await assert.rejects(()=>exchangeAuthorizationCode({...base,redirectUri:'http://example.test'}),/Invalid OAuth/);
  await assert.rejects(()=>exchangeAuthorizationCode({...base,fetcher:async()=>({ok:false})}),/exchange failed/);
  await assert.rejects(()=>exchangeAuthorizationCode({...base,fetcher:async()=>({ok:false,status:302})}),/exchange failed/);
  await assert.rejects(()=>exchangeAuthorizationCode({...base,fetcher:async()=>({ok:true,json:async()=>({error:'bad_verification_code'})})}),/rejected/);
  await assert.rejects(()=>exchangeAuthorizationCode({...base,fetcher:async()=>({ok:true,json:async()=>({})})}),/Missing GitHub/);
});
