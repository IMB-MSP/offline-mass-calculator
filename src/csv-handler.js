import {parseFormula,hill} from './formula-parser.js';
import {masses} from './mass-engine.js';

export function parseCSV(text, delimiter) {
  if (new TextEncoder().encode(text).length > 2*1024*1024) throw Error('Maximum input size is 2 MiB.');
  text=text.replace(/^\uFEFF/,'');
  if (!delimiter) {
    let inside=false; delimiter=',';
    for(let j=0;j<text.length;j++) {
      if(text[j]==='"') { if(inside&&text[j+1]==='"'){j++;continue;} inside=!inside; }
      if(!inside&&text[j]==='\t'){delimiter='\t';break;}
      if(!inside&&(text[j]==='\n'||text[j]==='\r'))break;
    }
  }
  const rows=[]; let row=[],field='',quoted=false,closed=false,error='',columns=0;
  const append=c=>{if(field.length<4096)field+=c;else error='Field exceeds the 4,096-character limit.';};
  const push=()=>{columns++;if(columns<=32)row.push(field);else error='Record exceeds the 32-column limit.';field='';closed=false;};
  const end=()=>{push();if(error||row.some(x=>x.trim())){if(rows.length>=2001)throw Error('Maximum 2,000 rows per import (plus optional header).');rows.push({fields:row,error,line:rows.length+1});}row=[];columns=0;error='';};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){append('"');i++;}else{quoted=false;closed=true;}}else append(c);}
    else if(c==='"'&&!field&&!closed)quoted=true;
    else if(c===delimiter)push();
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;end();}
    else {if(closed||c==='"')error='Malformed quoted field.';append(c);}
  }
  if(quoted)error='Unclosed quoted field.';
  if(field||row.length||columns||error)end();
  return rows;
}
export function importCompounds(text,requireHeader=false) {
  const rows=parseCSV(text);
  const header=rows[0]?.fields.map(x=>x.trim().toLowerCase());
  const hasHeader=header?.[0]==='name'&&header?.[1]==='formula';
  if(hasHeader&&(header.length!==2||rows[0].error))throw Error('Expected valid Name,Formula headers.');
  if(requireHeader&&!hasHeader)throw Error('CSV must begin with Name,Formula headers.');
  if(hasHeader)rows.shift();
  if(rows.length>2000)throw Error('Maximum 2,000 rows per import.');
  const valid=[],invalid=[];
  for(const row of rows){try{
    if(row.error)throw Error(row.error);
    if(row.fields.length!==2)throw Error('Expected exactly two fields: Name,Formula.');
    const [name,formula]=row.fields.map(x=>x.trim());
    if(!name||name.length>300)throw Error('Name must contain 1–300 characters.');
    const composition=parseFormula(formula);
    valid.push({name,formula:hill(composition),composition,...masses(composition)});
  }catch(e){invalid.push({row:row.line,name:row.fields[0]||'',formula:row.fields[1]||'',error:e.message});}}
  return {valid,invalid};
}
export function safeCell(value) {
  const s=value==null?'':String(value);
  if(typeof value==='number')return s;
  // Normalise only for detection; preserve the original scientific/name text.
  const probe=s.normalize('NFKC').replace(/^[\s\p{Cc}\p{Cf}]*/u,'');
  return /^[=+\-@]/.test(probe)||/^[\p{Cc}\p{Cf}]/u.test(s)?"'"+s:s;
}
export function csv(rows,delimiter=',') {
  return rows.map(r=>r.map(v=>{
    const s=safeCell(v);
    return /["\r\n,;\t]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
  }).join(delimiter)).join('\r\n');
}
