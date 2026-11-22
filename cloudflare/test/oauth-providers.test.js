import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleIdToken, verifyGithubAccessToken } from '../src/oauthProviders.js';

const b64=value=>Buffer.from(typeof value==='string' ? value:JSON.stringify(value)).toString('base64url');

test('Google ID token verifies RS256 and binds audience, nonce, issuer and expiry', async () => {
  const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
    publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);
  const jwks={keys:[{...jwk,kid:'test-key',alg:'RS256',use:'sig'}]};
  const now=Date.now();
  const claims={iss:'https://accounts.google.com',aud:'returntrail-test',nonce:'one-time-nonce',
    sub:'123456789',exp:Math.floor(now/1000)+600,iat:Math.floor(now/1000)-10,
    email:'sample@example.invalid',email_verified:true};
  async function token(c=claims,header={alg:'RS256',kid:'test-key',typ:'JWT'}) {
    const body=`${b64(header)}.${b64(c)}`;
    const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body));
    return `${body}.${Buffer.from(sig).toString('base64url')}`;
  }
  const valid=await token();
  assert.equal((await verifyGoogleIdToken(valid,{clientId:claims.aud,nonce:claims.nonce,jwks,now})).subject,claims.sub);
  for (const changed of [{aud:'attacker'}, {nonce:'replayed'}, {iss:'other'},
    {exp:Math.floor(now/1000)-1}, {iat:Math.floor(now/1000)+1000}]) {
    const forged=await token({...claims,...changed});
    await assert.rejects(()=>verifyGoogleIdToken(forged,{clientId:claims.aud,nonce:claims.nonce,jwks,now}));
  }
  await assert.rejects(()=>verifyGoogleIdToken(valid,{clientId:'other-app',nonce:claims.nonce,jwks,now}));
  await assert.rejects(()=>verifyGoogleIdToken(valid.slice(0,-2)+'xx',{clientId:claims.aud,nonce:claims.nonce,jwks,now}));
  const noneAlg=await token(claims,{alg:'none',kid:'test-key'});
  await assert.rejects(()=>verifyGoogleIdToken(noneAlg,{clientId:claims.aud,nonce:claims.nonce,jwks,now}));
});

test('GitHub identity comes from verified provider API, not supplied browser fields', async () => {
  let request;
  const identity=await verifyGithubAccessToken('test-secret',{fetcher:async (url,options)=>{
    request={url,options}; return {ok:true,json:async()=>({id:42,login:'omjadon',email:'unverified@example.com'})};
  }});
  assert.equal(request.url,'https://api.github.com/user');
  assert.equal(request.options.headers.Authorization,'Bearer test-secret');
  assert.deepEqual(identity,{provider:'GITHUB',subject:'42',email:null,emailVerified:false,login:'omjadon'});
  await assert.rejects(()=>verifyGithubAccessToken('bad',{fetcher:async()=>({ok:false})}));
  await assert.rejects(()=>verifyGithubAccessToken('bad',{fetcher:async()=>({ok:true,json:async()=>({id:'42'})})}));
});
