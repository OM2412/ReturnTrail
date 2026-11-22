import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const preview = JSON.parse(readFileSync(new URL('../wrangler.preview.jsonc', import.meta.url), 'utf8'));

test('preview hosts the SPA and API on the same origin for secure guest cookies', () => {
  assert.equal(preview.name, 'returntrail-preview-api');
  assert.equal(preview.assets.directory, '../frontend/dist');
  assert.equal(preview.assets.not_found_handling, 'single-page-application');
  assert.deepEqual(preview.assets.run_worker_first, ['/api/*']);
  assert.equal(preview.assets.binding, 'ASSETS');
  assert.equal(preview.d1_databases[0].database_name, 'returntrail-preview');
  assert.equal(preview.d1_databases[0].binding, 'DB');
});
