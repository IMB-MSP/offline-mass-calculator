import {ADDUCTS,NEGATIVE_ADDUCTS} from '../data/adduct-definitions.js';

// Each polarity has independent definitions, presets and saved UI choices.
export const ION_MODES = {
  positive: {
    available: true,
    definitions: ADDUCTS,
    presets: {
      common: ADDUCTS.filter(a => a.enabled).map(a => a.id),
      protonated: ['H'],
      all: ADDUCTS.map(a => a.id),
    },
    groups: [
      ['Common adducts', ['H', 'Na', 'NH4', 'K']],
      ['Multiply charged ions', ['2H', '3H']],
      ['Multimers', ['dH', 'dNa']],
      ['Solvent clusters', ['ACN', 'MeOH']],
      ['Neutral-loss candidates', ['water', 'ammonia']],
    ],
  },
  negative: {available: true, definitions: NEGATIVE_ADDUCTS, presets: {common: NEGATIVE_ADDUCTS.filter(a=>a.enabled).map(a=>a.id), protonated:['negH'], all:NEGATIVE_ADDUCTS.map(a=>a.id)}, groups:[['Common negative ions',['negH','Cl','formate','acetate']],['Multiply charged ions',['neg2H','neg3H']],['Multimers',['negDimer']],['Metal exchange',['negNa']],['Neutral-loss candidates',['negWater']]]},
};
