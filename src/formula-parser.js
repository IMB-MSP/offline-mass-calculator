import {ELEMENTS} from '../data/atomic-masses.js';
export function parseFormula(input){
 const s=String(input).trim(); if(!s||s.length>500)throw Error('Enter a formula of 1–500 characters.');let i=0;
 const count=()=>{const start=i;while(/\d/.test(s[i]||'x'))i++;if(start===i)return 1;const n=Number(s.slice(start,i));if(!Number.isSafeInteger(n)||n<1||n>10000)throw Error('Counts must be integers from 1 to 10,000.');return n;};
 function group(depth){if(depth>12)throw Error('Parentheses are nested too deeply.');const out={};let terms=0;while(i<s.length&&s[i]!==')'){let part;if(s[i]==='('){i++;part=group(depth+1);if(s[i]!==')')throw Error('Missing closing parenthesis.');i++;}else{const m=s.slice(i).match(/^[A-Z][a-z]?/);if(!m)throw Error(`Unexpected “${s[i]}” at position ${i+1}. Use neutral formulas only.`);i+=m[0].length;if(!ELEMENTS[m[0]])throw Error(`Unknown element: ${m[0]}.`);part={[m[0]]:1};}const n=count();for(const [e,c] of Object.entries(part))out[e]=(out[e]||0)+c*n;terms++;if(Object.values(out).reduce((a,b)=>a+b,0)>10000)throw Error('Maximum 10,000 atoms per molecule.');}if(!terms)throw Error('Empty formula or parentheses.');return out;}
 const result=group(0);if(i!==s.length)throw Error('Unexpected closing parenthesis.');return result;
}
export function hill(c){const keys=Object.keys(c).filter(k=>c[k]>0).sort();if(c.C){keys.splice(keys.indexOf('C'),1);if(c.H)keys.splice(keys.indexOf('H'),1);keys.unshift(...(c.H?['C','H']:['C']));}return keys.map(k=>k+(c[k]===1?'':c[k])).join('');}
