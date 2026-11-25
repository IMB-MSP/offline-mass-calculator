import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';
// A minimal DOM harness verifies wiring, not browser rendering or clipboard permissions.
function harness(){
 execFileSync(process.execPath,['scripts/build.js']);const html=fs.readFileSync('dist/offline-mass-calculator.html','utf8');const registry=new Map();
 class Element{constructor(tag){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.dataset={};this.hidden=false;this.className='';this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};}set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+(this.children||[]).map(c=>c.textContent||'').join('');}set id(v){this._id=v;registry.set(v,this);}get id(){return this._id;}append(...items){this.children.push(...items);}replaceChildren(...items){this.textContent='';this.children=items;if(this.tagName==='select')this.value='';}add(o){this.children.push(o);if(this.children.length===1)this.value=String(o.value);}get options(){return this.children;}setAttribute(k,v){this[k]=v;}click(){}remove(){}select(){}focus(){this.focused=true;}}
 for(const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const e=new Element(m[1]);e.id=m[2];e.hidden=/\shidden(?:\s|>)/.test(m[0]);e.disabled=/\sdisabled(?:\s|>)/.test(m[0]);e.open=false;}
 for(const value of ['common','protonated','all','custom'])registry.get('ionPreset').add({value,text:value});registry.get('ionPreset').value='common';registry.get('tolerance').value='5';registry.get('precision').value='5';registry.get('unit').value='ppm';registry.get('sort').value='input';registry.get('representation').value='exact';registry.get('importMode').value='append';const doc={getElementById:id=>registry.get(id),createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[],body:new Element('body')};
 const context=vm.createContext({document:doc,Option:function(text,value){this.text=text;this.value=String(value);},TextEncoder,Blob,URL,setTimeout,console,navigator:{}});const script=html.match(/<script type="module">([\s\S]*)<\/script>/)[1];new vm.Script(script).runInContext(context);return {registry,html,context};
}
test('standalone bundle parses and complete user workflow runs in DOM harness',()=>{const {registry:r,html}=harness();assert.ok(!/<(?:script|link)[^>]+(?:src|href)=/.test(html));assert.ok(html.includes("connect-src 'none'"));r.get('samples').onclick();assert.equal(r.get('counts').textContent,'7 compounds');assert.equal(r.get('ionCount').textContent,'28 calculated ions');assert.equal(r.get('spectrum').children.length,0);r.get('detail').open=true;r.get('detail').ontoggle();assert.equal(r.get('spectrum').children.length,1);r.get('observed').value='195.087652031';r.get('observed').oninput();assert.match(r.get('match').textContent,/Within tolerance/);r.get('batch').value='Name,Formula\n'+Array.from({length:200},()=> 'Duplicate,C6H12O6').join('\n');r.get('previewPaste').onclick();assert.match(r.get('previewCount').textContent,/200 valid/);r.get('apply').onclick();assert.equal(r.get('counts').textContent,'207 compounds');assert.equal(r.get('ionCount').textContent,'828 calculated ions');r.get('ionsTab').onclick();assert.match(r.get('page').textContent,/828 rows/);r.get('next').onclick();assert.match(r.get('page').textContent,/Page 2/);r.get('search').value='Caffeine';r.get('search').oninput();assert.match(r.get('page').textContent,/4 rows/);r.get('name').value='=literal';r.get('formula').value='H2O';r.get('single').onsubmit({preventDefault(){}});assert.equal(r.get('counts').textContent,'208 compounds');assert.ok(r.get('compoundSelect').options.some(o=>o.text.includes('=literal')&&!o.text.includes("'=literal")));});

const submit = r => r.get('single').onsubmit({preventDefault(){}});
const evaluate = (h, expression) => vm.runInContext(expression, h.context);

