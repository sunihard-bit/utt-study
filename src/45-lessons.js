/* =================== PICTURE LESSONS: player, flowcharts, trace tables, Python runner =================== */
const LTAG = {every:"🏝️ Everyday picture", def:"📘 Definition", ex:"✏️ Worked example", check:"✅ Quick check", tricky:"⚠️ Tricky bit", mist:"❌ Common mistakes", key:"🔑 Remember this", try:"▶️ Try it"};
let LZ = null;   /* current lesson: {t, i, checks:{}} */
const ptext = s => inl(s).replace(/\n/g,"<br>");

/* ---------- flowchart (SVG) ----------
   spec: {n:[[id, shape, text, row, col=0, codeLine?], ...], e:"chain" | [[from, to, label?], ...]}
   shapes: term (oval), io (parallelogram), proc (rectangle), dec (diamond) */
function fcNodes(spec){
  const CW = 172, RH = 74;
  const ns = spec.n.map(([id,s,t,r,c=0,ln=null])=>{
    const lines = String(t).split("\n"), long = Math.max(...lines.map(x=>x.length));
    let w = Math.max(s==="dec"?120:96, long*7.4+(s==="dec"?46:s==="io"?40:26)); w = Math.min(w, s==="dec"?168:162);
    const h = s==="dec" ? Math.max(58, lines.length*15+34) : Math.max(38, lines.length*15+16);
    return {id,s,t,lines,r,c,ln,w,h,x:0,y:r*RH+34};
  });
  const cols = ns.map(n=>n.c), minC = Math.min(0,...cols), maxC = Math.max(0,...cols);
  const anyLoop = spec.e!=="chain" && spec.e.some(([a,b])=>{ const A=ns.find(n=>n.id===a), B=ns.find(n=>n.id===b); return B.r<=A.r && B.c===A.c; });
  const left = anyLoop ? 44 : 10;
  ns.forEach(n=>n.x = left + (n.c-minC)*CW + 86);
  const W = left + (maxC-minC+1)*CW + 10, H = Math.max(...ns.map(n=>n.y+n.h/2)) + 18;
  return {ns, W, H, left};
}
function fcShape(n){
  const {x,y,w,h,s} = n, l=x-w/2, t=y-h/2;
  const shape = s==="term" ? `<rect x="${l}" y="${t}" width="${w}" height="${h}" rx="${h/2}"/>`
    : s==="io" ? `<polygon points="${l+12},${t} ${l+w},${t} ${l+w-12},${t+h} ${l},${t+h}"/>`
    : s==="dec" ? `<polygon points="${x},${t} ${l+w},${y} ${x},${t+h} ${l},${y}"/>`
    : `<rect x="${l}" y="${t}" width="${w}" height="${h}" rx="4"/>`;
  const ty = y - (n.lines.length-1)*7.5 + 4.5;
  return `<g class="fn fn-${s}" data-ln="${n.ln??""}">${shape}${n.lines.map((ln,k)=>`<text x="${x}" y="${ty+k*15}">${esc(ln)}</text>`).join("")}</g>`;
}
function flowSVG(spec, title){
  const {ns, W, H, left} = fcNodes(spec), by = Object.fromEntries(ns.map(n=>[n.id,n]));
  const edges = spec.e==="chain" ? ns.slice(1).map((n,k)=>[ns[k].id, n.id]) : spec.e;
  const merges = {};   /* side branches rejoining the main column share one merge point */
  let paths = "", labels = "";
  for(const [a,b,lab] of edges){
    const A=by[a], B=by[b]; let d, lx, ly, anchor="start";
    const bot = A.y+A.h/2, top = B.y-B.h/2;
    if(B.r > A.r && B.c === A.c){ d=`M${A.x},${bot} V${top}`; lx=A.x+7; ly=bot+14; }
    else if(B.r >= A.r && B.c !== A.c && A.s==="dec"){ const sx = B.c>A.c ? A.x+A.w/2 : A.x-A.w/2; d=`M${sx},${A.y} H${B.x} V${top}`; lx = B.c>A.c ? sx+6 : sx-6; ly=A.y-6; anchor = B.c>A.c?"start":"end"; if(B.r===A.r){ const ex = B.c>A.c ? B.x-B.w/2 : B.x+B.w/2; d=`M${sx},${A.y} H${ex}`; } }
    else if(B.r > A.r){ const my = top-14; d=`M${A.x},${bot} V${my} H${B.x} V${top}`; merges[b]=1; }
    else { /* loop back up to an earlier step */
      const goRight = B.c > A.c; const mx = left-26 + (B.c - Math.min(...ns.map(n=>n.c)))*0;
      const tx = B.x - B.w/2;
      d = `M${A.x},${bot} V${bot+12} H${mx} V${B.y} H${tx}`; lx = mx+4; ly = bot+26;
    }
    paths += `<path d="${d}" marker-end="url(#fcArr)"/>`;
    if(lab) labels += `<text class="fl" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(lab)}</text>`;
  }
  return `<div class="fcwrap">${title?`<div class="vis-title">${esc(title)}</div>`:""}<svg class="fc" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${esc(title||"Flowchart")}: ${esc(ns.map(n=>n.t.replace(/\n/g," ")).join(", then "))}">
  <defs><marker id="fcArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fa"/></marker></defs>
  <g class="fe">${paths}</g>${ns.map(fcShape).join("")}${labels}</svg></div>`;
}
function symbolsSVG(){
  const items = [["term","Start / Stop","Terminator: where the algorithm begins and ends"],["io","Input / Output","Parallelogram: read a value or display one"],["proc","Process","Rectangle: a calculation or assignment"],["dec","Decision","Diamond: a yes/no question with two exits"]];
  return `<div class="symgrid">${items.map(([s,t,d])=>{ const n={s,lines:[t],x:80,y:34,w:s==="dec"?132:128,h:s==="dec"?60:40}; return `<div class="sym"><svg class="fc" viewBox="0 0 160 68">${fcShape(n)}</svg><span>${esc(d)}</span></div>`; }).join("")}
  <div class="sym"><svg class="fc" viewBox="0 0 160 68"><g class="fe"><path d="M20,34 H140" marker-end="url(#fcArr2)"/></g><defs><marker id="fcArr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="fa"/></marker></defs></svg><span>Flow line: the arrow shows which step comes next</span></div></div>`;
}

