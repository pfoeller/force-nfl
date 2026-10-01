from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'assets/force-approved-board.png').convert('RGB')
# Ghost-row zone must be background-like across the old ruler band.
for pt in [(435,860),(490,860),(705,860),(977,860),(1108,860)]:
    r,g,b=im.getpixel(pt)
    assert max(r,g,b)<90, f'ghost ruler remains at {pt}: {(r,g,b)}'
# Intended single ruler: major ticks at 10/30/50/80 and endpoint labels.
for pt in [(552,887),(675,887),(799,887),(984,887)]:
    r,g,b=im.getpixel(pt)
    assert max(r,g,b)>100, f'active ruler missing at {pt}: {(r,g,b)}'
# Check contiguous band colors at representative major ticks.
for pt,name in [((552,887),'red'),((675,887),'red'),((799,887),'gold'),((984,887),'green')]:
    r,g,b=im.getpixel(pt)
    if name=='red': assert r>150 and r>g*1.25, (pt,(r,g,b))
    elif name=='gold': assert r>150 and g>110 and b<130, (pt,(r,g,b))
    else: assert g>130 and g>r*1.15, (pt,(r,g,b))
print('PASS: V56 single centered ruler')