test('formula-only entry, inline validation, idempotent Calculate and single-result layout', () => {
  const h = harness(), r = h.registry;
  assert.equal(r.get('resultsSection').hidden, true);
  assert.equal(r.get('advanced').open, false);
  assert.equal(r.get('negative').disabled, false);
  submit(r);
  assert.match(r.get('formulaError').textContent, /Enter a molecular formula/);
  assert.equal(r.get('formula')['aria-invalid'], 'true');
  r.get('formula').value = 'C8H10N4O2';
  submit(r);
  assert.equal(r.get('counts').textContent, '1 compound');
  assert.equal(r.get('resultsHeading').textContent, 'Mass Calculations · C8H10N4O2');
  assert.equal(r.get('singleInfo').hidden, false);
  assert.equal(r.get('batchToolbar').hidden, true);
  assert.equal(r.get('detail').hidden, false);
  assert.equal(evaluate(h, 'ions[0].mz'), 195.08765203148092);
  submit(r);
  assert.equal(r.get('counts').textContent, '1 compound');
  assert.match(r.get('status').textContent, /no duplicate/);
  r.get('formula').value = 'C0';
  submit(r);
  assert.match(r.get('formulaError').textContent, /Counts/);
  assert.equal(r.get('counts').textContent, '1 compound');
});

test('presets preserve original chemistry and custom selection survives toggles and other presets', () => {
  const h = harness(), r = h.registry;
  r.get('formula').value = 'C6H12O6'; submit(r);
  assert.equal(evaluate(h, 'ions.length'), 4);
  r.get('customise').onclick();
  r.get('a_2H').checked = true; r.get('a_2H').onchange();
  assert.equal(r.get('ionPreset').value, 'custom');
  r.get('customise').onclick();
  assert.equal(r.get('customIons').hidden, true);
  assert.equal(r.get('a_2H').checked, true);
  r.get('ionPreset').value = 'protonated'; r.get('ionPreset').onchange();
  assert.equal(evaluate(h, 'ions.length'), 1);
  assert.ok(Math.abs(evaluate(h, 'ions[0].mz') - 181.070664556501) < 1e-8);
  r.get('ionPreset').value = 'custom'; r.get('ionPreset').onchange();
  assert.equal(evaluate(h, 'ions.length'), 5);
  assert.equal(r.get('a_2H').checked, true);
  r.get('ionPreset').value = 'all'; r.get('ionPreset').onchange();
  assert.equal(evaluate(h, 'selectedAdducts().length'), 12);
  r.get('ionPreset').value = 'common'; r.get('ionPreset').onchange();
  assert.equal(evaluate(h, 'ions.length'), 4);
  for (const id of ['H','Na','NH4','K']) {r.get('a_'+id).checked=false;r.get('a_'+id).onchange();}
  assert.equal(r.get('noIons').hidden, false);
  assert.equal(r.get('singleInfo').hidden, false);
});

test('advanced settings update XIC and precision without changing compounds or recomputing cached isotopes', () => {
  const h = harness(), r = h.registry;
  r.get('formula').value = 'C6H12O6'; submit(r);
  assert.equal(evaluate(h, 'cache.size'), 0);
  r.get('detail').open = true; r.get('detail').ontoggle();
  assert.equal(evaluate(h, 'cache.size'), 1);
  evaluate(h, 'globalThis.savedPattern = [...cache.values()][0]');
  r.get('tolerance').value = '0.01'; r.get('unit').value = 'Da';r.get('unit').onchange();
  assert.equal(evaluate(h, 'ions[0].delta'), .01);
  r.get('precision').value = '8';r.get('precision').onchange();
  assert.match(r.get('settingsSummary').textContent, /0.01 Da · 8 decimals/);
  assert.equal(evaluate(h, '[...cache.values()][0] === savedPattern'), true);
  assert.equal(r.get('counts').textContent, '1 compound');
  r.get('tolerance').value = '-2';r.get('tolerance').onchange();
  assert.equal(r.get('tolerance').value, '0.01');
  assert.match(r.get('settingsError').textContent, /Tolerance must/);
});

test('Excel paste survives collapsing; preview errors, replace, duplicates and repeat-apply are handled', () => {
  const h = harness(), r = h.registry;
  r.get('formula').value = 'H2O';submit(r);
  r.get('toggleBatch').onclick();
  r.get('batch').value = 'Name\tFormula\nDup\tC6H12O6\nDup\tC6H12O6\nInvalid\tXx';
  r.get('toggleBatch').onclick();r.get('toggleBatch').onclick();
  assert.match(r.get('batch').value, /Dup/);
  assert.equal(r.get('counts').textContent, '1 compound');
  r.get('previewPaste').onclick();
  assert.match(r.get('previewCount').textContent, /2 valid compounds · 1 invalid/);
  assert.equal(r.get('previewInvalid').hidden, false);
  r.get('importMode').value = 'replace';r.get('apply').onclick();r.get('apply').onclick();
  assert.equal(r.get('counts').textContent, '2 compounds');
  assert.equal(r.get('singleInfo').hidden, true);
  assert.equal(r.get('batchToolbar').hidden, false);
  assert.equal(evaluate(h, 'compounds[0].name === compounds[1].name'), true);
  // A failed second preview cannot leave a stale, applicable earlier preview.
  r.get('previewPaste').onclick();r.get('batch').value='x'.repeat(2*1024*1024+1);r.get('previewPaste').onclick();
  assert.equal(r.get('preview').hidden,true);
  assert.equal(evaluate(h,'pending'),null);
});

