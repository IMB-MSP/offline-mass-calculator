import {ELEMENTS,ELECTRON_MASS} from '../data/atomic-masses.js';
// Exact isotope-count enumeration per element, then bounded convolution.
export function isotopePattern(composition,charge=1){
 if(Object.values(composition).reduce((a,b)=>a+b,0)>600)throw Error('Isotope preview limited to 600 ion atoms; mass calculations remain available.');
 let operations=0;
 let peaks=[{mass:0,p:1,nominal:0}];let base=0;const limit=4096;
 for(const [symbol,n] of Object.entries(composition)){
 const iso=ELEMENTS[symbol].isotopes;if(!iso.length)throw Error(`No natural isotope distribution for ${symbol}.`);
 const ref=iso.reduce((a,b)=>a.abundance>b.abundance?a:b);base+=ref.mass*n;
 const sum=iso.reduce((a,b)=>a+b.abundance,0);let states=new Map([['0'.repeat(0),{counts:Array(iso.length).fill(0),p:1}]]);
 for(let atom=0;atom<n;atom++){const next=new Map();for(const v of states.values())for(let j=0;j<iso.length;j++){if(++operations>2000000)throw Error('Isotope composition exceeds the two-million-operation preview budget. Mass calculations remain available.');const counts=v.counts.slice();counts[j]++;const key=counts.join(',');const p=v.p*iso[j].abundance/sum;if(next.has(key))next.get(key).p+=p;else next.set(key,{counts,p});}states=new Map([...next].filter(([,v])=>v.p>1e-16).sort((a,b)=>b[1].p-a[1].p).slice(0,limit));}
 const ep=[...states.values()].map(v=>({p:v.p,mass:v.counts.reduce((a,k,j)=>a+k*iso[j].mass,0),nominal:v.counts.reduce((a,k,j)=>a+k*(iso[j].number-ref.number),0)}));
 // Keep work bounded even for elements with many stable isotopes.
 const next=[];for(const a of peaks)for(const b of ep){if(++operations>2000000)throw Error('Isotope composition exceeds the two-million-operation preview budget. Mass calculations remain available.');const p=a.p*b.p;if(p>1e-14)next.push({mass:a.mass+b.mass,p,nominal:a.nominal+b.nominal});if(next.length>=250000){next.sort((a,b)=>b.p-a.p);next.length=limit;}}
 peaks=next.sort((a,b)=>b.p-a.p).slice(0,limit);
 }
 const retained=peaks.reduce((a,b)=>a+b.p,0),max=Math.max(...peaks.map(p=>p.p));
 const groups=[0,1,2].map(n=>{const ps=peaks.filter(p=>p.nominal===n),p=ps.reduce((a,b)=>a+b.p,0);return {nominal:n,p,mz:p? (ps.reduce((a,b)=>a+b.mass*b.p,0)/p-charge*ELECTRON_MASS)/Math.abs(charge):null};});
 return {peaks:peaks.map(p=>({...p,mz:(p.mass-charge*ELECTRON_MASS)/Math.abs(charge),relative:p.p/max*100,shift:(p.mass-base)/Math.abs(charge)})).sort((a,b)=>a.mz-b.mz),groups,retained,base:(base-charge*ELECTRON_MASS)/Math.abs(charge)};
}
