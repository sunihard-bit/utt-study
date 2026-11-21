/* =================== CONFIG =================== */
const MODEL = "claude-opus-5-5";
const ONLINE_URL = "__COACH_URL__";                 /* the Coach artifact on claude.ai */
const APP_URL = "https://utt.tidyassistant.com";   /* the main app */
const STANDALONE = !window.claude;
const COACH_MODE = !STANDALONE;                     /* inside Claude: Coach only, XP is sent to the main app */
const CLAIM_KEY = "utt-coach-claim-v1-7Rk2";
const LINK_KEY = "utt-coach-link-v1-Q9p4";
const MAX_CLAIM = 1000;
const DAILY_GOAL = 50;
const XP = {lesson:10, visual:5, correct:10, quiz:20, perfect:30, daily:30, structuredBase:15, perMark:2, perPoint:2};

/* =================== STATE =================== */
const KEY = "utt.coach.v1";
const DEF = () => ({v:1,name:"",role:null,xp:0,coins:0,days:{},streak:0,best:0,last:null,
  topics:{},mistakes:[],srs:{},log:[],quizLog:[],badges:{},beepOK:{},
  n:{quiz:0,perfect:0,daily:0,tutor:0,structured:0,lesson:0,visual:0,photo:0,review:0,subnet:0,trace:0},
  games:{},daily:null,dailyQ:null,lastTopic:null,subj:"ntwk",lessonDay:{},
  owned:{},theme:null,look:"auto",avatar:null,coachStyle:null,freezes:0,chestDay:null,
  parent:{pin:null,rewards:[]},shopTab:"theme",claimed:{},cloud:null,pendXP:0,pendBase:null,created:null});
let S = DEF();
try{ const raw = localStorage.getItem(KEY); if(raw) S = Object.assign(DEF(), JSON.parse(raw)); }catch(e){}
S.n = Object.assign(DEF().n, S.n||{});

const pad = n => String(n).padStart(2,"0");
const dstr = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today = () => dstr(new Date());
const addDays = (k) => { const d=new Date(); d.setDate(d.getDate()+k); return dstr(d); };
function gapDays(a){ if(!a) return 999; const [y,m,d]=a.split("-").map(Number); const t=new Date(); const x=new Date(y,m-1,d); t.setHours(0,0,0,0); return Math.round((t-x)/86400000); }

/* ---- save: this device, plus the cloud backup (main app) or Claude's storage (Coach) ---- */
let cloudDoc = null, chatCol = null, saveT = null, syncT = null, dirty = false, lastSync = null, syncErr = false;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
  if(cloudDoc){ clearTimeout(saveT); saveT = setTimeout(()=>{ cloudDoc.set({state:JSON.stringify(S), xp:S.xp, at:Date.now()}).catch(()=>{}); }, 1500); }
  if(canSync()){ dirty = true; clearTimeout(syncT); syncT = setTimeout(syncNow, 5000); }
}
function canSync(){ return STANDALONE && /^https?:/.test(location.protocol) && S.role!=="parent" && !!S.name && !!S.cloud?.code; }
const CODE_ABC = "abcdefghjkmnpqrstuvwxyz23456789";
function newCode(){ const b = new Uint8Array(16); crypto.getRandomValues(b); return [...b].map(x=>CODE_ABC[x % CODE_ABC.length]).join(""); }
const fmtCode = c => (c||"").replace(/(.{4})(?=.)/g,"$1-");
/* ---- two-way sync: every device using the same code shares one progress ----
   Each device keeps a copy of the last state it agreed with the cloud ("base").
   On sync it pulls the cloud copy, merges in only what changed here since the base,
   then pushes the result. Counters add up, lists are joined, settings: newest change wins. */
const BASE_KEY = KEY+".base";
const LOCAL_ONLY = ["cloud","movedTo","movedSum","shopTab","filter","map","find","pendXP","pendBase"];
const jeq = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const isObj = x => x && typeof x==="object" && !Array.isArray(x);
function addN(l,r,b){ return Math.max(0, (+r||0) + (+l||0) - (+b||0)); }
function mergeMap(l,r,b,each){ l=l||{}; r=r||{}; b=b||{}; const o={};
  for(const k of new Set([...Object.keys(l),...Object.keys(r)])){
    const v = each ? each(l[k],r[k],b[k],k) : (jeq(l[k],b[k]) ? r[k] : l[k]);
    if(v!==undefined) o[k]=v; }
  return o; }
function pick3(l,r,b){ return jeq(l,b) ? r : l; }
function joinLog(l,r){ const seen=new Set(), out=[];
  for(const e of [...(r||[]),...(l||[])]){ const k=e.at+"|"+(e.q||e.title||""); if(!seen.has(k)){ seen.add(k); out.push(e); } }
  return out.sort((x,y)=>x.at<y.at?-1:x.at>y.at?1:0); }
