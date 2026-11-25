"""Independent NIST-literal Decimal reference; no imports from app/data modules."""
from decimal import Decimal as D
import json
m={'C':D('12'),'H':D('1.00782503223'),'O':D('15.99491461957'),'Cl':D('34.968852682'),'Na':D('22.9897692820')}
e=D('0.000548579909065')
# Full ionic compositions for neutral glucose C6H12O6, transcribed explicitly.
cases=[('negH',{'C':6,'H':11,'O':6},-1),('Cl',{'C':6,'H':12,'O':6,'Cl':1},-1),('formate',{'C':7,'H':13,'O':8},-1),('acetate',{'C':8,'H':15,'O':8},-1),('neg2H',{'C':6,'H':10,'O':6},-2),('neg3H',{'C':6,'H':9,'O':6},-3),('negDimer',{'C':12,'H':23,'O':12},-1),('negNa',{'C':6,'H':10,'O':6,'Na':1},-1),('negWater',{'C':6,'H':9,'O':5},-1)]
print(json.dumps([{'id':id,'composition':c,'charge':z,'expected':str((sum(m[k]*n for k,n in c.items())-z*e)/abs(z))} for id,c,z in cases],indent=2))
