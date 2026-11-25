"""Optional independent Decimal arithmetic. No application imports or data-file reads.
Constants transcribed from NIST Atomic Weights and Isotopic Compositions.
This validates arithmetic; it is not independent experimental confirmation of NIST.
"""
from decimal import Decimal as D
import json
exact = {'C':D('12'), 'H':D('1.00782503223'), 'N':D('14.00307400443'), 'O':D('15.99491461957'), 'Cl':D('34.968852682'), 'Br':D('78.9183376'), 'S':D('31.9720711744'), 'P':D('30.97376199842')}
cases = [('Caffeine','C8H10N4O2',{'C':8,'H':10,'N':4,'O':2}),('Glucose','C6H12O6',{'C':6,'H':12,'O':6}),('Citric acid','C6H8O7',{'C':6,'H':8,'O':7}),('Chlorobenzene','C6H5Cl',{'C':6,'H':5,'Cl':1}),('Bromobenzene','C6H5Br',{'C':6,'H':5,'Br':1}),('Methionine','C5H11NO2S',{'C':5,'H':11,'N':1,'O':2,'S':1}),('Glucose 6-phosphate','C6H13O9P',{'C':6,'H':13,'O':9,'P':1}),('Isopropanol','(CH3)2CHOH',{'C':3,'H':8,'O':1})]
print(json.dumps([{'name':name,'formula':formula,'expected':str(sum(exact[e]*n for e,n in counts.items()))} for name,formula,counts in cases],indent=2))
