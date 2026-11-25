import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseCSV,importCompounds,safeCell,csv} from '../src/csv-handler.js';

test('export protection covers Unicode operators, controls and spreadsheet delimiters',()=>{
  for(const s of ['=1+1','+1','-1','@SUM(A1)','＝1','＋1','－1','＠SUM(A1)','\u200b=1','\ttext','\rtext',' \u0000=1'])assert.equal(safeCell(s),"'"+s);
  assert.equal(safeCell(-2),'-2');
  for(const s of ['Café','α-ketoglutarate','C6H12O6'])assert.equal(safeCell(s),s);
  const names=['hello;=1','a,=1','a\t=1','a\n=1','a"=1'];
  assert.deepEqual(parseCSV(csv(names.map(s=>[s,'H2O']))).map(r=>r.fields[0]),names);
});
test('CSV limits reject excessive bytes and rows and bound stored fields and columns',()=>{
  assert.throws(()=>parseCSV('é'.repeat(1048577)),/2 MiB/);
  assert.throws(()=>importCompounds('x,H2O\n'.repeat(2001)),/2,000 rows/);
  assert.throws(()=>parseCSV('x,H2O\n'.repeat(2002)),/2,000 rows/);
  assert.equal(importCompounds('Name,Formula\n'+'x,H2O\n'.repeat(2000)).valid.length,2000);
  const large=parseCSV('x'.repeat(20000)+',H2O');
  assert.equal(large[0].fields[0].length,4096);assert.match(large[0].error,/character limit/);
  const wide=parseCSV('x,'.repeat(500)+'H2O');
  assert.equal(wide[0].fields.length,32);assert.match(wide[0].error,/column limit/);
  assert.equal(importCompounds('x'.repeat(4097)+',H2O\nWater,H2O').valid.length,1);
});
test('distribution hashes authorise only its exact script and style; reference has no active page',()=>{
  execFileSync(process.execPath,['scripts/build.js']);
  const html=fs.readFileSync('dist/offline-mass-calculator.html','utf8');
  for(const [directive,re] of [['script',/<script type="module">([\s\S]*)<\/script>/],['style',/<style>([\s\S]*?)<\/style>/]]){
    const digest=createHash('sha256').update(html.match(re)[1]).digest('base64');
    assert.ok(html.includes(`${directive}-src 'sha256-${digest}'`));
  }
  assert.ok(!html.includes("'unsafe-inline'"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!/<(?:script|link)[^>]+(?:src|href)=/i.test(html));
  assert.ok(!fs.existsSync('data/nist-source.html'));
  assert.ok(!/<script\b/i.test(fs.readFileSync('data/nist-reference.txt','utf8')));
  const version=JSON.parse(fs.readFileSync('package.json')).version;
  assert.ok(html.includes(`const APP_VERSION=${JSON.stringify(version)}`));
  assert.match(html,/Skyline targets \(work in progress\)/);
});
