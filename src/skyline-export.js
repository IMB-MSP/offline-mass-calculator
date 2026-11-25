import {csv} from './csv-handler.js';
export function skylineRows(ions){return [['Molecule List Name','Precursor Name','Precursor Formula','Precursor Adduct','Precursor Charge','Precursor m/z'],...ions.map(i=>['Offline Mass Calculator '+i.compound.id,i.compound.name,i.compound.formula,i.adduct.name,i.charge,i.mz])];}
export function skylineCSV(ions){return csv(skylineRows(ions));}
