#!/usr/bin/env python3
"""Run every LOGC Python snippet (question bank, lessons, predict deck) and check the stated answers.
Needs node to read the JS source. Exit code 1 if anything disagrees."""
import json, subprocess, sys, io, builtins, pathlib, contextlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
js = "".join((ROOT/"src"/f).read_text() for f in ["10-content.js","12-lessons.js","15-traces.js"])
js += "\nconsole.log(JSON.stringify({bank:BANK.filter(q=>q.t[0]==='l'), lessons:LESSONS, traces:TRACES, predict:typeof PREDICT_DECK!=='undefined'?PREDICT_DECK:[]}));"
data = json.loads(subprocess.run(["node","-e",js],capture_output=True,text=True,check=True).stdout)

def run(code, inputs=()):
    ins = list(inputs); out = io.StringIO()
    def fake(prompt=""):
        v = ins.pop(0); out.write(str(prompt)+v+"\n"); return v
    old = builtins.input; builtins.input = fake
    try:
        with contextlib.redirect_stdout(out): exec(compile(code,"<q>","exec"), {"__builtins__":builtins})
    finally: builtins.input = old
    return out.getvalue().rstrip("\n")

bad = 0; n = 0
def check(label, got, want):
    global bad, n; n += 1
    if got.strip() != str(want).strip():
        bad += 1; print(f"✗ {label}\n   got:  {got!r}\n   want: {want!r}")

for q in data["bank"]:
    if q["ty"]=="trace":
        n += 1
        if q["tr"] not in data["traces"]: bad += 1; print("✗ missing trace", q["id"])
        continue
    if not q.get("code") or ("out" not in q and "predict" not in (q.get("tags") or [])): continue
    out = run(q["code"], q.get("in",[]))
    if "out" in q: check(q["id"]+" (out)", out, q["out"]); continue
    if "predict" not in (q.get("tags") or []): continue
    want = q["o"][q["a"]] if q["ty"]=="mc" else q["a"][0] if q["ty"]=="fill" else None
    last = out.split("\n")[-1]
    check(q["id"], out if out==want else last, want)

for tid, screens in data["lessons"].items():
    for k, sc in enumerate(screens):
        if sc.get("code") and "out" in sc: check(f"lesson {tid} screen {k+1}", run(sc["code"], sc.get("in",[])), sc["out"])
        if sc.get("run") and sc.get("code"):  # runnable code must not crash with its sample inputs
            try: run(sc["run"].get("code") or sc["code"], sc["run"].get("inputs",[]))
            except Exception as e: bad += 1; print(f"✗ lesson {tid} screen {k+1} runner: {e}")
        c = sc.get("check")
        if c and c.get("code"):
            got = run(c["code"]); check(f"lesson {tid} check {k+1}", got, c["o"][c["a"]])
        v = sc.get("vis") or {}
        if v.get("k")=="tt" and v["id"] not in data["traces"]: bad += 1; print("✗ missing trace", v["id"])
        if v.get("k")=="range":
            n += 1  # range visual is computed in JS the same way as Python; spot-check
            py = list(range(v.get("start",0), v["stop"], v.get("step",1)))
            js_vals = []; i=v.get("start",0); st=v.get("step",1)
            while (i < v["stop"] if st>0 else i > v["stop"]): js_vals.append(i); i+=st
            if py != js_vals: bad += 1; print("✗ range", v)

for d in data["predict"]:
    c, a = (d[0], d[1]) if isinstance(d, list) else (d.get("c"), d.get("a"))
    check("predict deck: "+c[:30], run(c), a)

print(f"{n} checks, {bad} problems")
sys.exit(1 if bad else 0)
