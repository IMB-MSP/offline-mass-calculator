import {ION_MODES} from './ion-options.js';
import {REFERENCE_VERSION} from '../data/atomic-masses.js';import {ADDUCTS} from '../data/adduct-definitions.js';import {hill} from './formula-parser.js';import {matchMass} from './mass-engine.js';import {isotopePattern} from './isotope-engine.js';import {importCompounds,csv} from './csv-handler.js';import {skylineCSV} from './skyline-export.js';import {calculate,summaryRows,ionRows} from './batch.js';
const $=id=>document.getElementById(id);let compounds=[],ions=[],invalidRows=[],pending=null,nextId=1,view='summary',page=0,selected=null,cache=new Map();const PAGE=40;let acceptedTolerance=5,acceptedUnit='ppm';
let polarity='positive',ionMode=ION_MODES.positive;
const modeState={};
let importGeneration=0;
let customSelection=[...ionMode.presets.common];
const selectedAdducts=()=>ionMode.definitions.filter(a=>$('a_'+a.id).checked);const precision=()=>+$('precision').value;const fmt=n=>n==null?'Unavailable':n.toFixed(precision());const tolerance=()=>+$('tolerance').value;const unit=()=>$('unit').value;
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;}
function status(s){$('status').textContent=s;}
function table(target,headers,rows,selectable=false){target.replaceChildren();if(!rows.length){target.append(el('p','No results yet. Add a compound or import a list.','hint'));return;}const numericColumns=headers.map((h,index)=>!['Compound ID','Record'].includes(h)&&(rows.some(row=>typeof row.values[index]==='number')||/mass|m\/z|^\[/.test(h)));const t=el('table'),head=el('thead'),hr=el('tr');headers.forEach((h,index)=>{const th=el('th',h,numericColumns[index]?'number':'');th.scope='col';hr.append(th);});head.append(hr);t.append(head);const body=el('tbody');for(const {values,id} of rows){const tr=el('tr');if(id===selected)tr.className='selected';values.forEach((v,index)=>{const td=el('td',undefined,numericColumns[index]?'number':'');if(selectable&&index===0){const b=el('button',String(v));b.onclick=()=>{selected=id;$('detail').open=true;renderResults();renderDetail();};b.title='Inspect compound '+id;td.append(b);}else td.textContent=typeof v==='number'?(/^(Compound ID|Charge|Record)$/.test(headers[index])?String(v):fmt(v)):v??'—';tr.append(td);});body.append(tr);}t.append(body);target.append(t);}
// Build the advanced ion controls once; collapsing never destroys their state.
function buildIonControls() {
$('adducts').replaceChildren();
for (const [title, ids] of ionMode.groups) {
  const group = el('fieldset');
  group.append(el('legend', title));
  for (const id of ids) {
    const a = ionMode.definitions.find(item => item.id === id);
    const label = el('label'), box = el('input');
    box.type = 'checkbox';
    box.id = 'a_' + a.id;
    box.checked = a.enabled;
    box.onchange = () => {
      customSelection = selectedAdducts().map(item => item.id);
      $('ionPreset').value = 'custom';
      recalculate();
    };
    label.append(box, document.createTextNode(a.name));
    group.append(label);
  }
  $('adducts').append(group);
}
}
buildIonControls();
function switchPolarity(next) {
  if(next===polarity)return;
  modeState[polarity]={custom:[...customSelection],selected:selectedAdducts().map(a=>a.id),preset:$('ionPreset').value};
  polarity=next;ionMode=ION_MODES[next];
  const saved=modeState[next];
  customSelection=saved?.custom||[...ionMode.presets.common];
  buildIonControls();
  const ids=saved?.selected||ionMode.presets.common;
  for(const a of ionMode.definitions)$('a_'+a.id).checked=ids.includes(a.id);
  $('ionPreset').options[0].text=next==='positive'?'Common positive ESI':'Common negative ESI';
  $('ionPreset').options[1].text=next==='positive'?'Protonated only':'Deprotonated only';
  $('ionPreset').value=saved?.preset||'common';
  for(const mode of ['positive','negative']){
    $(mode).setAttribute('aria-pressed',String(mode===next));
    $(mode).classList.toggle('active',mode===next);
  }
  $('ionFilter').value='';
  recalculate();
}
$('positive').onclick=()=>switchPolarity('positive');
$('negative').onclick=()=>switchPolarity('negative');
function setCustomPanel(open) {
  $('customIons').hidden = !open;
  $('customise').setAttribute('aria-expanded', String(open));
}
function settingsSummary() {
  $('settingsSummary').textContent = `· ${tolerance()} ${unit()} · ${precision()} decimals`;
  const selectedIons = selectedAdducts();
  $('ionSummary').textContent = selectedIons.length <= 4
    ? selectedIons.map(a => a.name).join(' · ') || 'No ions selected'
    : `${selectedIons.length} ions selected`;
}
$('customise').onclick = () => setCustomPanel($('customIons').hidden);
$('ionPreset').onchange = () => {
  const preset = $('ionPreset').value;
  const ids = preset === 'custom' ? customSelection : ionMode.presets[preset];
  for (const a of ionMode.definitions) $('a_' + a.id).checked = ids.includes(a.id);
  if (preset === 'custom') setCustomPanel(true);
  recalculate();
};
function recalculate(){try{if($('tolerance').value.trim()===''||!Number.isFinite(tolerance())||tolerance()<0||tolerance()>1e6)throw Error('Tolerance must be between 0 and 1,000,000.');$('settingsError').textContent='';acceptedTolerance=tolerance();acceptedUnit=unit();const result=calculate(compounds,selectedAdducts(),tolerance(),unit());ions=result.ions;$('ionErrors').textContent=result.errors.length?`${result.errors.length} ion calculations unavailable. `+result.errors.slice(0,4).map(e=>`Compound ${e.compound}: ${e.error}`).join(' '):'';const filter=$('ionFilter').value;$('ionFilter').replaceChildren(new Option('All selected ions',''));for(const a of selectedAdducts())$('ionFilter').add(new Option(a.name,a.id));$('ionFilter').value=selectedAdducts().some(a=>a.id===filter)?filter:'';page=0;$('counts').textContent=compounds.length+(compounds.length===1?' compound':' compounds');$('ionCount').textContent=ions.length+' calculated ions';settingsSummary();renderResults();renderDetail();}catch(e){$('tolerance').value=String(acceptedTolerance);$('unit').value=acceptedUnit;$('settingsError').textContent=e.message;settingsSummary();}}
function showMetrics(target, compound) {
  target.replaceChildren();
  for (const [label, value] of [
    ['Formula', compound.formula],
    ['Monoisotopic mass · Da', fmt(compound.mono)],
    ['Average mass · Da', fmt(compound.average)],
    ['Atoms', compound.atoms],
    ['DBE', compound.dbe ?? 'Not applicable'],
  ]) {
    const metric = el('div', undefined, 'metric');
    metric.append(el('span', label), el('strong', value));
    target.append(metric);
  }
  if (compound.warnings.length) target.append(el('p', compound.warnings.join(' '), 'hint'));
}
function renderResults() {
  const single = compounds.length === 1;
  $('resultsSection').hidden = !compounds.length;
  $('detail').hidden = !compounds.length;
  $('batchToolbar').hidden = compounds.length < 2;
  $('singleInfo').hidden = !single;
  $('ionFilterLabel').hidden = view !== 'ions';
  $('invalid').hidden = !invalidRows.length;
  $('noIons').hidden = selectedAdducts().length > 0;
  $('summaryTab').classList.toggle('active', view === 'summary');
  $('ionsTab').classList.toggle('active', view === 'ions');
  $('summaryTab').setAttribute('aria-pressed', String(view === 'summary'));
  $('ionsTab').setAttribute('aria-pressed', String(view === 'ions'));
  $('resultsHeading').textContent = single ? 'Mass Calculations · '+compounds[0].name : 'Mass Calculations';
  if (!compounds.length) return;
  if (single) showMetrics($('singleInfo'), compounds[0]);

  const query = single ? '' : $('search').value.toLowerCase();
  let cs = compounds.filter(c => `${c.id} ${c.name} ${c.formula}`.toLowerCase().includes(query));
  if ($('sort').value === 'name') cs.sort((a, b) => a.name.localeCompare(b.name));
  if ($('sort').value === 'mass') cs.sort((a, b) => (a.mono ?? Infinity) - (b.mono ?? Infinity));
  const ids = new Set(cs.map(c => c.id));
  const rank = new Map(cs.map((c, i) => [c.id, i]));
  const filtered = ions.filter(i => ids.has(i.compound.id) &&
    (single || !$('ionFilter').value || i.adduct.id === $('ionFilter').value))
    .sort((a, b) => rank.get(a.compound.id) - rank.get(b.compound.id));
  let rows, headers;
  if (single) {
    headers = ['Ion form', 'Charge', 'Theoretical m/z', `Lower XIC · ±${tolerance()} ${unit()}`, 'Upper XIC'];
    rows = filtered.map(i => ({values: [i.adduct.name + (i.adduct.loss ? ' · possible loss' : ''), i.charge, i.mz, i.lower, i.upper]}));
  } else {
    const data = view === 'summary'
      ? summaryRows(cs, selectedAdducts(), ions)
      : ionRows(filtered, tolerance(), unit());
    headers = data[0];
    rows = data.slice(1).map((values, j) => ({
      id: view === 'summary' ? cs[j].id : filtered[j].compound.id, values,
    }));
  }
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  page = Math.min(page, pages - 1);
  table($('results'), headers, rows.slice(page * PAGE, (page + 1) * PAGE), !single);
  if (!rows.length) $('results').replaceChildren(el('p',
    !selectedAdducts().length ? 'Neutral masses remain available above or in the compound summary.' : 'No matching results. Clear the search or ion filter.', 'hint'));
  $('pagination').hidden = pages <= 1;
  $('page').textContent = `Page ${page + 1} of ${pages} · ${rows.length} rows`;
  $('previous').disabled = page === 0;
  $('next').disabled = page >= pages - 1;
}
function renderDetail(){if(!compounds.some(c=>c.id===selected))selected=compounds[0]?.id??null;$('compoundSelect').replaceChildren();for(const c of compounds)$('compoundSelect').add(new Option(`${c.id} · ${c.name}`,c.id));$('compoundSelect').value=selected??'';const c=compounds.find(c=>c.id===selected);if(!c){$('detailInfo').textContent='Select a compound to inspect its composition and isotope pattern.';$('detailIon').replaceChildren();$('spectrum').replaceChildren();$('isotopeTable').replaceChildren();$('match').textContent='';$('isotopeNote').textContent='';return;}
 showMetrics($('detailInfo'),c);$('detailInfo').hidden=compounds.length===1;$('compoundLabel').hidden=compounds.length===1;$('detailName').textContent='· '+c.name;const old=$('detailIon').value;$('detailIon').replaceChildren();for(const i of ions.filter(i=>i.compound.id===selected))$('detailIon').add(new Option(`${i.adduct.name} · ${fmt(i.mz)} m/z`,i.adduct.id));if([...$('detailIon').options].some(o=>o.value===old))$('detailIon').value=old;if($('detail').open)renderSpectrum();}
function currentIon(){return ions.find(i=>i.compound.id===selected&&i.adduct.id===$('detailIon').value);}
function matching() {
  const ion = currentIon();
  const output = $('match');
  output.className = 'comparison';
  $('observed').setAttribute('aria-invalid', 'false');
  if (!ion) {
    output.textContent = 'Select an available ion to compare an observed m/z.';
    return;
  }
  const target = `${ion.compound.name} · ${ion.adduct.name} · theoretical ${fmt(ion.mz)} m/z`;
  const raw = $('observed').value.trim();
  if (!raw && !$('observed').validity?.badInput) {
    output.textContent = `${target}. Enter an observed m/z to compare (±${tolerance()} ${unit()}).`;
    return;
  }
  try {
    const observed = Number(raw);
    const result = matchMass(observed, ion.mz, tolerance(), unit());
    const heading = el('strong', `${result.within ? 'Within' : 'Outside'} tolerance · ${result.ppm >= 0 ? '+' : ''}${result.ppm.toFixed(3)} ppm`);
    const values = el('span', `Observed ${raw} m/z → ${target}.`);
    const delta = observed - ion.mz;
    const explanation = el('span', `Difference ${delta >= 0 ? '+' : ''}${delta.toFixed(8)} m/z · tolerance ±${tolerance()} ${unit()}. Mass agreement is not identification.`, 'hint');
    output.replaceChildren(heading, values, explanation);
    output.className = 'comparison ' + (result.within ? 'ok' : 'error');
  } catch (error) {
    output.textContent = error.message;
    output.className = 'comparison error';
    $('observed').setAttribute('aria-invalid', 'true');
  }
}
function renderSpectrum(){matching();$('spectrum').replaceChildren();$('isotopeTable').replaceChildren();const i=currentIon();if(!i){$('isotopeNote').textContent='Select an available ion to calculate its isotope distribution.';return;}try{const key=hill(i.composition)+':'+i.charge;let p=cache.get(key);if(!p){p=isotopePattern(i.composition,i.charge);if(cache.size>=60)cache.delete(cache.keys().next().value);cache.set(key,p);}const nominal=$('representation').value==='nominal';const gm=Math.max(...p.groups.map(x=>x.p));const peaks=nominal?p.groups.filter(x=>x.p>0).map(x=>({...x,relative:x.p/gm*100,shift:x.mz-p.base})):p.peaks.filter(x=>x.relative>=.01).sort((a,b)=>b.p-a.p).slice(0,100).sort((a,b)=>a.mz-b.mz);
 $('isotopeNote').textContent=`Ion composition ${hill(i.composition)} · reference monoisotopic m/z ${fmt(p.base)}. Strongest retained fine-structure peak ${fmt(p.peaks.reduce((a,b)=>a.p>b.p?a:b).mz)} m/z. Retained probability ${(p.retained*100).toFixed(6)}%. ${nominal?'Nominal groups use probability-weighted centroids; intensities scaled within M–M+2.':'Up to 100 sticks ≥0.01% relative abundance; fine structure may overlap visually.'} Bounded, pruned natural-abundance model; no instrumental peak broadening. ${i.adduct.loss?'Neutral loss is a possibility, not a predicted fragment.':''}`;
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 280');svg.setAttribute('role','img');svg.setAttribute('aria-label','Theoretical isotope spectrum. Peak values are also listed in the table below.');const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};const lo=Math.min(...peaks.map(x=>x.mz))-.15,hi=Math.max(...peaks.map(x=>x.mz))+.15;add('line',{x1:65,y1:230,x2:965,y2:230});add('line',{x1:65,y1:25,x2:65,y2:230});for(const v of [0,50,100])add('text',{x:20,y:232-v*1.9},String(v));for(let n=0;n<=5;n++){const mz=lo+(hi-lo)*n/5;add('text',{x:65+n*180,y:253,'text-anchor':'middle'},mz.toFixed(3));}add('text',{x:500,y:275},'m/z');add('text',{x:70,y:18},'Relative abundance (%)');peaks.forEach((pk,n)=>{const x=65+(pk.mz-lo)/(hi-lo)*900;const stick=add('line',{x1:x,y1:230,x2:x,y2:230-pk.relative*1.9,'stroke-width':nominal?4:2,tabindex:0});const title=document.createElementNS(ns,'title');title.textContent=`${fmt(pk.mz)} m/z · ${pk.relative.toFixed(4)}% relative · Δ ${pk.shift.toFixed(8)} m/z`;stick.append(title);if(pk.relative>15)add('text',{x,y:220-pk.relative*1.9,'text-anchor':'middle'},nominal?'M'+(pk.nominal?'+'+pk.nominal:''):pk.mz.toFixed(4));});$('spectrum').append(svg);table($('isotopeTable'),['Isotope group','m/z','Shift in m/z','Relative abundance (%)','Absolute probability'],peaks.map(pk=>({values:[pk.nominal===0?'M':`M${pk.nominal>0?'+':''}${pk.nominal}`,pk.mz,pk.shift,pk.relative,pk.p]})));
 }catch(e){$('isotopeNote').textContent=e.message;}}
function append(data,replace=false){if((replace?0:compounds.length)+data.valid.length>2000)throw Error('Maximum 2,000 compounds in the workspace.');if(replace){compounds=[];selected=null;}for(const c of data.valid)compounds.push({...c,id:nextId++});invalidRows=data.invalid;recalculate();}
function preview(text,header=false){importGeneration++;pending=null;$('preview').hidden=true;try{pending=importCompounds(text,header);$('preview').hidden=false;$('previewCount').textContent=`${pending.valid.length} valid compounds · ${pending.invalid.length} invalid rows. Preview shows first 20 of each.`;table($('previewTable'),['Name','Formula','Result'],[...pending.valid.slice(0,20).map(c=>({values:[c.name,c.formula,c.warnings.join(' ')||'Valid']})),...pending.invalid.slice(0,20).map(c=>({values:[c.name,c.formula,c.error]}))]);$('apply').disabled=!pending.valid.length;invalidRows=pending.invalid;$('previewInvalid').hidden=!invalidRows.length;$('invalid').hidden=!invalidRows.length;status('Review the import before applying it.');}catch(e){status(e.message);}}
// Manual calculation reuses an identical entry; batch imports intentionally keep duplicates.
$('single').onsubmit = e => {
  e.preventDefault();
  $('nameError').textContent = '';
  $('formulaError').textContent = '';
  $('name').setAttribute('aria-invalid', 'false');
  $('formula').setAttribute('aria-invalid', 'false');
  const formula = $('formula').value.trim();
  const name = $('name').value.trim() || 'Formula';
  try {
    if (!formula) throw Error('Enter a molecular formula, for example C8H10N4O2.');
    if (name.length > 300 && $('name').value.trim()) {
      $('nameError').textContent = 'Use a name of at most 300 characters.';
      $('name').setAttribute('aria-invalid', 'true');
      $('name').focus({preventScroll: true});
      return;
    }
    const data = importCompounds([name || 'Formula', formula]
      .map(v => '"' + v.replaceAll('"', '""') + '"').join(','));
    if (data.invalid.length) throw Error(data.invalid[0].error);
    const c = data.valid[0];
    if (!$('name').value.trim()) c.name = c.formula;
    const existing = compounds.find(item => item.name === c.name && item.formula === c.formula);
    $('search').value = '';
    $('ionFilter').value = '';
    if (existing) {
      selected = existing.id;
      renderResults();
      renderDetail();
      status('Showing the existing compound; no duplicate added.');
    } else {
      selected = nextId;
      append(data);
      status(`Calculated ${c.name}.`);
    }
  } catch (error) {
    $('formulaError').textContent = error.message;
    $('formula').setAttribute('aria-invalid', 'true');
    $('formula').focus({preventScroll: true});
  }
};
$('samples').onclick=()=>{append(importCompounds('Caffeine,C8H10N4O2\nGlucose,C6H12O6\nCitric acid,C6H8O7\nChlorobenzene,C6H5Cl\nBromobenzene,C6H5Br\nMethionine,C5H11NO2S\nGlucose 6-phosphate,C6H13O9P'));status('Added 7 example compounds.');};
$('toggleBatch').onclick = () => {
  const open = $('paste').hidden;
  $('paste').hidden = !open;
  $('toggleBatch').setAttribute('aria-expanded', String(open));
  if (open) $('batch').focus({preventScroll: true});
};
$('importCSV').onclick = () => $('upload').click();
$('detail').ontoggle = () => { if ($('detail').open) renderDetail(); };
$('previewPaste').onclick=()=>preview($('batch').value);$('upload').onchange=async()=>{
  const generation=++importGeneration;
  pending=null;$('preview').hidden=true;
  const f=$('upload').files[0];$('upload').value='';if(!f)return;
  if(f.size>2*1024*1024){status('File exceeds the 2 MiB limit.');return;}
  try{const text=await f.text();if(generation!==importGeneration)return;preview(text,true);}
  catch(e){if(generation===importGeneration)status(e.message);}
};$('apply').onclick=()=>{if(!pending)return;try{$('search').value='';$('ionFilter').value='';view='summary';append(pending,$('importMode').value==='replace');$('preview').hidden=true;$('paste').hidden=true;$('toggleBatch').setAttribute('aria-expanded','false');$('resultsHeading').focus({preventScroll:true});status(`Imported ${pending.valid.length} compounds; ${pending.invalid.length} invalid rows skipped.`);pending=null;}catch(e){status(e.message);}};$('cancel').onclick=()=>{importGeneration++;$('preview').hidden=true;pending=null;$('importCSV').focus({preventScroll:true});};
for(const id of ['tolerance','unit'])$(id).onchange=recalculate;$('precision').onchange=()=>{settingsSummary();renderResults();renderDetail();};for(const id of ['search','sort','ionFilter'])$(id).oninput=()=>{page=0;renderResults();};$('summaryTab').onclick=()=>{view='summary';page=0;$('summaryTab').classList.add('active');$('ionsTab').classList.remove('active');renderResults();};$('ionsTab').onclick=()=>{view='ions';page=0;$('ionsTab').classList.add('active');$('summaryTab').classList.remove('active');renderResults();};$('previous').onclick=()=>{page--;renderResults();};$('next').onclick=()=>{page++;renderResults();};$('compoundSelect').onchange=()=>{selected=+$('compoundSelect').value;renderDetail();renderResults();};$('detailIon').onchange=renderSpectrum;$('representation').onchange=renderSpectrum;$('observed').oninput=matching;$('observed').onchange=matching;$('observed').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();matching();}};$('theme').onclick=()=>document.body.classList.toggle('dark');
function download(name,text,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const sr=()=>summaryRows(compounds,selectedAdducts(),ions),ir=()=>ionRows(ions,tolerance(),unit());$('downloadSummary').onclick=()=>download('offline-mass-calculator-summary.csv',csv(sr()));$('downloadIons').onclick=()=>download('offline-mass-calculator-ions.csv',csv(ir()));$('skyline').onclick=()=>{download('offline-mass-calculator-Skyline.csv',skylineCSV(ions));status('Skyline export is work in progress. Verify all imported targets before use. See README for column mapping and precursor-only import workflow. Desktop Skyline import has not been tested.');};$('previewInvalid').onclick=$('invalid').onclick=()=>download('offline-mass-calculator-invalid.csv',csv([['Record','Name','Formula','Error'],...invalidRows.map(r=>[r.row,r.name,r.formula,r.error])]));$('metadata').onclick=()=>download('offline-mass-calculator-metadata.json',JSON.stringify({engine:APP_VERSION,polarity,reference:REFERENCE_VERSION,created:new Date().toISOString(),adducts:selectedAdducts(),tolerance:tolerance(),unit:unit(),precision:precision(),compoundCount:compounds.length,ionCount:ions.length,averageConvention:'NIST standard atomic weight; interval midpoint when interval supplied',isotopes:'Natural-abundance bounded convolution; 4096 states, preview <=600 atoms'},null,2),'application/json');
async function copy(rows){const text=csv(rows,'\t');try{await navigator.clipboard.writeText(text);status('Complete table copied.');}catch{const ta=el('textarea');ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();status(ok?'Complete table copied.':'Clipboard unavailable in this browser. Download CSV instead.');}}$('copySummary').onclick=()=>copy(sr());$('copyIons').onclick=()=>copy(ir());recalculate();

// Reset the calculation workspace, preserving polarity, presets and preferences.
$('clearAll').onclick = () => {
  importGeneration++;
  compounds = []; ions = []; invalidRows = []; pending = null;
  nextId = 1; selected = null; page = 0; view = 'summary'; cache.clear();
  for (const id of ['name','formula','batch','upload','observed','search']) $(id).value = '';
  for (const id of ['nameError','formulaError','settingsError','previewCount','detailName','page']) $(id).textContent = '';
  for (const id of ['name','formula','observed']) $(id).setAttribute('aria-invalid','false');
  for (const id of ['results','singleInfo','previewTable']) $(id).replaceChildren();
  for (const id of ['preview','paste','previewInvalid','invalid','pagination']) $(id).hidden = true;
  $('toggleBatch').setAttribute('aria-expanded','false');
  $('detail').open = false;
  $('apply').disabled = true;
  $('sort').value = 'input'; $('importMode').value = 'append'; $('ionFilter').value = '';
  // Discard any unfinished invalid tolerance edit, retaining the last valid setting.
  $('tolerance').value = String(acceptedTolerance); $('unit').value = acceptedUnit;
  recalculate();
  status('All compounds and results cleared. Ion settings retained.');
  $('formula').focus({preventScroll:true});
};

let helpPinned = false, helpHovered = false, helpFocused = false;
function showHelp(open) {
  $('quickHelp').hidden = !open;
  $('helpButton').setAttribute('aria-expanded',String(open));
}
$('helpWrap').onmouseenter = () => { helpHovered = true; showHelp(true); };
$('helpWrap').onmouseleave = () => { helpHovered = false; showHelp(helpPinned || helpFocused); };
$('helpButton').onfocus = () => { helpFocused = true; showHelp(true); };
$('helpButton').onblur = () => { helpFocused = false; helpPinned = false; showHelp(helpHovered); };
$('helpButton').onclick = () => { helpPinned = !helpPinned; showHelp(helpPinned); };
$('helpWrap').onkeydown = e => {
  if (e.key === 'Escape') { helpPinned = false; showHelp(false); e.preventDefault(); }
};
