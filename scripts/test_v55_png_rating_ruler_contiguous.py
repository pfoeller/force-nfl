from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'assets/force-approved-board.png').convert('RGB')
# Sample major ticks only to verify the three semantic bands are contiguous and not interspersed.
samples={
    'red':   [(554,900),(616,900),(677,900),(739,900)],
    'gold':  [(801,900),(862,900),(924,900)],
    'green': [(986,900),(1047,900)],
}
checks=0
for name,pts in samples.items():
    for x,y in pts:
        r,g,b=im.getpixel((x,y))
        if name=='red':
            assert r>150 and r>g*1.35 and r>b*1.05, f'red band contaminated at {(x,y)}: {(r,g,b)}'
        elif name=='gold':
            assert r>160 and g>120 and r>b*1.45 and g>b*1.35, f'gold band contaminated at {(x,y)}: {(r,g,b)}'
        else:
            assert g>140 and g>r*1.20 and g>b*1.05, f'green band contaminated at {(x,y)}: {(r,g,b)}'
        checks += 1
print(f'PASS: V55 approved PNG rating ruler contiguous bands ({checks} samples)')
