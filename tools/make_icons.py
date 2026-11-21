"""Draws the app icons (teal chip with a network node graph)."""
from PIL import Image, ImageDraw
import pathlib, sys
OUT = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "icons")
OUT.mkdir(exist_ok=True)
def icon(size, name, pad=0.0):
    S=size*4; im=Image.new("RGBA",(S,S),(10,90,90,255)); d=ImageDraw.Draw(im)
    m=int(S*(0.20+pad)); w=max(4,S//28)
    d.rounded_rectangle([m,m,S-m,S-m],radius=S//14,outline="white",width=w)
    n=3; step=(S-2*m)/(n+1)
    for i in range(1,n+1):  # chip legs
        x=int(m+i*step); L=int(S*0.07)
        for (a,b,c,e) in [(x,m-L,x,m),(x,S-m,x,S-m+L),(m-L,x,m,x),(S-m,x,S-m+L,x)]:
            d.line([a,b,c,e],fill="white",width=w)
    cx,cy=S//2,S//2; r=int(S*0.055)
    pts=[(cx,int(cy-S*0.12)),(int(cx-S*0.12),int(cy+S*0.10)),(int(cx+S*0.12),int(cy+S*0.10))]
    for p in pts: d.line([cx,cy,p[0],p[1]],fill=(255,201,74,255),width=w)
    for p in pts+[(cx,cy)]:
        col=(255,201,74,255) if p==(cx,cy) else "white"
        d.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r],fill=col)
    im.resize((size,size),Image.LANCZOS).save(OUT/name)
icon(192,"icon-192.png"); icon(512,"icon-512.png"); icon(180,"apple-touch-icon.png"); icon(512,"icon-maskable.png",pad=0.07)
print("icons ok")
