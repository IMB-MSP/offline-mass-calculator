import fs from 'node:fs';
const html=fs.readFileSync('data/nist-reference.txt','utf8');
const elements={}; let current;
for(const line of html.split('\n')){
 const first=line.match(/^\d+\s+([A-Z][a-z]?)\s+/); if(first){current=first[1];elements[current]={isotopes:[],average:null};}
 if(!current)continue;
 const m=line.match(/^(?:\d+\s+[A-Z][a-z]?\s+|\s+(?:[DT]\s+)?)(\d+)\s+(\d+\.\d+)\([^)]*\)\s*(.*)$/); if(!m)continue;
 const tail=m[3];const abundance=tail.match(/^(0\.\d+(?:\([^)]*\))?|1)(?:\s|$)/);
 if(abundance)elements[current].isotopes.push({number:+m[1],mass:+m[2],abundance:parseFloat(abundance[1])});
 if(first){const weight=tail.replace(/^(0\.\d+(?:\([^)]*\))?|1)\s+/,'').trim();const interval=weight.match(/^\[([\d.]+),([\d.]+)\]/);const scalar=weight.match(/^(\d+\.\d+)/);elements[current].average=interval?(+interval[1]+ +interval[2])/2:scalar?+scalar[1]:null;elements[current].weightInterval=interval?[+interval[1],+interval[2]]:null;}
}
for(const e of Object.values(elements)){e.isotopes.sort((a,b)=>a.mass-b.mass);e.mono=e.isotopes.length?e.isotopes.reduce((a,b)=>a.abundance>b.abundance?a:b).mass:null;}
if(Object.keys(elements).length!==118)throw Error('Expected 118 elements');
fs.writeFileSync('data/atomic-masses.js',`// NIST Atomic Weights and Isotopic Compositions, frozen retrieval 2026-11-05.\nexport const REFERENCE_VERSION='NIST-compositions-2026-11-05';\nexport const ELECTRON_MASS=0.000548579909065; // CODATA 2018, u\nexport const ELEMENTS=${JSON.stringify(elements,null,2)};\n`);
