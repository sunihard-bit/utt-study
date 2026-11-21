#!/usr/bin/env python3
"""Check NTWK subnetting, binary, class, private-range and port answers (question bank and lesson visuals)
against Python's ipaddress module. Exit code 1 if anything disagrees."""
import json, subprocess, sys, ipaddress, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = "".join((ROOT/"src"/f).read_text() for f in ["10-content.js","12-lessons.js","13-lessons-ntwk.js","15-traces.js"])
src += (ROOT/"src"/"45-lessons.js").read_text().split("/* ---------- network visuals ---------- */")[1].split("/* ---------- trace table player")[0]
src += """
const out = {bank:BANK.filter(q=>q.s==='ntwk'), ports:PORT_DECK, ipvis:[]};
for(const [t,sc] of Object.entries(LESSONS)) for(const s of sc) for(const v of [s.vis,s.vis2]) if(v&&v.k==='ip') out.ipvis.push({ip:v.ip,cidr:v.cidr,js:ipCalc(v.ip,v.cidr)});
for(const [t,sc] of Object.entries(LESSONS)) for(const s of sc) for(const v of [s.vis,s.vis2]) if(v&&v.k==='bin') out.ipvis.push({bin:v.n});
console.log(JSON.stringify(out));"""
js_file = pathlib.Path("/tmp/_ntwk_check.js"); js_file.write_text("const window={};const STANDALONE=true;const esc=s=>s;\n"+src)
data = json.loads(subprocess.run(["node", str(js_file)], capture_output=True, text=True, check=True).stdout)
PORTS = {"FTP":"20/21","SSH":"22","Telnet":"23","SMTP":"25","DNS":"53","DHCP":"67/68","HTTP":"80","POP3":"110","IMAP":"143","HTTPS":"443","RDP":"3389"}
bad = n = 0
def check(label, got, want):
    global bad, n; n += 1
    if str(got).strip().lower() != str(want).strip().lower(): bad += 1; print(f"✗ {label}: answer {want!r}, correct {got!r}")
def ans(q): return q["o"][q["a"]] if q["ty"]=="mc" else (q["a"][0] if q["ty"]=="fill" else q["a"])
for q in data["bank"]:
    v = q.get("v")
    if not v: continue
    k, a = v["k"], ans(q)
    if k in ("net","bc","first","last","hosts"):
        net = ipaddress.ip_interface(v["ip"]).network; hosts = list(net.hosts())
        got = {"net":net.network_address,"bc":net.broadcast_address,"first":hosts[0],"last":hosts[-1],"hosts":len(hosts)}[k]
        check(q["id"], got, a)
    elif k=="mask": check(q["id"], ipaddress.ip_network(f"0.0.0.0/{v['cidr']}").netmask, a)
    elif k=="b2d": check(q["id"], int(v["b"],2), a)
    elif k=="d2b": check(q["id"], format(v["n"],"08b"), a)
    elif k=="private": check(q["id"], ipaddress.ip_address(v["ip"]).is_private, a)
    elif k=="public": check(q["id"], v["ip"], a); n+=1; bad += ipaddress.ip_address(v["ip"]).is_private and print("✗ not public", v) is None
    elif k=="class":
        f = int(v["ip"].split(".")[0]); got = "A" if 1<=f<=126 else "B" if f<=191 else "C" if f<=223 else "D" if f<=239 else "E"; check(q["id"], got, a)
    elif k=="port": check(q["id"], PORTS[v["p"]], a)
    # every option of a 'public' question other than the answer must be private
    if k=="public":
        for o in q["o"]:
            if o!=a and not ipaddress.ip_address(o).is_private: bad+=1; print("✗ option also public", q["id"], o)
for p, num in data["ports"]: check("port deck "+p, PORTS[p], num)
for x in data["ipvis"]:
    if "bin" in x: n += 1; continue
    net = ipaddress.ip_interface(f"{x['ip']}/{x['cidr']}").network; h = list(net.hosts()); js = x["js"]
    for key, want in [("net",net.network_address),("bc",net.broadcast_address),("first",h[0]),("last",h[-1]),("hosts",len(h)),("mask",net.netmask)]:
        check(f"lesson ip {x['ip']}/{x['cidr']} {key}", want, js[key])
print(f"{n} checks, {bad} problems"); sys.exit(1 if bad else 0)
