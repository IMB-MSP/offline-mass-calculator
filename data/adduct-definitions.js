const def=(id,name,add,remove={},charge=1,multiplier=1,enabled=false)=>({id,name,add,remove,charge,multiplier,enabled,loss:Object.keys(remove).length>0});
export const ADDUCTS=[def('H','[M+H]+',{H:1},{},1,1,true),def('Na','[M+Na]+',{Na:1},{},1,1,true),def('NH4','[M+NH4]+',{N:1,H:4},{},1,1,true),def('K','[M+K]+',{K:1},{},1,1,true),def('2H','[M+2H]2+',{H:2},{},2),def('3H','[M+3H]3+',{H:3},{},3),def('dH','[2M+H]+',{H:1},{},1,2),def('dNa','[2M+Na]+',{Na:1},{},1,2),def('ACN','[M+CH3CN+H]+',{C:2,H:4,N:1}),def('MeOH','[M+CH3OH+H]+',{C:1,H:5,O:1}),def('water','[M+H-H2O]+',{H:1},{H:2,O:1}),def('ammonia','[M+H-NH3]+',{H:1},{N:1,H:3})];
// Deprotonation is not a neutral fragmentation loss. Only water loss is flagged.
export const NEGATIVE_ADDUCTS=[
 {...def('negH','[M-H]-',{}, {H:1},-1,1,true),loss:false},
 def('Cl','[M+Cl]-',{Cl:1},{},-1,1,true),
 def('formate','[M+CHO2]-',{C:1,H:1,O:2},{},-1,1,true),
 def('acetate','[M+C2H3O2]-',{C:2,H:3,O:2},{},-1,1,true),
 {...def('neg2H','[M-2H]2-',{}, {H:2},-2),loss:false},
 {...def('neg3H','[M-3H]3-',{}, {H:3},-3),loss:false},
 {...def('negDimer','[2M-H]-',{}, {H:1},-1,2),loss:false},
 {...def('negNa','[M+Na-2H]-',{Na:1},{H:2},-1),loss:false},
 def('negWater','[M-H-H2O]-',{}, {H:3,O:1},-1)
];