/* ---------- other lesson visuals ---------- */
function cycleSVG(items){
  const N=items.length, cx=170, cy=150, R=112;
  const pts = items.map((_,k)=>{ const a = -Math.PI/2 + k*2*Math.PI/N; return [cx+R*Math.cos(a), cy+R*Math.sin(a)]; });
  const arcs = pts.map((p,k)=>{ const a1=-Math.PI/2+(k+.28)*2*Math.PI/N, a2=-Math.PI/2+(k+.72)*2*Math.PI/N; return `<path d="M${cx+R*Math.cos(a1)},${cy+R*Math.sin(a1)} A${R},${R} 0 0 1 ${cx+R*Math.cos(a2)},${cy+R*Math.sin(a2)}" marker-end="url(#cyArr)"/>`; }).join("");
  return `<svg class="cyc" viewBox="0 0 340 300" role="img" aria-label="Cycle: ${esc(items.map(x=>x[0]).join(", "))}, then back to the start"><defs><marker id="cyArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="fa"/></marker></defs>
  <g class="fe">${arcs}</g><text class="cyc-mid" x="${cx}" y="${cy-4}">${esc(items.mid||"")}</text>
  ${pts.map(([x,y],k)=>`<g class="cy"><rect x="${x-52}" y="${y-19}" width="104" height="38" rx="10"/><text x="${x}" y="${y-2}" class="cyn">${k+1}. ${esc(items[k][0])}</text><text x="${x}" y="${y+12}" class="cyd">${esc(items[k][1])}</text></g>`).join("")}</svg>`;
}
function rangeHTML({start=0, stop, step=1}){
  const vals=[]; for(let i=start; step>0?i<stop:i>stop; i+=step) vals.push(i);
  const lo=Math.min(start,stop)-(step>0?0:1), hi=Math.max(start,stop)+(step>0?1:0), nums=[]; for(let i=lo;i<=hi;i++) nums.push(i);
  return `<div class="rng"><div class="rng-row">${nums.map(n=>`<span class="${vals.includes(n)?"in":""} ${n===stop?"stop":""}">${n}${n===stop?"<small>stop</small>":""}${n===start?"<small>start</small>":""}</span>`).join("")}</div>
  <div class="rng-cap"><code>range(${start===0&&step===1?"":start+", "}${stop}${step!==1?", "+step:""})</code> gives <b>${vals.join(", ")}</b> (${vals.length} value${vals.length===1?"":"s"})</div></div>`;
}
function visHTML(v){
  if(!v) return "";
  if(v.k==="flow") return flowSVG(v, v.title);
  if(v.k==="symbols") return symbolsSVG();
  if(v.k==="cycle"){ const it=v.items.slice(); it.mid=v.mid; return `<div class="fcwrap">${cycleSVG(it)}</div>`; }
  if(v.k==="range") return rangeHTML(v);
  if(v.k==="tt") return ttPlayerHTML(v.id);
  if(v.k==="side") return `<div class="side">${flowSVG(v)}<pre class="qcode sidecode">${v.code.split("\n").map((l,k)=>`<span data-cl="${k+1}">${esc(l)||" "}</span>`).join("\n")}</pre></div><p class="muted sidehint">Tap a flowchart shape to see its line of Python.</p>`;
  if(v.k==="ipo") return `<div class="ipo">${[["Input",v.i],["Process",v.p],["Output",v.o]].map(([h,xs],k)=>`<div class="ipoc"><b>${h}</b>${xs.map(x=>`<span>${inl(x)}</span>`).join("")}</div>${k<2?`<i aria-hidden="true">→</i>`:""}`).join("")}</div>`;
  if(v.k==="boxes") return `<div class="vboxes">${v.items.map(([n,val,old])=>`<div class="vbox"><div class="vv">${old!==undefined?`<s>${esc(old)}</s>`:""}${esc(val)}</div><div class="vn">${esc(n)}</div></div>`).join("")}</div>${v.cap?`<p class="viscap">${inl(v.cap)}</p>`:""}`;
  if(v.k==="table") return `<div class="ltable"><table><thead><tr>${v.h.map(x=>`<th>${inl(x)}</th>`).join("")}</tr></thead><tbody>${v.rows.map(r=>`<tr>${r.map(x=>`<td>${inl(String(x))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${v.cap?`<p class="viscap">${inl(v.cap)}</p>`:""}`;
  if(v.k==="steps") return `<div class="lsteps">${v.items.map(([e,t],k)=>`<div class="lstep"><span class="le">${e}</span><span>${inl(t)}</span></div>${k<v.items.length-1?`<i aria-hidden="true">↓</i>`:""}`).join("")}</div>`;
  if(v.k==="net") return netSVG(v);
  if(v.k==="pins") return pinsHTML(v);
  if(v.k==="bin") return binHTML(v);
  if(v.k==="ip") return ipHTML(v);
  if(v.k==="layers") return layersHTML(v);
  if(v.k==="compare") return compareHTML(v);
  if(v.k==="scene") return `<div class="scene"><span class="se">${v.e}</span><div>${v.items?v.items.map(([a,b])=>`<div class="sc-row"><b>${inl(a)}</b><span>${inl(b)}</span></div>`).join(""):""}</div></div>`;
  return "";
}

/* ---------- network visuals ---------- */
function netSVG(v){
  const W=v.w||340, H=v.h||200, by=Object.fromEntries(v.n.map(n=>[n[0],n]));
  const links=(v.l||[]).map(([a,b,st])=>{ const A=by[a], B=by[b]; return `<line x1="${A[3]}" y1="${A[4]}" x2="${B[3]}" y2="${B[4]}" class="nl ${st||""}"/>`; }).join("");
  const ring = v.ring ? `<ellipse cx="${v.ring[0]}" cy="${v.ring[1]}" rx="${v.ring[2]}" ry="${v.ring[3]}" class="nl"/>` : "";
  const nodes=v.n.map(([id,e,lab,x,y])=> e==="." ? `<circle cx="${x}" cy="${y}" r="4" class="ndot"/>` : `<g class="nn"><circle cx="${x}" cy="${y}" r="19"/><text x="${x}" y="${y+6}" class="ne">${e}</text>${lab?`<text x="${x}" y="${y+33}" class="nt">${esc(lab)}</text>`:""}</g>`).join("");
  return `<div class="fcwrap">${v.title?`<div class="vis-title">${esc(v.title)}</div>`:""}<svg class="net" viewBox="0 0 ${W} ${H}" style="max-width:${W+40}px" role="img" aria-label="${esc(v.title||"Network diagram")}">${ring}${links}${nodes}</svg>${v.cap?`<p class="viscap" style="text-align:center">${inl(v.cap)}</p>`:""}</div>`;
}
const PINS = {B:["white/orange","orange","white/green","blue","white/blue","green","white/brown","brown"], A:["white/green","green","white/orange","blue","white/blue","orange","white/brown","brown"]};
const WIRE = {orange:"#E8771E", green:"#2E9B48", blue:"#2F6FEB", brown:"#7A4B2A"};
function pinsHTML(v){
  const one = s => `<div class="pins"><b>T568${s}</b>${PINS[s].map((c,k)=>{ const col=WIRE[c.replace("white/","")], st=c.startsWith("white/"); return `<div class="pin"><span class="pn">${k+1}</span><span class="wire" style="${st?`background:repeating-linear-gradient(135deg,#fff 0 6px,${col} 6px 12px)`:`background:${col}`}"></span><span class="wn">${c}</span></div>`; }).join("")}</div>`;
  return `<div class="pinwrap">${(v.std||"B").split("").map(one).join("")}</div>${v.cap?`<p class="viscap">${inl(v.cap)}</p>`:""}`;
}
function binHTML(v){
  const n=v.n, bits=[128,64,32,16,8,4,2,1].map(p=>(n&p)?1:0);
  return `<div class="ltable bin"><table><thead><tr>${[128,64,32,16,8,4,2,1].map(p=>`<th>${p}</th>`).join("")}</tr></thead><tbody><tr>${bits.map(b=>`<td class="${b?"on":""}">${b}</td>`).join("")}</tr></tbody></table></div>
  <p class="viscap">${bits.map((b,k)=>b?[128,64,32,16,8,4,2,1][k]:null).filter(x=>x!==null).join(" + ")||"0"} = <b>${n}</b></p>`;
}
function ipCalc(ip, cidr){
  const a = ip.split(".").map(Number), num = ((a[0]<<24)>>>0) + (a[1]<<16) + (a[2]<<8) + a[3];
  const mask = cidr===0 ? 0 : (0xFFFFFFFF << (32-cidr))>>>0, net = (num & mask)>>>0, bc = (net | (~mask>>>0))>>>0;
  const d = x => [24,16,8,0].map(s=>(x>>>s)&255).join(".");
  const hosts = cidr>=31 ? 0 : Math.pow(2,32-cidr)-2;
  return {mask:d(mask), net:d(net), bc:d(bc), first:d(net+1), last:d(bc-1), hosts, bits:a.map(o=>o.toString(2).padStart(8,"0")).join("")};
}
function ipHTML(v){
  const r = ipCalc(v.ip, v.cidr);
  const bits = r.bits.split("").map((b,k)=>`<i class="${k<v.cidr?"nb":"hb"}">${b}</i>${k%8===7&&k<31?`<u>.</u>`:""}`).join("");
  return `<div class="ipv"><div class="ipbits">${bits}</div><div class="iplg"><span class="nb">network bits: ${v.cidr}</span><span class="hb">host bits: ${32-v.cidr}</span></div>
  <div class="ltable"><table><tbody>${[["Address",`${v.ip}/${v.cidr}`],["Subnet mask",r.mask],["Network address",r.net],["First usable host",r.first],["Last usable host",r.last],["Broadcast address",r.bc],["Usable hosts",`2<sup>${32-v.cidr}</sup> − 2 = ${r.hosts}`]].map(([a,b])=>`<tr><td>${a}</td><td class="mono"><b>${b}</b></td></tr>`).join("")}</tbody></table></div></div>`;
}

/* ---------- trace table player ---------- */
function ttCell(r, c){ if(c==="#") return r.l; if(c==="?") return r.c ? `${r.c[0]} → ${r.c[1]?"True":"False"}` : ""; if(c==="out") return r.o; return r.v[c]??""; }
function ttCols(T){ const hasC = T.rows.some(r=>r.c); return ["#", ...T.cols, ...(hasC?["?"]:[]), "out"]; }
const TTH = {"#":"Line", "?":"Condition", out:"Output"};
function ttPlayerHTML(id){
  const T = TRACES[id]; if(!T) return "";
  const cols = ttCols(T);
  return `<div class="ttp" data-tt="${id}" data-step="0">
   <pre class="qcode ttcode">${T.code.split("\n").map((l,k)=>`<span data-cl="${k+1}"><em>${k+1}</em>${esc(l)||" "}</span>`).join("\n")}</pre>
   ${T.inputs.length?`<div class="ttin">She types: ${T.inputs.map(x=>`<code>${esc(x)}</code>`).join(" then ")}</div>`:""}
   <div class="ltable tt"><table><thead><tr>${cols.map(c=>`<th>${esc(TTH[c]||c)}</th>`).join("")}</tr></thead><tbody>${T.rows.map((r,k)=>`<tr data-r="${k}" hidden>${cols.map(c=>`<td class="${c==="?"?(r.c?(r.c[1]?"ct":"cf"):""):""}">${esc(String(ttCell(r,c)))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
   <div class="ttnote" aria-live="polite">Tap <b>Next step</b> to run the program one line at a time.</div>
   <div class="row ttbtns"><button class="btn line sm" data-tt-back>◀ Back</button><button class="btn sub sm" data-tt-next>Next step ▶</button><button class="btn line sm" data-tt-all>Show all</button></div></div>`;
}
function ttExplain(T, r){
  const parts = [];
  if(r.c) parts.push(`Line ${r.l} tests <code>${esc(r.c[0])}</code>: it's <b>${r.c[1]?"True":"False"}</b>${/^\s*while/.test(T.code.split("\n")[r.l-1])?(r.c[1]?", so the loop body runs.":", so the loop stops."):(r.c[1]?", so this branch runs.":", so this branch is skipped.")}`);
  const ch = Object.entries(r.v); if(ch.length) parts.push(`Line ${r.l} sets ${ch.map(([k,v])=>`<code>${esc(k)}</code> to <b>${esc(v)}</b>`).join(" and ")}.`);
  if(r.o) parts.push(`Line ${r.l} prints <b>${esc(r.o).replace(/\n/g," / ")}</b>.`);
  return parts.join(" ");
}
function bindTT(root){
  root.querySelectorAll(".ttp").forEach(box=>{
    const T = TRACES[box.dataset.tt], rows = box.querySelectorAll("tbody tr"), note = box.querySelector(".ttnote");
    const show = k => {
      box.dataset.step = k;
      rows.forEach((tr,j)=>{ tr.hidden = j>=k; tr.classList.toggle("now", j===k-1); });
      box.querySelectorAll("[data-cl]").forEach(s=>s.classList.toggle("hl", k>0 && +s.dataset.cl===T.rows[k-1].l));
      note.innerHTML = k===0 ? "Tap <b>Next step</b> to run the program one line at a time." : ttExplain(T, T.rows[k-1]) + (k===T.rows.length ? ` <b>Finished.</b> Final output: <code>${esc(T.output).replace(/\n/g," / ")}</code>` : "");
      box.querySelector("[data-tt-next]").disabled = k>=T.rows.length; box.querySelector("[data-tt-back]").disabled = k===0;
      if(k>=T.rows.length && LZ) LZ.traced = true;
    };
    box.querySelector("[data-tt-next]").onclick = ()=>show(+box.dataset.step+1);
    box.querySelector("[data-tt-back]").onclick = ()=>show(+box.dataset.step-1);
    box.querySelector("[data-tt-all]").onclick = ()=>show(T.rows.length);
    show(0);
  });
}
function bindSide(root){
  root.querySelectorAll(".side").forEach(sd=>{
    sd.querySelectorAll(".fn[data-ln]").forEach(g=>{ if(!g.dataset.ln) return; g.style.cursor="pointer"; g.onclick=()=>{
      sd.querySelectorAll(".fn").forEach(x=>x.classList.toggle("on", x===g));
      const lns = g.dataset.ln.split(",").map(Number);
      sd.querySelectorAll("[data-cl]").forEach(s=>s.classList.toggle("hl", lns.includes(+s.dataset.cl)));
    }; });
  });
}

/* ---------- trace-table question type (ty:"trace") ---------- */
function traceBlanks(q){
  if(q._blanks) return q._blanks;
  const T = TRACES[q.tr], cols = ttCols(T).filter(c=>c!=="#"), cand = [];
  T.rows.forEach((r,ri)=>{ if(ri===0 && T.rows.length>3) return; cols.forEach(c=>{ const v=ttCell(r,c); if(v!=="" && v!==undefined) cand.push([ri,c]); }); });
  const n = Math.min(q.n||6, cand.length), pick = [];
  for(let k=0;k<n;k++) pick.push(cand[Math.round((k+1)*(cand.length-1)/n)]);
  const uniq = []; pick.forEach(p=>{ if(!uniq.some(u=>u[0]===p[0]&&u[1]===p[1])) uniq.push(p); });
  return (q._blanks = uniq);
}
function traceAnswerText(q){ const T=TRACES[q.tr]; return traceBlanks(q).map(([ri,c])=>`line ${T.rows[ri].l} ${TTH[c]||c}: ${c==="?"?(T.rows[ri].c[1]?"True":"False"):ttCell(T.rows[ri],c)}`).join("; "); }
function traceCheck(q, vals){
  const T=TRACES[q.tr]; return traceBlanks(q).map(([ri,c],k)=>{ const want = c==="?" ? (T.rows[ri].c[1]?"true":"false") : String(ttCell(T.rows[ri],c)); return norm(vals[k]||"")===norm(want) || (c!=="?" && !isNaN(+want) && want!=="" && +vals[k]===+want && /\./.test(want)===/\./.test(vals[k]||"")); });
}
function traceQHTML(q, it, showFb){
  const T = TRACES[q.tr], cols = ttCols(T), bl = traceBlanks(q);
  const res = showFb ? traceCheck(q, it.val||[]) : null;
  let bi = 0;
  const body = T.rows.map((r,ri)=>`<tr>${cols.map(c=>{
    const k = bl.findIndex(b=>b[0]===ri && b[1]===c);
    if(k<0) return `<td class="${c==="?"&&r.c?(r.c[1]?"ct":"cf"):""}">${esc(String(ttCell(r,c)))}</td>`;
    const j = bi++; const v = (it.val||[])[k] ?? "";
    const pre = c==="?" ? `${esc(r.c[0])} → ` : "";
    if(showFb) return `<td class="blank ${res[k]?"okc":"badc"}">${pre}${res[k]?esc(v):`<s>${esc(v)||"–"}</s> <b>✓ ${esc(c==="?"?(r.c[1]?"True":"False"):String(ttCell(r,c)))}</b>`}</td>`;
    return `<td class="blank">${pre}${c==="?"?`<select class="field tin tsel" data-b="${k}" aria-label="Line ${r.l} condition"><option value="">?</option><option ${v==="True"?"selected":""}>True</option><option ${v==="False"?"selected":""}>False</option></select>`:`<input class="field tin mono" data-b="${k}" aria-label="Line ${r.l} ${esc(TTH[c]||c)}" autocomplete="off" autocapitalize="off" value="${esc(v)}">`}</td>`;
  }).join("")}</tr>`).join("");
  return `<pre class="qcode ttcode">${T.code.split("\n").map((l,k)=>`<span><em>${k+1}</em>${esc(l)||" "}</span>`).join("\n")}</pre>
  ${T.inputs.length?`<div class="ttin">Inputs typed: ${T.inputs.map(x=>`<code>${esc(x)}</code>`).join(" then ")}</div>`:""}
  <p class="muted" style="margin:0;font-size:13px">Each row shows only what changes on that line. Fill in the ${bl.length} blank boxes.</p>
  <div class="ltable tt"><table><thead><tr>${cols.map(c=>`<th>${esc(TTH[c]||c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>
  ${showFb?"":`<button class="btn sub block" id="trGo">${Q&&Q.exam?"Save and next":"Check my trace table"}</button>`}`;
}

/* ---------- Python runner (Pyodide in a Web Worker, main app only) ---------- */
const PY_OK = STANDALONE && typeof Worker!=="undefined" && /^https?:/.test(location.protocol);
let pyW = null, pyReady = null;
const PY_SRC = `importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
let py; const ready = loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"}).then(p=>{ py=p; postMessage({ready:1}); }).catch(e=>postMessage({fail:String(e)}));
onmessage = async e => { await ready; const {code, inputs} = e.data; let out="";
  py.setStdout({batched:s=>out+=s+"\\n"}); py.setStderr({batched:s=>out+=s+"\\n"});
  py.globals.set("__ins", py.toPy(inputs||[]));
  try{ await py.runPythonAsync("import builtins\\n_q=list(__ins)\\ndef _inp(p=''):\\n    print(p, end='')\\n    if not _q: raise EOFError('The program asked for more input than you gave it')\\n    v=_q.pop(0)\\n    print(v)\\n    return v\\nbuiltins.input=_inp\\n"); await py.runPythonAsync(code); postMessage({out}); }
  catch(err){ postMessage({out, err:String(err.message||err).trim().split("\\n").slice(-1)[0]}); } };`;
function pyStart(){
  if(pyReady) return pyReady;
  pyW = new Worker(URL.createObjectURL(new Blob([PY_SRC],{type:"text/javascript"})));
  pyReady = new Promise((res,rej)=>{ pyW.onmessage = e => e.data.ready ? res() : e.data.fail ? rej(e.data.fail) : 0; pyW.onerror = e => rej(e.message||"load failed"); });
  pyReady.catch(()=>{ pyW?.terminate(); pyW=null; pyReady=null; });
  return pyReady;
}
async function pyRun(code, inputs){
  await pyStart();
  return new Promise(res=>{
    const t = setTimeout(()=>{ pyW.terminate(); pyW=null; pyReady=null; res({out:"", err:"Stopped after 5 seconds. Is there a loop that never ends?"}); }, 5000);
    pyW.onmessage = e => { clearTimeout(t); res(e.data); };
    pyW.postMessage({code, inputs});
  });
}
function runnerHTML(code, inputs=[]){
  return `<div class="pyrun"><textarea class="field mono pyed" spellcheck="false" autocapitalize="off" aria-label="Python code you can edit">${esc(code)}</textarea>
  <div class="row" style="flex-wrap:nowrap;gap:8px"><input class="field mono pyin" value="${esc(inputs.join(", "))}" placeholder="Inputs, comma separated" aria-label="Inputs for input(), comma separated"><button class="btn sub sm pygo">▶ Run</button></div>
  <pre class="pyout" hidden></pre></div>`;
}
function bindRunner(root){
  root.querySelectorAll(".pyrun").forEach(box=>{
    const out = box.querySelector(".pyout"), btn = box.querySelector(".pygo");
    btn.onclick = async ()=>{
      out.hidden=false; btn.disabled=true; out.className="pyout"; out.textContent = pyReady ? "Running…" : "Loading Python (first time takes a few seconds)…";
      try{ const ins = box.querySelector(".pyin").value.split(",").map(s=>s.trim()).filter(s=>s!==""); const r = await pyRun(box.querySelector(".pyed").value, ins);
        out.textContent = (r.out||"").replace(/\n$/,"") + (r.err?`${r.out?"\n":""}❌ ${r.err}`:"") || "(no output)"; if(r.err) out.className="pyout err";
      }catch(e){ out.textContent = "Couldn't load Python. Check your internet connection and try again."; out.className="pyout err"; }
      btn.disabled=false;
    };
  });
}

/* ---------- lesson player ---------- */
function startLesson(tid, i=0){ LZ = {t:tid, i, checks:{}}; go("lesson"); }
function lessonScreens(tid){ return LESSONS[tid] || []; }
function viewLesson(v){
  if(!LZ || !LESSONS[LZ.t]) return go("topics");
  const t = TOPIC[LZ.t], L = lessonScreens(t.id), n = L.length;
  if(LZ.i >= n) return lessonDone(v, t);
  const sc = L[LZ.i], ck = LZ.checks[LZ.i];
  const prog = L.map((_,k)=>`<i class="${k<LZ.i?"ok":k===LZ.i?"now":""}"></i>`).join("");
  let check = "";
  if(sc.check){
    const c = sc.check;
    check = `<div class="lcheck"><div class="qtext" style="font-size:16px">${inl(c.q)}</div>${c.code?`<pre class="qcode">${esc(c.code)}</pre>`:""}
    <div class="opts">${c.o.map((o,j)=>{ const cls = ck===undefined ? "" : j===c.a ? "ok" : ck===j ? "bad" : ""; return `<button class="opt ${cls}" data-lc="${j}" ${ck!==undefined?"disabled":""}><span class="L">${"ABCD"[j]}</span><span>${inl(o)}</span></button>`; }).join("")}</div>
    ${ck!==undefined?`<div class="fb ${ck===c.a?"ok":"bad"}"><h4>${ck===c.a?"Yes! That's it.":"Not quite. Here's why:"}</h4><div>${inl(c.why)}</div></div>`:""}</div>`;
  }
  v.innerHTML = `
  <div class="qtop"><button class="back" id="bk">← ${esc(t.name)}</button><span class="eyebrow">${LZ.i+1}/${n}</span></div>
  <div class="card lcard s-${t.s}">
    <div class="qprog">${prog}</div>
    <span class="ltag ltag-${sc.tag}">${LTAG[sc.tag]||""}</span>
    ${sc.h?`<h2 class="lh">${inl(sc.h)}</h2>`:""}
    ${(sc.p||[]).map(p=>`<p class="lp">${ptext(p)}</p>`).join("")}
    ${visHTML(sc.vis)}${visHTML(sc.vis2)}
    ${sc.code?`<pre class="qcode">${esc(sc.code)}</pre>${sc.out!==undefined?`<div class="lout"><span>Output</span><pre>${esc(sc.out)}</pre></div>`:""}`:""}
    ${sc.run && PY_OK?`<details class="tryit"><summary>▶️ Try it yourself: run and change this code</summary>${runnerHTML(sc.run.code||sc.code, sc.run.inputs||[])}</details>`:""}
    ${sc.tricky?`<div class="tricky">${ptext(sc.tricky)}</div>`:""}
    ${sc.mist?`<div class="mists">${sc.mist.map(([w,why,fix])=>`<div class="mist"><div class="mw">❌ ${inl(w)}</div><div class="my">${inl(why)}</div><div class="mf">✅ ${inl(fix)}</div></div>`).join("")}</div>`:""}
    ${sc.after?`<p class="lp">${ptext(sc.after)}</p>`:""}
    ${check}
  </div>
  <div class="grid2">
    <button class="btn line" id="lPrev" ${LZ.i===0?"disabled":""}>← Back</button>
    <button class="btn ${LZ.i===n-1?"gold":"sub"} s-${t.s}" id="lNext" ${sc.check && ck===undefined?"disabled":""}>${LZ.i===n-1?"Finish lesson":"Next →"}</button>
  </div>
  ${sc.check && ck===undefined?`<p class="muted" style="margin:-4px 0 0;text-align:center;font-size:13px">Answer the quick check to carry on.</p>`:""}`;
  $("#bk").onclick = ()=>{ const tt=t; LZ=null; go("topics", tt.id); };
  $("#lPrev").onclick = ()=>{ LZ.i--; render(); window.scrollTo({top:0}); };
  $("#lNext").onclick = ()=>{ LZ.i++; S.lessonPos = S.lessonPos||{}; S.lessonPos[t.id] = Math.min(LZ.i, n-1); save(); render(); window.scrollTo({top:0}); };
  v.querySelectorAll("[data-lc]").forEach(b=>b.onclick=()=>{ LZ.checks[LZ.i] = +b.dataset.lc; render(); setTimeout(()=>v.querySelector(".lcheck .fb")?.scrollIntoView({behavior:"smooth",block:"nearest"}),50); });
  bindTT(v); bindSide(v); bindRunner(v);
}
function lessonDone(v, t){
  if(!LZ.done){
    LZ.done = true;
    const st = topicStat(t.id); st.lessons = (st.lessons||0)+1; S.n.lesson++; S.n.visual++;
    S.lessonPos = S.lessonPos||{}; delete S.lessonPos[t.id];
    (S.lessonsDone ||= {})[t.id] = today();
    const k = t.id+"pic";
    if(S.lessonDay[k]!==today()){ S.lessonDay[k]=today(); addXP(XP.lesson+XP.visual, "picture lesson"); } else save();
    confetti();
  }
  const nQ = BANK.filter(q=>q.t===t.id).length;
  v.innerHTML = `<div class="hero subj s-${t.s}"><div class="circuit"></div><span class="eyebrow">Lesson complete</span><h2>${esc(t.name)}</h2><p style="margin:0">Nice work, ${esc(S.name)}. ${S.lessonDay[t.id+"pic"]===today()?`+${XP.lesson+XP.visual} XP (once a day per lesson).`:""}</p></div>
  <div class="card"><span class="eyebrow">Lock it in</span><p style="margin:6px 0 0">The best way to remember is to test yourself straight away. Five quick questions on this topic:</p></div>
  <div class="grid2 s-${t.s}"><button class="btn gold" id="ldQuiz" ${nQ?"":"disabled"}>Quiz me (5)</button><button class="btn line" id="ldBack">Back to topic</button></div>
  <button class="btn subghost block s-${t.s}" id="ldAgain">Go through the lesson again</button>`;
  $("#ldQuiz").onclick = ()=>{ LZ=null; startQuiz({mode:"topic", topics:[t.id], n:5, title:t.name}); };
  $("#ldBack").onclick = ()=>{ LZ=null; go("topics", t.id); };
  $("#ldAgain").onclick = ()=>startLesson(t.id, 0);
}
function lessonCard(t){
  const L = LESSONS[t.id];
  if(!L) return `<div class="card s-${t.s}"><span class="eyebrow">Picture lessons</span><p style="margin:6px 0 0">Step-by-step lessons with diagrams, ⚠️ Tricky Bits and ❌ Common Mistakes for this topic are coming with the ${esc(SUBJ[t.s].name)} update. Until then, Coach can teach it to you with pictures.</p></div>`;
  const pos = S.lessonPos?.[t.id]||0, done = S.lessonsDone?.[t.id];
  const traces = L.filter(s=>s.vis?.k==="tt").length;
  return `<div class="card lessoncard s-${t.s}"><div class="row between"><span class="eyebrow">Picture lesson</span>${done?`<span class="mastery good">Done ✓</span>`:""}</div>
   <p style="margin:6px 0 10px">${L.length} short screens · about ${Math.max(3,Math.round(L.length*0.8))} min${traces?` · ${traces} animated trace table${traces>1?"s":""}`:""}. Pictures, a worked example, ⚠️ Tricky Bits, ❌ Common Mistakes and quick checks.</p>
   <button class="btn sub block" id="tLesson">${pos>0?`Continue (screen ${pos+1} of ${L.length})`:done?"Go through it again":"Start the lesson"}</button></div>`;
}
