#!/usr/bin/env python3
"""Check COHW answers that can be computed or looked up: DDR bandwidth, PSU wall draw, RAID capacity,
pixel counts, address space, USB/Thunderbolt speeds, form factors. Also checks the lesson pixel table.
Exit code 1 if anything disagrees."""
import json, subprocess, sys, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = "".join((ROOT/"src"/f).read_text() for f in ["10-content.js","12-lessons.js","13-lessons-ntwk.js","14-lessons-cohw.js"])
src += "\nconsole.log(JSON.stringify({bank:BANK.filter(q=>q.s==='cohw'), c9:LESSONS.c9, c4:LESSONS.c4, c6:LESSONS.c6, c7:LESSONS.c7}));"
f = pathlib.Path("/tmp/_cohw_check.js"); f.write_text(src)
d = json.loads(subprocess.run(["node", str(f)], capture_output=True, text=True, check=True).stdout)
USB = {"1.1":"12 Mbps","2.0":"480 Mbps","3.2 Gen 1":"5 Gbps","3.2 Gen 2":"10 Gbps","3.2 Gen 2x2":"20 Gbps","USB4":"40 Gbps","Thunderbolt 3":"40 Gbps","Thunderbolt 4":"40 Gbps","Thunderbolt 5":"80 Gbps"}
FF = {"ATX":(305,244),"Micro-ATX":(244,244),"Mini-ITX":(170,170)}
bad = n = 0
def num(x): return float(re.sub(r"[^0-9.]","",str(x)) or "nan")
def check(label, got, want):
    global bad, n; n += 1
    ok = (abs(num(got)-num(want))<1e-9) if isinstance(got,(int,float)) else str(got).lower()==str(want).lower()
    if not ok: bad += 1; print(f"✗ {label}: answer {want!r}, correct {got!r}")
for q in d["bank"]:
    v = q.get("v")
    if not v: continue
    a = q["o"][q["a"]] if q["ty"]=="mc" else q["a"][0] if q["ty"]=="fill" else q["a"]
    k = v["k"]
    if k=="ddr": got = v["mt"]*8; check(q["id"], got, a if q["ty"]=="fill" else re.sub(r"^PC\d-","",a))
    elif k=="psu": check(q["id"], round(v["out"]/v["eff"]), a)
    elif k=="raid":
        lv,nd,sz = v["lvl"],v["n"],v["size"]; got = {0:nd*sz,1:sz,5:(nd-1)*sz,6:(nd-2)*sz,10:nd*sz/2}[lv]; check(q["id"], got, a)
    elif k=="mul": check(q["id"], v["x"]*v["y"], a)
    elif k=="ratio": check(q["id"], (v["a"][0]*v["a"][1])/(v["b"][0]*v["b"][1]), a)
    elif k=="addr": check(q["id"], 2**v["bits"]/2**30, a)  # GB
    elif k=="usb": check(q["id"], USB[v["std"]], a)
    elif k=="ff": check(q["id"], max(FF, key=lambda x: FF[x][0]*FF[x][1]), a)
# lesson numbers
for row in next(s for s in d["c9"] if s.get("vis",{}).get("k")=="table" and "Pixels" in s["vis"]["h"])["vis"]["rows"]:
    w,h = map(int, row[1].replace(" ","").split("×")); check("lesson c9 "+row[0], w*h, row[2].replace(",",""))
def lesson_check(sc_list, compute):
    c = next(s["check"] for s in sc_list if s.get("check")); check("lesson check", compute(), c["o"][c["a"]])
lesson_check(d["c4"], lambda: 2400*8)
lesson_check(d["c6"], lambda: round(400/0.8))
lesson_check(d["c7"], lambda: (4-1)*2)
print(f"{n} checks, {bad} problems"); sys.exit(1 if bad else 0)