function mergeTopic(l,r,b){ if(!l) return r; if(!r) return l; b=b||{};
  const o = Object.assign({}, r);
  for(const k of ["att","ok","time","lessons","wrong","quiz"]) o[k]=addN(l[k],r[k],b[k]);
  o.best=Math.max(l.best||0, r.best||0); o.last=[l.last,r.last].filter(Boolean).sort().pop()||null;
  o.recent = jeq(l.recent,b.recent) ? r.recent : l.recent; return o; }
function mergeState(L,R,B){
  B=B||{}; const M={};
  for(const k of new Set([...Object.keys(L),...Object.keys(R)])){
    const l=L[k], r=R[k], b=B[k];
    if(LOCAL_ONLY.includes(k)) M[k]=l;
    else if(["xp","coins"].includes(k)) M[k]=addN(l,r,b);
    else if(k==="freezes") M[k]=Math.min(2, addN(l,r,b));
    else if(k==="n") M[k]=mergeMap(l,r,b,(x,y,z)=>addN(x,y,z));
    else if(k==="days") M[k]=mergeMap(l,r,b,(x,y,z)=>addN(x,y,z)||undefined);
    else if(k==="topics") M[k]=mergeMap(l,r,b,mergeTopic);
    else if(k==="log"||k==="quizLog") M[k]=joinLog(l,r);
    else if(k==="games") M[k]=mergeMap(l,r,b,(x,y)=>Math.max(x||0,y||0)||undefined);
    else if(["badges","owned","claimed","beepOK","lessonsDone"].includes(k)) M[k]=mergeMap(l,r,{},(x,y)=>x===undefined?y:y===undefined?x:(x<y?x:y));
    else if(k==="lessonDay"||k==="lessonPos") M[k]=mergeMap(l,r,b,(x,y)=>x===undefined?y:y===undefined?x:(x>y?x:y));
    else if(k==="srs") M[k]=mergeMap(l,r,b);
    else if(k==="mistakes"){ const ix=a=>Object.fromEntries((a||[]).map(m=>[m.id,m]));
      M[k]=Object.values(mergeMap(ix(l),ix(r),ix(b))).sort((x,y)=>(y.d||"").localeCompare(x.d||"")).slice(0,60); }
    else if(k==="best") M[k]=Math.max(l||0,r||0);
    else if(k==="chestDay") M[k]=[l,r].filter(Boolean).sort().pop()||null;
    else if(k==="created") M[k]=[l,r].filter(Boolean).sort()[0]||null;
    else if(k==="last"||k==="streak") continue;
    else M[k]=pick3(l,r,b);
  }
  /* the streak belongs to whichever device studied most recently */
  const lw = (L.last||"") > (R.last||"") || ((L.last||"")===(R.last||"") && (L.streak||0)>=(R.streak||0));
  M.last = lw ? L.last : R.last; M.streak = lw ? L.streak : R.streak;
  M.best = Math.max(M.best||0, M.streak||0);
  /* a badge or level reached on both devices before they synced only pays its coins once */
  const bb=B.badges||{}, rb=R.badges||{}; let dup=0;
  for(const k in (L.badges||{})) if(rb[k] && !bb[k]) dup+=25;
  if(B.xp!==undefined) dup += 50*Math.max(0, Math.min(levelOf(L.xp||0), levelOf(R.xp||0)) - levelOf(B.xp||0));
  if(M.coins!==undefined) M.coins = Math.max(0, M.coins - dup);
  return Object.assign(DEF(), M, {n:Object.assign(DEF().n, M.n||{})});
}
function loadBase(){ try{ return JSON.parse(localStorage.getItem(BASE_KEY)||"null"); }catch(e){ return null; } }
function saveBase(st){ try{ localStorage.setItem(BASE_KEY, JSON.stringify(st)); }catch(e){} }
let syncing = false;
async function syncNow(opts={}){
  if(!canSync() || syncing) return;
  if(!dirty && !opts.pull) return;
  syncing = true; clearTimeout(syncT);
  try{
    let remote = await pullCloud(S.cloud.code), base = loadBase();
    /* this code was linked into another one: follow it, carrying over what changed here */
    let sumFrom = null;
    for(let hop=0; hop<3 && remote && remote.movedTo && remote.movedTo!==S.cloud.code; hop++){
      /* movedSum: the new code doesn't hold this device's progress yet, so add all of it */
      if(remote.movedSum){ base = {}; sumFrom = {code:S.cloud.code, stub:remote}; } else base = base || remote;
      const to = remote.movedTo;
      remote = await pullCloud(to); S.cloud = Object.assign({}, S.cloud, {code:to, was:S.cloud.code}); dirty = true;
    }
    const before = JSON.stringify(S);
    /* no base yet (first sync after this update): the cloud copy came from this device, so it is the base */
    let merged = remote ? mergeState(S, remote, base || remote) : S;
    const changedHere = !jeq(merged, S);
    const needPush = dirty || !remote || !jeq(merged, remote);
    dirty = false;
    if(changedHere){ S = merged; try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
    const snap = JSON.stringify(S);
    if(needPush){
      const r = await fetch("/api/backup/"+S.cloud.code, {method:"PUT", keepalive:true, headers:{"content-type":"application/json"}, body:JSON.stringify({state:JSON.parse(snap), at:new Date().toISOString()})});
      if(r.status===409){ clearTimeout(syncT); syncT = setTimeout(()=>syncNow({pull:true}), 1500); }
      if(!r.ok) throw 0;
    }
    if(sumFrom) await fetch("/api/backup/"+sumFrom.code, {method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify({state:Object.assign({}, sumFrom.stub, {movedSum:false})})}).catch(()=>{});
    try{ localStorage.setItem(BASE_KEY, snap); }catch(e){} lastSync = new Date(); syncErr = false;
    if(changedHere && JSON.stringify(S)!==before) afterSyncChange();
  }catch(e){ dirty = true; syncErr = true; }
  syncing = false;
}
/* link this device to another device's code: both histories are added together */
async function linkDevice(raw){
  let code = String(raw||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  if(!/^[a-z2-9]{16}$/.test(code)){ toast("That code should be 16 letters and numbers."); return; }
  if(code===S.cloud?.code){ toast("This device already uses that code."); return; }
  try{
    await syncNow();
    let remote = await pullCloud(code);
    for(let hop=0; hop<3 && remote && remote.movedTo; hop++){ code = remote.movedTo; remote = await pullCloud(code); }
    if(!remote){ toast("No backup found for that code."); return; }
    const old = S.cloud?.code;
    if(code===old){ toast("This device already uses that code."); return; }
    /* leave a note on the old code so any other device still using it follows along */
    if(old){ const stub = Object.assign({}, loadBase() || S, {movedTo:code});
      await fetch("/api/backup/"+old, {method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify({state:stub})}).catch(()=>{}); }
    S = mergeState(S, remote, {}); S.cloud = {code, since:today(), was:old};
    try{ localStorage.setItem(KEY, JSON.stringify(S)); localStorage.removeItem(BASE_KEY); }catch(e){}
    dirty = true; await syncNow({pull:true});
    if(syncErr) toast("Linked, but couldn't upload yet. It will retry with internet.");
    else toast("Linked! This device now shares progress with your other device.", true);
    applyTheme(); render();
  }catch(e){ toast("Couldn't reach the backup. Check your internet and try again."); }
}
function afterSyncChange(){
  applyTheme(); renderHeader();
  /* don't yank the screen away in the middle of a quiz, game or lesson */
  if(["home","rewards","me","topics","practice","parent"].includes(tab)) render();
}
async function pullCloud(code){
  const r = await fetch("/api/backup/"+code, {cache:"no-store"});
  if(r.status===404) return null;
  if(!r.ok) throw new Error("net");
  const j = await r.json(); return j && j.state ? j.state : null;
}
async function initCloud(){
  if(COACH_MODE){
    try{
      if(!window.claude?.use) return;
      const [db,user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if(!db || !user) return;
      const id = await user.id(); if(!id) return;
      cloudDoc = db.collection("data/users/"+id).doc("coach");
      chatCol = db.collection("data/users/"+id+"/coach/chats");
      if(tab==="tutor") render();
      const snap = await cloudDoc.get();
      if(snap.exists){
        const remote = JSON.parse(snap.data().state || "{}");
        const keepPend = S.pendXP||0;
        if(!S.name && remote.name || (remote.pendXP||0) > keepPend){ S = Object.assign(DEF(), remote); S.n = Object.assign(DEF().n, S.n||{}); try{localStorage.setItem(KEY, JSON.stringify(S));}catch(e){} render(); }
      } else if(S.name) save();
    }catch(e){}
    return;
  }
  if(!/^https?:/.test(location.protocol) || S.role==="parent" || !S.name) return;
  if(!S.cloud?.code){ S.cloud = {code:newCode(), since:today()}; dirty = true; save(); }
  await syncNow({pull:true});
}
setInterval(()=>{ if(document.visibilityState==="visible") syncNow({pull:true}); }, 60000);
document.addEventListener("visibilitychange", ()=>{ syncNow({pull:document.visibilityState==="visible"}); });
window.addEventListener("pagehide", ()=>syncNow());

/* =================== LEVELS, XP, STREAKS =================== */
function liveStreak(){ const g=gapDays(S.last); return g<=1 || (g-1)<=(S.freezes||0) ? S.streak : 0; }
function levelOf(xp){ let L=1; while(50*L*(L+1) <= xp) L++; return L; }
function levelFloor(L){ return 50*(L-1)*L; }
function levelName(L){ return LEVELS[Math.min(L-1, LEVELS.length-1)]; }

function addXP(n, why){
  n = Math.round(n); if(n<=0) return;
  if(COACH_MODE){ S.pendXP=(S.pendXP||0)+n; save(); renderHeader(); toast(`+${n} XP · tap "Add XP to app" when you're done`); return; }
  const before = levelOf(S.xp);
  S.xp += n; S.coins += n;
  const t = today(); const prevDay = S.days[t]||0; S.days[t] = prevDay + n;
  if(S.last !== t){ const g=gapDays(S.last);
    if(g===1) S.streak++;
    else if(g>1 && g<900 && (g-1)<=(S.freezes||0)){ S.freezes-=(g-1); S.streak++; setTimeout(()=>toast(`A streak freeze saved your ${S.streak-1}-day streak!`, true),1200); }
    else S.streak = 1;
    S.last = t; S.best = Math.max(S.best, S.streak); }
  const after = levelOf(S.xp);
  if(after>before){ S.coins += 50; queueModal(()=>showLevelUp(after)); }
  if(prevDay < DAILY_GOAL && S.days[t] >= DAILY_GOAL && S.chestDay!==t) queueModal(showChest);
  checkBadges(); checkParentGoals();
  save(); renderHeader();
  toast(`+${n} XP · ${why}`);
}
function award(id){
  if(S.badges[id] || COACH_MODE) return;
  S.badges[id] = today(); S.coins += 25;
  const b = BADGES.find(x=>x.id===id);
  queueModal(()=>showBadge(b));
}
function masteredCount(){ return TOPICS.filter(t=>masteryState(t.id)==="m").length; }
function checkBadges(){
  if(COACH_MODE) return;
  const st = liveStreak();
  if(S.n.quiz>=1) award("first");
  if(S.n.perfect>=1) award("perfect");
  if(st>=3) award("streak3"); if(st>=7) award("streak7"); if(st>=30) award("streak30");
  if(S.n.daily>=5) award("daily5");
  if(S.n.tutor>=20) award("curious");
  if(S.n.subnet>=10) award("subnet");
  if(S.n.trace>=10) award("trace");
  const beeps = BANK.filter(q=>q.tags.includes("beep")); if(beeps.length && beeps.every(q=>S.beepOK[q.id])) award("beep");
  if(Object.values(S.games).some(b=>b>=15)) award("game");
  if(masteredCount()>=5) award("master5");
  if(TOPICS.every(t=>S.topics[t.id]?.quiz)) award("allround");
  if(S.xp>=1000) award("xp1000");
  if(S.n.photo>=1) award("photo");
  if(S.n.review>=1) award("fixer");
}

/* =================== PROGRESS PER TOPIC =================== */
function topicStat(id){ return S.topics[id] || (S.topics[id] = {att:0,ok:0,best:0,quiz:0,last:null,time:0,recent:[],lessons:0,wrong:0}); }
/* Mastery % = accuracy over the last 10 answers in the topic. Labels: Not started · Learning (<50) · Getting there (50-79, or fewer than 5 answers) · Mastered (80%+ with 5+ answers) */
function masteryPct(id){ const t=S.topics[id]; if(!t || !t.recent?.length) return null; return Math.round(t.recent.reduce((a,b)=>a+b,0)/t.recent.length*100); }
function masteryState(id){ const t=S.topics[id]; const p=masteryPct(id);
  if(p===null) return t && (t.lessons) ? "l" : "n";
  if(p>=80 && t.att>=5) return "m"; if(p>=50 || (p>=80)) return "g"; return "l"; }
const MLABEL = {n:"Not started", l:"Learning", g:"Getting there", m:"Mastered"};
const MCLS = {n:"", l:"low", g:"mid", m:"good"};
function subjPct(s){ const ts=topicsOf(s); return Math.round(ts.reduce((a,t)=>a+(masteryPct(t.id)||0),0)/ts.length); }
function weakTopics(n=3, s=null){
  return TOPICS.filter(t=>(!s||t.s===s)).map(t=>({t, p:masteryPct(t.id), st:S.topics[t.id]})).filter(x=>x.p!==null && masteryState(x.t.id)!=="m")
    .sort((a,b)=>(a.p-b.p) || ((b.st.wrong||0)-(a.st.wrong||0))).slice(0,n).map(x=>x.t);
}
function dueReviews(s=null){ const t=today(); return Object.entries(S.srs).filter(([id,r])=>QB[id] && r.due<=t && (!s||QB[id].s===s)).map(([id])=>id); }

/* Record one answered question everywhere it needs to go */
function recordAnswer(q, ok, ms, mode, chosenText){
  const st = topicStat(q.t);
  st.att++; if(ok) st.ok++; else st.wrong++;
  st.recent.push(ok?1:0); if(st.recent.length>10) st.recent.shift();
  st.last = today(); st.time += Math.min(Math.max(0,ms||0), 300000);
  S.log.push({at:new Date().toISOString(), q:q.id, t:q.t, ok:ok?1:0, m:mode, ms:Math.round(ms||0), c:String(chosenText??"").slice(0,80)});
  if(S.log.length>4000) S.log.splice(0, S.log.length-4000);
  /* spaced repetition: a missed question comes back tomorrow, then in 3 days, until it's right twice */
  if(!ok) S.srs[q.id] = {due:addDays(1), ok:0};
  else if(S.srs[q.id]){ const r=S.srs[q.id]; r.ok++; if(r.ok>=2) delete S.srs[q.id]; else r.due = addDays(3); }
  if(ok){ if(q.tags.includes("subnet")) S.n.subnet++; if(q.tags.includes("trace")) S.n.trace++; if(q.tags.includes("beep")) S.beepOK[q.id]=1; }
  if(!ok){ S.mistakes = S.mistakes.filter(m=>m.id!==q.id); S.mistakes.unshift({id:q.id, t:q.t, q:q.q, chosen:String(chosenText??""), correct:answerText(q), fix:q.trap||"", d:today()}); S.mistakes = S.mistakes.slice(0,60); }
}
function answerText(q){
  if(q.ty==="mc") return q.o[q.a];
  if(q.ty==="tf") return q.a?"True":"False";
  if(q.ty==="fill") return q.a[0];
  if(q.ty==="order") return q.o.join(" → ");
  if(q.ty==="match") return q.o.map(p=>p[0]+" = "+p[1]).join("; ");
  if(q.ty==="trace") return traceAnswerText(q);
  return "";
}

/* =================== SIGNING (Coach claim links, parent links) =================== */
const enc = new TextEncoder();
async function hmac(key, msg){
  const k = await crypto.subtle.importKey("raw", enc.encode(key), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
  return [...sig.slice(0,8)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function sha(msg){ const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(msg))); return [...h].map(b=>b.toString(16).padStart(2,"0")).join(""); }
const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/")))));

/* Coach → app: "Add X XP to app". Max 1,000 XP per link; each link id can be used once. */
function pendingCounts(){ const b=S.pendBase||{}; const f=k=>Math.max(0,(S.n[k]||0)-(b[k]||0)); return {t:f("tutor"), s:f("structured"), p:f("photo"), r:f("review")}; }
let claimCache = {key:"", url:""};
async function claimURL(){
  const x = Math.min(S.pendXP||0, MAX_CLAIM), c = pendingCounts(); S.claimId ||= newCode().slice(0,8);
  const body = `x${x}t${c.t}s${c.s}p${c.p}r${c.r}-${S.claimId}`;
  if(claimCache.key===body) return claimCache.url;
  const url = `${APP_URL}/#claim-${body}-${await hmac(CLAIM_KEY, body)}`;
  claimCache = {key:body, url}; return url;
}
function markClaimSent(){
  const x = Math.min(S.pendXP||0, MAX_CLAIM);
  S.pendXP = Math.max(0,(S.pendXP||0)-x);
  S.pendBase = {tutor:S.n.tutor, structured:S.n.structured, photo:S.n.photo, review:S.n.review};
  S.claimId = null; save(); renderHeader();
}
async function handleClaim(){
  const m = location.hash.match(/^#claim-(x(\d+)t(\d+)s(\d+)p(\d+)r(\d+)-([a-z0-9]+))-([0-9a-f]{16})$/);
  if(!m || COACH_MODE) return;
  try{ history.replaceState(null,"",location.pathname); }catch(e){ location.hash=""; }
  if(S.role==="parent"){ toast("That's a Coach points link for Suri's phone."); return; }
  const [_,body,x,t,s2,p,r,id,sig] = m;
  if(await hmac(CLAIM_KEY, body)!==sig){ toast("That points link didn't work."); return; }
  if(S.claimed[id]){ toast("Those Coach points were already added."); return; }
  S.claimed[id]=today(); const keys=Object.keys(S.claimed); if(keys.length>300) delete S.claimed[keys[0]];
  S.n.tutor+=+t; S.n.structured+=+s2; S.n.photo+=+p; S.n.review+=+r;
  if(+x>0) addXP(Math.min(+x,MAX_CLAIM), "from Coach"); else { checkBadges(); save(); toast("Coach activity added"); }
  if(+s2>0) checkParentGoals();
}
async function signed(kind, o){ const d=b64e(o); return `${APP_URL}/#${kind}-${d}-${await hmac(LINK_KEY, kind+"|"+d)}`; }
async function readSigned(kind){
  const m = location.hash.match(new RegExp("^#"+kind+"-([A-Za-z0-9_-]+)-([0-9a-f]{16})$")); if(!m) return null;
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  if(await hmac(LINK_KEY, kind+"|"+m[1])!==m[2]) { toast("That link looks damaged. Ask for it to be sent again."); return null; }
  try{ return b64d(m[1]); }catch(e){ toast("That link looks damaged. Ask for it to be sent again."); return null; }
}

/* App → Coach: open the Coach on a topic / mode, carrying her name, style and mistakes */
function coachLink(opts={}){
  const o = {n:S.name||"", st:S.coachStyle||"", s:opts.s||S.subj||"", t:opts.t||"", m:opts.m||""};
  if(opts.mistakes) o.k = opts.mistakes.slice(0,8).map(x=>({t:x.t, q:String(x.q).slice(0,220), c:String(x.chosen).slice(0,80), a:String(x.correct).slice(0,120)}));
  return ONLINE_URL + "#go-" + b64e(o);
}

/* =================== MARKDOWN =================== */
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function inl(s){
  s = esc(s);
  s = s.replace(/`([^`]+)`/g,"<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g,"$1<em>$2</em>");
  return s;
}
function mdTable(rows){
  const cells = r => r.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim());
  const isSep = r => /^\s*\|?\s*:?-{2,}/.test(r) && /^[\s|:\-]+$/.test(r);
  let head = null, body = rows;
  if(rows.length>1 && isSep(rows[1])){ head = cells(rows[0]); body = rows.slice(2); }
  body = body.filter(r=>!isSep(r));
  let h = '<div class="tbl"><table>';
  if(head) h += "<thead><tr>"+head.map(c=>"<th>"+inl(c)+"</th>").join("")+"</tr></thead>";
  h += "<tbody>"+body.map(r=>"<tr>"+cells(r).map(c=>"<td>"+inl(c)+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>";
  return h;
}
function md(src){
  const L = String(src||"").replace(/\r/g,"").split("\n"); const out=[]; let i=0;
  const startRe = /^(```|#{1,6}\s|\s*[-*•]\s+|\s*\d+[.)]\s+|\s*\|.*\|\s*$|\s*(---|\*\*\*)\s*$)/;
  while(i<L.length){
    const l = L[i];
    if(/^```/.test(l)){ const lang=(l.match(/^```\s*([\w-]+)/)||[])[1]; const b=[]; i++; let closed=false; while(i<L.length){ if(/^```/.test(L[i])){ closed=true; break; } b.push(L[i++]); } i++;
      const vis = lang && VIS_FENCE[lang.toLowerCase()] ? (closed ? fenceVisual(lang, b.join("\n")) : `<p class="muted"><i>Drawing a diagram…</i></p>`) : null;
      out.push(vis || "<pre>"+esc(b.join("\n"))+"</pre>"); continue; }
    if(/^\s*\|.*\|\s*$/.test(l)){ const r=[]; while(i<L.length && /^\s*\|.*\|\s*$/.test(L[i])) r.push(L[i++]); out.push(mdTable(r)); continue; }
    const h = l.match(/^(#{1,6})\s+(.*)/); if(h){ const lv=Math.min(6,h[1].length+2); out.push(`<h${lv}>${inl(h[2])}</h${lv}>`); i++; continue; }
    if(/^\s*[-*•]\s+/.test(l)){ const it=[]; while(i<L.length && /^\s*[-*•]\s+/.test(L[i])) it.push(L[i++].replace(/^\s*[-*•]\s+/,"")); out.push("<ul>"+it.map(x=>"<li>"+inl(x)+"</li>").join("")+"</ul>"); continue; }
    if(/^\s*\d+[.)]\s+/.test(l)){ const it=[]; const st=parseInt(l,10)||1; while(i<L.length && /^\s*\d+[.)]\s+/.test(L[i])) it.push(L[i++].replace(/^\s*\d+[.)]\s+/,"")); out.push(`<ol start="${st}">`+it.map(x=>"<li>"+inl(x)+"</li>").join("")+"</ol>"); continue; }
    if(/^\s*(---|\*\*\*)\s*$/.test(l)){ out.push("<hr>"); i++; continue; }
    if(!l.trim()){ i++; continue; }
    const p=[L[i++]]; while(i<L.length && L[i].trim() && !startRe.test(L[i])) p.push(L[i++]);
    out.push("<p>"+inl(p.join(" "))+"</p>");
  }
  return out.join("");
}
/* Diagrams the Coach can draw from small JSON blocks */
function flowHTML(d){ const st=(d.steps||[]).map(x=>typeof x==="string"?{t:x}:x);
  return `<div class="vis">${d.title?`<div class="vis-title">${esc(d.title)}</div>`:""}<div class="flow">${st.map((s,k)=>`${k?'<div class="ar">▼</div>':""}<div class="fs ${s.shape||""}"><span class="n">${k+1}</span><div><b>${esc(s.t)}</b>${s.s?`<small>${esc(s.s)}</small>`:""}</div></div>`).join("")}</div></div>`; }
function layersHTML(d){ const cols=["#E0533D","#E98A2E","#D9B21C","#47A34B","#2F8FB5","#3C63C9","#7A4CC8"];
  return `<div class="vis">${d.title?`<div class="vis-title">${esc(d.title)}</div>`:""}<div class="layers">${(d.rows||[]).map((r,k,a)=>{ const [n,lab,sub]=Array.isArray(r)?r:[r.n,r.t,r.s]; const c=cols[(+n||a.length-k)-1]||cols[k%7]; return `<div class="lay" style="--c:${c}"><span class="ln">${esc(n??"")}</span><b>${esc(lab)}</b>${sub?`<small>${esc(sub)}</small>`:""}</div>`; }).join("")}</div></div>`; }
function compareHTML(d){ return `<div class="vis">${d.title?`<div class="vis-title">${esc(d.title)}</div>`:""}<div class="cmp">${(d.cols||[]).map(c=>`<div><h4>${esc(c.h)}</h4><ul>${(c.items||[]).map(i=>`<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}</div></div>`; }
const VIS_FENCE = {flow:flowHTML, flowchart:flowHTML, layers:layersHTML, compare:compareHTML};
function fenceVisual(lang, body){ try{ return VIS_FENCE[lang.toLowerCase()](JSON.parse(body)); }catch(e){ return "<pre>"+esc(body)+"</pre>"; } }

/* =================== UI HELPERS =================== */
const $ = s => document.querySelector(s);
const ICON = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7M8 11h7"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M12 8c-1.5-3-5-4-5.5-2S9 8 12 8zm0 0c1.5-3 5-4 5.5-2S15 8 12 8z"/>',
  flame:'<path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .3 1.6 1 2.6 2 3 .2-3.5-.5-6.5.5-9z" fill="currentColor" stroke="none"/>',
  send:'<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>',
  net:'<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><circle cx="12" cy="13" r="2.2"/><path d="M12 7.2v3.6M10.3 14.4l-3.6 2.2M13.7 14.4l3.6 2.2"/>',
  code:'<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>',
};
const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
let toastT;
function toast(msg, gold){ const t=$("#toast"); t.textContent=msg; t.className="toast show"+(gold?" gold":""); clearTimeout(toastT); toastT=setTimeout(()=>t.className="toast",2600); }
function thinking(label="Coach is thinking"){ return `<span class="thinking"><span class="dots"><i></i><i></i><i></i></span>${esc(label)}…</span>`; }
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function hashStr(s){ let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
const fmtTime = ms => { const m=Math.round((ms||0)/60000); return m<60 ? m+"m" : Math.floor(m/60)+"h "+(m%60)+"m"; };
const fmtDate = s => { if(!s) return "–"; const g=gapDays(s); return g===0?"Today":g===1?"Yesterday":g<7?g+" days ago":s; };
function applyTheme(){
  document.body.className = S.theme && S.theme!=="th-circuit" ? S.theme : "";
  const r = document.documentElement; if(S.look==="light"||S.look==="dark") r.dataset.theme=S.look; else delete r.dataset.theme;
}
function avatarFace(){ const it = SHOP.find(x=>x.id===S.avatar); return it ? it.ic : (S.name||"?").trim().charAt(0).toUpperCase(); }
function masteryChip(id){ const st=masteryState(id), p=masteryPct(id); return `<span class="mastery ${MCLS[st]}">${st==="n"?"New":st==="m"?"✓ "+p+"%":p===null?MLABEL[st]:p+"%"}</span>`; }

/* ---- modal / celebrations ---- */
function modal(html, onMount){
  const root=$("#modalRoot"); root.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="box">${html}</div></div>`;
  const close=()=>{ root.innerHTML=""; runModalQueue(); };
  root.querySelector(".modal").addEventListener("click", e=>{ if(e.target.classList.contains("modal") && !root.querySelector(".chest")) close(); });
  onMount && onMount(root, close);
}
const modalQueue=[]; function queueModal(fn){ modalQueue.push(fn); if(!$("#modalRoot").innerHTML) runModalQueue(); }
function runModalQueue(){ const fn = modalQueue.shift(); if(fn) setTimeout(fn, 250); }
function confetti(){
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c=document.createElement("div"); c.className="confetti";
  const cols=["#F4C84A","#2F6FEB","#7A3FD1","#D0581A","#0E7C7B","#BF3A2B"];
  c.innerHTML = Array.from({length:60},()=>`<i style="left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};animation-delay:${Math.random()*.5}s;animation-duration:${1.4+Math.random()}s"></i>`).join("");
  document.body.appendChild(c); setTimeout(()=>c.remove(), 3000);
}
function showChest(){
  modal(`<span class="eyebrow">Daily goal reached</span><h2>You earned a treasure chest!</h2><button class="chest" id="chestBtn" aria-label="Open the chest">🎁</button><p class="muted" style="margin:0">Tap to open it.</p>`, (root, close)=>{
    $("#chestBtn").onclick = ()=>{
      const lockedAv = SHOP.filter(x=>x.kind==="avatar" && !S.owned[x.id]);
      const r = Math.random(); let prize;
      if(r<0.2 && lockedAv.length){ const a=lockedAv[Math.floor(Math.random()*lockedAv.length)]; S.owned[a.id]=1; prize={ic:a.ic, t:`New avatar: ${a.n}!`, s:"Equip it in the Rewards shop."}; }
      else if(r<0.32 && (S.freezes||0)<2){ S.freezes=(S.freezes||0)+1; prize={ic:"🧊", t:"A streak freeze!", s:"It protects your streak if you miss a day."}; }
      else { const c = 25 + Math.floor(Math.random()*51); S.coins+=c; prize={ic:"🪙", t:`${c} coins!`, s:"Spend them in the Rewards shop."}; }
      S.chestDay = today(); save(); renderHeader(); confetti();
      root.querySelector(".box").innerHTML = `<span class="eyebrow">Chest opened</span><div class="prize">${prize.ic}</div><h2>${esc(prize.t)}</h2><p class="muted" style="margin:0">${esc(prize.s)}</p><button class="btn block" id="mClose">Nice!</button>`;
      $("#mClose").onclick = close;
    };
  });
}
function showLevelUp(L){
  const biz = EMPIRE[Math.min(L-1, EMPIRE.length-1)];
  confetti();
  modal(`<span class="eyebrow">Level ${L}</span><h2>Promoted to ${esc(levelName(L))}!</h2><div class="prize">${biz.ic}</div><b>Tech Empire unlocked: ${esc(biz.n)}</b><p class="muted" style="margin:0">${esc(biz.f)}</p><span class="price"><span class="coinico">c</span> +50 coins</span><button class="btn block" id="mClose">Keep going</button>`, (r,close)=>{ $("#mClose").onclick=close; });
}
function showBadge(b){
  confetti();
  modal(`<span class="eyebrow">Badge unlocked</span><div class="badge got" style="border:0;background:none;opacity:1"><div class="medal" style="width:72px;height:72px;font-size:22px">${esc(b.m)}</div></div><h2>${esc(b.n)}</h2><p class="muted" style="margin:0">${esc(b.d)}</p><span class="price"><span class="coinico">c</span> +25 coins</span><button class="btn block" id="mClose">Awesome</button>`, (r,close)=>{ $("#mClose").onclick=close; });
}
function goalNow(type){ return type==="level"?levelOf(S.xp):type==="streak"?S.best:type==="xp"?S.xp:type==="mastered"?masteredCount():type==="structured"?S.n.structured:type==="daily"?S.n.daily:0; }
function checkParentGoals(){
  (S.parent.rewards||[]).forEach(r=>{ if(!r.reached && goalNow(r.type) >= r.target){ r.reached = today(); queueModal(()=>{ confetti(); modal(`<span class="eyebrow">Real-life reward unlocked</span><div class="prize">🏆</div><h2>${esc(r.title)}</h2><p style="margin:0">You hit <b>${esc(GOALS[r.type])} ${r.target}</b>. Real-life reward unlocked — show this to your parent to claim it!</p><button class="btn gold block" id="mClose">I'll show them</button>`, (x,close)=>{ $("#mClose").onclick=close; }); }); } });
}
