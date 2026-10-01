from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'assets/force-approved-board.png').convert('RGB')
# Representative regions from the approved bottom ruler.  Assert each FORCE
# semantic band is materially present in the raster artwork.
regions={
    'red': (420,850,670,925),
    'gold': (670,850,880,925),
    'green': (880,850,1210,925),
}
checks=0
for name,box in regions.items():
    crop=im.crop(box)
    px=list(crop.getdata())
    if name=='red':
        hits=sum(1 for r,g,b in px if r>120 and r>g*1.15 and r>b*1.05)
    elif name=='gold':
        hits=sum(1 for r,g,b in px if r>120 and g>90 and r>b*1.3 and g>b*1.25)
    else:
        hits=sum(1 for r,g,b in px if g>100 and g>r*1.25 and g>b*.9)
    assert hits>40, f'{name} FORCE ruler band missing ({hits} matching pixels)'
    checks+=1
print(f'PASS: V54 approved PNG rating ruler ({checks} bands)')
