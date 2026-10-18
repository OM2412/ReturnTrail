import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vercelConfig } from '../configure-vercel.mjs';

test('proxy auth, callback and API before SPA fallback; preserve paths and disable private caching', () => {
  const config = vercelConfig('https://returntrail-fixture.onrender.com/');
  assert.deepEqual(config.rewrites.slice(0, 4).map(({source, destination}) => [source, destination]),
    ['/api', '/oauth2', '/login/oauth2', '/actuator/health'].map((prefix) =>
      [`${prefix}/:path*`, `https://returntrail-fixture.onrender.com${prefix}/:path*`]));
  assert.equal(config.rewrites.at(-1).destination, '/index.html');
  for (const route of config.headers) {
    assert.ok(route.headers.some(({key, value}) => key === 'Cache-Control' && value === 'private, no-store'));
    assert.ok(route.headers.some(({key, value}) => key === 'x-vercel-enable-rewrite-caching' && value === '0'));
  }
});

test('reject credentials, local servers, lookalike domains and URL suffixes before writing routing', () => {
  for (const input of [undefined, '', 'http://api.onrender.com', 'https://user:secret@api.onrender.com',
    'https://api.onrender.com/path', 'https://api.onrender.com?x=1', 'https://api.onrender.com#frag',
    'https://api.onrender.com:8443', 'https://api.onrender.com.evil.example', 'https://127.0.0.1',
    'https://api.onrender.com@evil.example']) {
    assert.throws(() => vercelConfig(input));
  }
});
