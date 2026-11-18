import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApprovedMap, approvedUrl} from './current-gate.mjs';
import {readFile} from 'node:fs/promises';

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
  assert.equal(approvedUrl({id:fixed.id,png_sha256:sha,status:'design_proposal'},approved,'https://example.test'),null);
  assert.equal(approvedUrl({id:fixed.id,png_sha256:sha,production_usable:false},approved,'https://example.test'),null);
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


test('source landing links to current API and avoids retired public routes', async () => {
  const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
  const readme=await readFile(new URL('../../README.md',import.meta.url),'utf8');
  assert.match(html,/https:\/\/ai-staff-two\.vercel\.app\/api\/characters\/current/);
  assert.match(readme,/26종/);
  for (const route of ['library/','templates/','share/','gestures/','motion/','studio/studio/']) {
    assert.equal(html.includes('href="'+route),false,route+' must not be a current source link');
  }
  assert.equal(html.includes('37개 상황'),false);
});