test('local CSV handler and complete full-precision export still work after search and pagination', async () => {
  const h = harness(), r = h.registry;
  r.get('upload').files = [{size:1000,text:async()=> 'Name,Formula\n'+Array.from({length:200},()=> 'Duplicate,C8H10N4O2').join('\n')}];
  await r.get('upload').onchange();r.get('apply').onclick();
  r.get('ionsTab').onclick();r.get('next').onclick();
  assert.match(r.get('page').textContent,/Page 2/);
  r.get('search').value='no match';r.get('search').oninput();
  assert.equal(evaluate(h,'sr().length'),201);
  assert.equal(evaluate(h,'ir().length'),801);
  assert.equal(evaluate(h,'sr()[1][5] === ions[0].mz'),true);
  assert.equal(evaluate(h,'skylineCSV(ions).split("\\r\\n").length'),801);
});

test('observed matching follows ion and compound selection, input/change/Enter and tolerance', () => {
  const h=harness(),r=h.registry;
  r.get('samples').onclick();
  r.get('detail').open=true;r.get('detail').ontoggle();
  r.get('compoundSelect').value='2';r.get('compoundSelect').onchange();
  r.get('detailIon').value='Na';r.get('detailIon').onchange();
  assert.match(r.get('match').textContent,/Glucose.*203.05261/);
  r.get('observed').value='203';r.get('observed').oninput();
  assert.match(r.get('match').textContent,/Outside tolerance · -259.090 ppm/);
  r.get('observed').value='203.05261';r.get('observed').onchange();
  assert.match(r.get('match').textContent,/Within tolerance/);
  assert.match(r.get('match').textContent,/Observed 203.05261/);
  r.get('detailIon').value='H';r.get('detailIon').onchange();
  assert.match(r.get('match').textContent,/Outside tolerance/);
  assert.match(r.get('match').textContent,/181.07066/);
  r.get('observed').value='181.07066';r.get('observed').onkeydown({key:'Enter',preventDefault(){}});
  assert.match(r.get('match').textContent,/Within tolerance/);
  r.get('compoundSelect').value='1';r.get('compoundSelect').onchange();
  assert.match(r.get('match').textContent,/Outside tolerance/);
  assert.match(r.get('match').textContent,/Caffeine.*195.08765/);
  r.get('observed').value='';r.get('observed').oninput();
  assert.match(r.get('match').textContent,/Enter an observed/);
  r.get('observed').value='-1';r.get('observed').onchange();
  assert.match(r.get('match').textContent,/must be positive/);
  r.get('observed').value='195.09';r.get('observed').oninput();
  assert.match(r.get('match').textContent,/Outside tolerance/);
  r.get('unit').value='Da';r.get('tolerance').value='0.01';r.get('unit').onchange();
  assert.match(r.get('match').textContent,/Within tolerance/);
});

test('polarity switch preserves compounds and independent custom selections; matching follows negative target',()=>{
 const h=harness(),r=h.registry;r.get('formula').value='C6H12O6';submit(r);
 r.get('a_2H').checked=true;r.get('a_2H').onchange();
 r.get('negative').onclick();assert.equal(evaluate(h,'ions.length'),4);assert.equal(evaluate(h,'ions[0].charge'),-1);
 assert.equal(r.get('counts').textContent,'1 compound');
 r.get('detail').open=true;r.get('detail').ontoggle();r.get('observed').value='179.056111651859';r.get('observed').oninput();assert.match(r.get('match').textContent,/Within tolerance/);
 r.get('a_neg2H').checked=true;r.get('a_neg2H').onchange();r.get('positive').onclick();assert.equal(evaluate(h,'ions.length'),5);assert.equal(r.get('a_2H').checked,true);
 r.get('negative').onclick();assert.equal(r.get('a_neg2H').checked,true);assert.equal(evaluate(h,'ions.length'),5);
 r.get('ionPreset').value='protonated';r.get('ionPreset').onchange();assert.equal(evaluate(h,'ions.length'),1);assert.equal(evaluate(h,'ions[0].adduct.id'),'negH');
});

