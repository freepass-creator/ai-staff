import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApprovedMap, approvedUrl} from './current-gate.mjs';

const sha = 'a'.repeat(64);
const fixed = {id:'cover-confident',sha256:sha,revision:sha,url:'/api/characters/assets/cover-confident'};
const snapshot = {schema:'ai-staff/current-api/v1',revision:'batch-v1',assets:[fixed]};

test('only an exact current ID and SHA can produce an approved PNG URL', () => {
  const approved = buildApprovedMap(snapshot);
  assert.equal(approved.size, 1);
  assert.equal(approvedUrl({id:fixed.id,png_sha256:sha},approved,'https://example.test'),
    'https://example.test/api/characters/assets/cover-confident?revision='+sha);
  assert.equal(approvedUrl({id:fixed.id,png_sha256:'b'.repeat(64)},approved,'https://example.test'),null);
  assert.equal(approvedUrl({id:'retired-asset',png_sha256:sha},approved,'https://example.test'),null);
  assert.equal(approvedUrl({id:fixed.id,png_sha256:sha},new Map(),'https://example.test'),null);
});

test('bad, empty, or spoofed current API snapshots fail closed', () => {
  for (const bad of [
    null,
    {schema:'old-api',revision:'batch-v1',assets:[fixed]},
    {schema:snapshot.schema,revision:'',assets:[fixed]},
    {schema:snapshot.schema,revision:'batch-v1',assets:[]},
    {schema:snapshot.schema,revision:'batch-v1',assets:[{...fixed,sha256:'wrong'}]},
    {schema:snapshot.schema,revision:'batch-v1',assets:[{...fixed,revision:'old'}]},
    {schema:snapshot.schema,revision:'batch-v1',assets:[{...fixed,url:'https://other.example/image.png'}]},
    {schema:snapshot.schema,revision:'batch-v1',assets:[{...fixed,url:'/api/characters/assets/other'}]},
    {schema:snapshot.schema,revision:'batch-v1',assets:[fixed,fixed]}
  ]) assert.throws(() => buildApprovedMap(bad));
});

test('production download URL always carries the verified revision and same-origin route', () => {
  const map=buildApprovedMap(snapshot);
  const url=approvedUrl({id:fixed.id,png_sha256:sha},map,'https://preview.vercel.app/subpage/');
  assert.equal(new URL(url).origin,'https://preview.vercel.app');
  assert.equal(new URL(url).pathname,fixed.url);
  assert.equal(new URL(url).searchParams.get('revision'),sha);
});