test('Clear all resets dataset, drafts and cached results while keeping ion settings',()=>{
 const h=harness(),r=h.registry;r.get('samples').onclick();r.get('negative').onclick();
 r.get('a_neg2H').checked=true;r.get('a_neg2H').onchange();
 r.get('precision').value='8';r.get('precision').onchange();
 r.get('tolerance').value='10';r.get('tolerance').onchange();
 r.get('detail').open=true;r.get('detail').ontoggle();
 r.get('batch').value='Name,Formula\nBad,Xx\nWater,H2O';r.get('previewPaste').onclick();
 r.get('observed').value='123';r.get('search').value='Caffeine';
 r.get('clearAll').onclick();
 for(const expr of ['compounds.length','ions.length','invalidRows.length','cache.size'])assert.equal(evaluate(h,expr),0);
 assert.equal(evaluate(h,'pending'),null);assert.equal(r.get('resultsSection').hidden,true);
 assert.equal(r.get('preview').hidden,true);assert.equal(r.get('detail').hidden,true);
 for(const id of ['batch','observed','search','formula'])assert.equal(r.get(id).value,'');
 assert.equal(evaluate(h,'polarity'),'negative');assert.equal(r.get('a_neg2H').checked,true);
 assert.equal(r.get('precision').value,'8');assert.equal(r.get('tolerance').value,'10');
 r.get('apply').onclick();assert.equal(evaluate(h,'compounds.length'),0);
 r.get('formula').value='H2O';submit(r);assert.equal(evaluate(h,'compounds[0].id'),1);
 assert.equal(r.get('resultsSection').hidden,false);
});
test('Quick help supports hover, keyboard focus, click and Escape',()=>{
 const {registry:r}=harness();assert.equal(r.get('quickHelp').hidden,true);
 r.get('helpWrap').onmouseenter();assert.equal(r.get('quickHelp').hidden,false);
 r.get('helpWrap').onmouseleave();assert.equal(r.get('quickHelp').hidden,true);
 r.get('helpButton').onfocus();assert.equal(r.get('helpButton')['aria-expanded'],'true');
 r.get('helpWrap').onkeydown({key:'Escape',preventDefault(){}});assert.equal(r.get('quickHelp').hidden,true);
 r.get('helpButton').onblur();r.get('helpButton').onclick();assert.equal(r.get('quickHelp').hidden,false);
 r.get('helpButton').onclick();assert.equal(r.get('quickHelp').hidden,true);
});


test('Clear all, cancellation and newer previews invalidate pending file reads',async()=>{
 for(const action of ['clearAll','cancel','previewPaste','newUpload']){
  const h=harness(),r=h.registry;let resolve;
  r.get('upload').files=[{size:30,text:()=>new Promise(done=>{resolve=done;})}];
  const old=r.get('upload').onchange();
  if(action==='newUpload'){
   r.get('upload').files=[{size:30,text:async()=> 'Name,Formula\nNew,H2O'}];
   await r.get('upload').onchange();
  }else{r.get('batch').value='New,H2O';r.get(action).onclick();}
  resolve('Name,Formula\nOld,H2O');await old;
  if(['clearAll','cancel'].includes(action)){
   assert.equal(evaluate(h,'pending'),null);assert.equal(r.get('preview').hidden,true);
  }else assert.equal(evaluate(h,'pending.valid[0].name'),'New');
 }
});
test('untrusted names stay literal in the rendered result and selector',()=>{
 const h=harness(),r=h.registry;
 const name='<img src=x onerror=alert(1)>';
 r.get('name').value=name;r.get('formula').value='H2O';submit(r);
 assert.equal(evaluate(h,'compounds[0].name'),name);
 assert.ok(r.get('compoundSelect').options.some(o=>o.text.includes(name)));
 assert.equal(evaluate(h,'globalThis.alert'),undefined);
});
