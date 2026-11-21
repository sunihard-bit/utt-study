/* =================== QUIZ ENGINE =================== */
let Q = null, qTimer = null;
function stopQuizTimer(){ if(qTimer){ clearInterval(qTimer); qTimer=null; } }
function pickQuestions({mode, topics, ids, n=5, s}){
  if(ids) return ids.filter(id=>QB[id]);
  const due = new Set(dueReviews());
  const wrongEver = new Set(S.mistakes.map(m=>m.id));
  let pool = BANK;
  if(topics) pool = BANK.filter(q=>topics.includes(q.t));
  else if(s) pool = BANK.filter(q=>q.s===s);
  if(mode==="fix"){
    const weak = new Set(weakTopics(3, s).map(t=>t.id));
    const score = q => (due.has(q.id)?100:0) + (wrongEver.has(q.id)?50:0) + (weak.has(q.t)?20:0) + Math.random()*10;
    return pool.map(q=>[q,score(q)]).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0].id);
  }
  if(mode==="exam") return shuffle(pool).slice(0,n).map(q=>q.id);
  const first = shuffle(pool.filter(q=>due.has(q.id))).slice(0, Math.ceil(n/3));
  const rest = shuffle(pool.filter(q=>!first.includes(q)));
  return shuffle(first.concat(rest).slice(0,n)).map(q=>q.id);
}
function prepItem(id){
  const q = QB[id], it = {id};
  if(q.ty==="mc") it.ord = shuffle(q.o.map((_,k)=>k));
  if(q.ty==="order"){ let o; do{ o = shuffle(q.o.map((_,k)=>k)); }while(q.o.length>1 && o.every((x,k)=>x===k)); it.cur = o; }
  if(q.ty==="match") it.rights = shuffle(q.o.map(p=>p[1])), it.pick = q.o.map(()=> "");
  return it;
}
function startQuiz(opts){
  const ids = pickQuestions(opts);
  if(!ids.length){ toast("Questions for this one are coming in the next update."); return; }
  const exam = opts.mode==="exam";
  Q = {mode:opts.mode, title:opts.title||"Quiz", s:opts.s||null, topics:opts.topics||null, items:ids.map(prepItem), i:0, results:[], chosen:[], answered:false, t0:Date.now(), qStart:Date.now(), exam, xp:0};
  if(exam){ Q.deadline = Date.now() + opts.min*60000; Q.min = opts.min; }
  go("quiz");
  if(exam){ qTimer = setInterval(()=>{ const left=Math.max(0,Q.deadline-Date.now()); const el=$("#qTimer"); if(el) el.textContent = fmtClock(left); if(left<=0){ stopQuizTimer(); Q.i = Q.items.length; toast("Time's up! Let's see how you did."); render(); } }, 500); }
}
const fmtClock = ms => { const s=Math.ceil(ms/1000); return Math.floor(s/60)+":"+pad(s%60); };
function norm(x){ return String(x).toLowerCase().replace(/\s+/g,"").replace(/[“”"']/g,""); }
/* returns [ok, chosenText] */
function checkItem(q, it, val){
  if(q.ty==="mc"){ const k = it.ord[val]; return [k===q.a, q.o[k]]; }
  if(q.ty==="tf") return [val===q.a, val?"True":"False"];
  if(q.ty==="fill") return [q.a.some(a=>norm(a)===norm(val)), val];
  if(q.ty==="order") return [it.cur.every((x,k)=>x===k), it.cur.map(k=>q.o[k]).join(" → ")];
  if(q.ty==="match"){ const ok = q.o.every((p,k)=>it.pick[k]===p[1]); return [ok, q.o.map((p,k)=>p[0]+" = "+(it.pick[k]||"?")).join("; ")]; }
  if(q.ty==="trace"){ const r = traceCheck(q, val); return [r.every(Boolean), `${r.filter(Boolean).length}/${r.length} boxes right`]; }
  return [false,""];
}
function submitAnswer(val){
  const it = Q.items[Q.i], q = QB[it.id];
  if(Q.answered) return;
  const [ok, chosen] = checkItem(q, it, val);
  const ms = Date.now()-Q.qStart;
  Q.results[Q.i] = ok; Q.chosen[Q.i] = chosen; it.val = val;
  recordAnswer(q, ok, ms, Q.mode, chosen);
  if(Q.exam){ save(); Q.i++; Q.qStart = Date.now(); render(); window.scrollTo({top:0}); return; }
  Q.answered = true;
  if(ok){ Q.xp += XP.correct; addXP(XP.correct, "correct answer"); } else save();
  render();
  setTimeout(()=>$(".fb")?.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
}
function qBody(q, it, showFb){
  const sub = `s-${q.s}`;
  let h = `<div class="qtext">${esc(q.q)}</div>${q.code?`<pre class="qcode">${esc(q.code)}</pre>`:""}${q.fc?flowSVG(q.fc):""}`;
  if(q.ty==="mc"){
    h += `<div class="opts">${it.ord.map((k,j)=>{ const cls = !showFb ? "" : k===q.a ? "ok" : (it.val===j ? "bad" : ""); return `<button class="opt ${cls}" data-v="${j}" ${showFb?"disabled":""}><span class="L">${"ABCD"[j]}</span><span>${esc(q.o[k])}</span></button>`; }).join("")}</div>`;
  } else if(q.ty==="tf"){
    h += `<div class="grid2">${[true,false].map(b=>{ const cls = !showFb ? "" : b===q.a ? "ok" : (it.val===b ? "bad" : ""); return `<button class="opt ${cls}" data-tf="${b}" ${showFb?"disabled":""} style="grid-template-columns:1fr;text-align:center;font-weight:700">${b?"True":"False"}</button>`; }).join("")}</div>`;
  } else if(q.ty==="fill"){
    h += `<div class="row" style="flex-wrap:nowrap"><input class="field mono" id="fillIn" autocomplete="off" autocapitalize="off" placeholder="Type your answer" value="${esc(it.val||"")}" ${showFb?"disabled":""}>${showFb?"":`<button class="btn sub" id="fillGo">${Q.exam?"Next":"Check"}</button>`}</div>`;
  } else if(q.ty==="order"){
    h += `<p class="muted" style="margin:0;font-size:14px">Use the arrows to put them in order (top = first).</p><div class="ordlist">${it.cur.map((k,j)=>`<div class="orditem ${showFb?(k===j?"ok":"bad"):""}"><span class="n">${j+1}</span><span>${esc(q.o[k])}</span>${showFb?"":`<span class="mv"><button data-up="${j}" aria-label="Move up" ${j===0?"disabled":""}>↑</button><button data-dn="${j}" aria-label="Move down" ${j===it.cur.length-1?"disabled":""}>↓</button></span>`}</div>`).join("")}</div>
    ${showFb?"":`<button class="btn sub block" id="ordGo">${Q.exam?"Save and next":"Check my order"}</button>`}`;
  } else if(q.ty==="match"){
    h += `<div class="matchgrid">${q.o.map((p,k)=>`<div class="matchrow ${showFb?(it.pick[k]===p[1]?"ok":"bad"):""}"><span class="l">${esc(p[0])}</span><select class="field" data-m="${k}" ${showFb?"disabled":""} aria-label="Match for ${esc(p[0])}"><option value="">Choose…</option>${it.rights.map(r=>`<option ${it.pick[k]===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>`).join("")}</div>
    ${showFb?"":`<button class="btn sub block" id="matchGo">${Q.exam?"Save and next":"Check my matches"}</button>`}`;
  } else if(q.ty==="trace"){
    h += traceQHTML(q, it, showFb);
  }
  return `<div class="${sub}" style="display:flex;flex-direction:column;gap:12px">${h}</div>`;
}
function bindQ(v, q, it){
  v.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>submitAnswer(+b.dataset.v));
  v.querySelectorAll("[data-tf]").forEach(b=>b.onclick=()=>submitAnswer(b.dataset.tf==="true"));
  const fi=$("#fillIn"); if(fi && !Q.answered){ fi.focus({preventScroll:true}); fi.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); $("#fillGo").click(); } }; $("#fillGo").onclick=()=>{ const x=fi.value.trim(); if(!x){ toast("Type an answer first."); return; } submitAnswer(x); }; }
  v.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{ const j=+b.dataset.up; [it.cur[j-1],it.cur[j]]=[it.cur[j],it.cur[j-1]]; render(); });
  v.querySelectorAll("[data-dn]").forEach(b=>b.onclick=()=>{ const j=+b.dataset.dn; [it.cur[j+1],it.cur[j]]=[it.cur[j],it.cur[j+1]]; render(); });
  if($("#ordGo")) $("#ordGo").onclick=()=>submitAnswer(it.cur.slice());
  v.querySelectorAll("[data-m]").forEach(s=>s.onchange=()=>{ it.pick[+s.dataset.m]=s.value; });
  if($("#trGo")) $("#trGo").onclick=()=>{ const vals=[...v.querySelectorAll("[data-b]")].sort((a,b)=>a.dataset.b-b.dataset.b).map(x=>x.value.trim()); if(vals.some(x=>!x)){ toast("Fill in every blank box first."); return; } submitAnswer(vals); };
  v.querySelectorAll("[data-b]").forEach(x=>x.oninput=x.onchange=()=>{ (it.val ||= [])[+x.dataset.b]=x.value.trim(); });
  if($("#matchGo")) $("#matchGo").onclick=()=>{ if(it.pick.some(x=>!x)){ toast("Match every item first."); return; } submitAnswer(it.pick.slice()); };
}
function viewQuiz(v){
  if(!Q) return go("practice");
  if(Q.i >= Q.items.length) return quizDone(v);
  const it = Q.items[Q.i], q = QB[it.id];
  const prog = Q.items.map((_,k)=>`<i class="${k<Q.i?(Q.exam?"now":Q.results[k]?"ok":"bad"):k===Q.i?"now":""}"></i>`).join("");
  let fb = "";
  if(Q.answered){
    const right = Q.results[Q.i];
    fb = right
      ? `<div class="fb ok"><h4>Correct! +${XP.correct} XP</h4><div><span class="lbl">Why it's right</span><div>${esc(q.why)}</div></div></div>`
      : `<div class="fb bad"><h4>Not quite, but this is how you learn.</h4>
          <div><span class="lbl">The answer</span><div><b>${esc(answerText(q))}</b></div></div>
          ${q.trap?`<div class="fixbox"><span class="lbl">The likely mistake and the fix</span><div>${esc(q.trap)}</div></div>`:""}
          <div><span class="lbl">Why</span><div>${esc(q.why)}</div></div>
          <a class="btn line sm" style="align-self:flex-start" href="${esc(coachLink({t:q.t, mistakes:[S.mistakes[0]], m:"review"}))}" target="_blank" rel="noopener">Still confused? Ask Coach ↗</a></div>`;
  }
  v.innerHTML = `
  <div class="qtop"><button class="back" id="bk">← Quit</button>${Q.exam?`<span class="timerpill" id="qTimer">${fmtClock(Q.deadline-Date.now())}</span>`:`<span class="eyebrow">${esc(Q.title)}</span>`}</div>
  <div class="card qcard s-${q.s}">
    <div class="qtop"><div class="qprog">${prog}</div><span class="eyebrow" style="margin-left:8px">${Q.i+1}/${Q.items.length}</span></div>
    <div class="row between"><span class="eyebrow" style="color:var(--sub)">${esc(SUBJ[q.s].code)} · ${esc(TOPIC[q.t].name)}</span><span class="eyebrow">${{e:"Easy",m:"Medium",h:"Hard"}[q.d]||""}</span></div>
    ${qBody(q, it, Q.answered)}
    ${fb}
    ${Q.answered?`<button class="btn block" id="qNext">${Q.i+1<Q.items.length?"Next question":"See my results"}</button>`:""}
  </div>`;
  $("#bk").onclick = ()=>{ if(Q.exam && !confirmQuit()) return; Q=null; go("practice"); };
  bindQ(v, q, it);
  if($("#qNext")) $("#qNext").onclick = ()=>{ Q.i++; Q.answered=false; Q.qStart=Date.now(); render(); window.scrollTo({top:0,behavior:"smooth"}); };
}
let quitArmed = 0;
function confirmQuit(){ if(Date.now()-quitArmed < 4000) return true; quitArmed = Date.now(); toast("Tap Quit again to end the exam."); return false; }
function quizDone(v){
  stopQuizTimer();
  const total = Q.items.length, right = Q.results.filter(Boolean).length, pct = Math.round(right/total*100);
  if(!Q.finished){
    Q.finished = true;
    const ms = Date.now()-Q.t0;
    S.quizLog.push({at:new Date().toISOString(), mode:Q.mode, title:Q.title, s:Q.s, score:right, total, ms, ids:Q.items.map(x=>x.id), res:Q.results.map(x=>x?1:0)});
    if(S.quizLog.length>500) S.quizLog.splice(0, S.quizLog.length-500);
    if(Q.exam){ Q.items.forEach((it,k)=>{ if(Q.results[k]===undefined){ const q=QB[it.id]; Q.results[k]=false; Q.chosen[k]="(no answer)"; recordAnswer(q,false,0,"exam","(no answer)"); } }); }
    if(Q.mode==="daily"){ S.daily = today(); S.n.daily++; addXP(XP.daily, "daily challenge"); }
    else {
      S.n.quiz++; if(pct===100) S.n.perfect++;
      const per = {};
      Q.items.forEach((it,k)=>{ const t=QB[it.id].t; (per[t] ||= [0,0]); per[t][1]++; if(Q.results[k]) per[t][0]++; });
      for(const [tid,[r,n]] of Object.entries(per)){ const st=topicStat(tid); if(Q.mode==="topic"||Q.mode==="weak"||n>=3){ st.quiz++; st.best=Math.max(st.best, Math.round(r/n*100)); } }
      const bonus = (Q.exam ? right*XP.correct : 0) + XP.quiz + (pct===100?XP.perfect:0);
      addXP(bonus, pct===100?"perfect quiz bonus!":Q.exam?"exam simulation marked":"quiz complete");
    }
  }
  const wrong = Q.items.map((it,k)=>({q:QB[it.id],k})).filter(x=>!Q.results[x.k]);
  const msg = pct===100?"Bug-free! Every answer right.":pct>=80?"Strong work. You're close to mastering this.":pct>=50?"Good effort. Let's fix the ones you missed.":"This needs more practice, and that's fine. Every mistake here is one you won't make in the exam.";
  const missed = wrong.map(({q,k})=>({t:q.t, q:q.q, chosen:Q.chosen[k], correct:answerText(q)}));
  v.innerHTML = `
  <div class="hero"><div class="circuit"></div><span class="eyebrow">${esc(Q.title)}${Q.exam?" · marked":""}</span>
    <div class="big">${right}/${total}</div><h2 style="font-size:20px">${msg}</h2>${Q.exam?`<p style="margin:0">That's ${pct}%. The pass mark is 50%.</p>`:""}</div>
  ${wrong.length?`<div class="card"><span class="eyebrow">What you missed</span><div class="view" style="gap:12px;margin-top:8px">${wrong.map(({q,k})=>`<div class="mistake"><b>${esc(q.q)}</b>${q.code?`<pre class="qcode">${esc(q.code)}</pre>`:""}<span>You said: ${esc(Q.chosen[k])}</span><span>Answer: <b>${esc(answerText(q))}</b></span>${q.trap?`<span class="muted">${esc(q.trap)}</span>`:""}</div>`).join("")}</div>
   <a class="btn gold block" style="margin-top:12px" href="${esc(coachLink({mistakes:missed, m:"review", s:Q.s||wrong[0].q.s}))}" target="_blank" rel="noopener">Review my mistakes with Coach ↗</a>
   <p class="muted" style="margin:8px 0 0;font-size:13px">Missed questions come back in <b>Fix My Weak Spots</b> until you get them right twice.</p></div>`:""}
  <div class="grid2">
    ${Q.mode==="daily"?"":`<button class="btn" id="qAgain">Another round</button>`}
    <button class="btn ghost" id="qHome">Back to home</button>
  </div>`;
  const last = Q;
  if($("#qAgain")) $("#qAgain").onclick = ()=>startQuiz({mode:last.mode, topics:last.topics, s:last.s, n:last.items.length, title:last.title, min:last.min});
  $("#qHome").onclick = ()=>{ Q=null; go("home"); };
}

/* =================== PRACTICE =================== */
function viewPractice(v){
  if(COACH_MODE) return viewCoachPractice(v);
  const s = SUBJ[S.subj] || SUBJECTS[0];
  const due = dueReviews().length, dueS = dueReviews(s.id).length;
  const nS = BANK.filter(q=>q.s===s.id).length;
  const mode = (ic, t, d, id, extra="") => `<button class="mode" id="${id}"><span class="mi">${ic}</span><span><b>${t}</b><span class="d">${d}</span></span><span class="go">${extra||"›"}</span></button>`;
  v.innerHTML = `
  <div><h2 style="font-size:26px">Practice</h2><p class="muted" style="margin:4px 0 0">Every wrong answer explains the likely mistake. Missed questions come back until you get them right twice.</p></div>
  <div class="modelist">
    ${mode("☀️","Daily challenge",S.daily===today()?"Done for today. Back tomorrow.":`One question, +${XP.daily} XP bonus`,"pDaily")}
    ${mode("🎯","Fix My Weak Spots",due?`${due} question${due===1?"":"s"} due for review, plus your weakest topics`:"Built from your lowest topics and past mistakes","pFix", due?`<span class="score">${due}</span>`:"")}
  </div>
  <div class="sec-h"><h3>By subject</h3></div>
  ${subjPicker(s.id)}
  <div class="modelist s-${s.id}">
    ${mode("📚","Practice by topic",`Pick any of the ${topicsOf(s.id).length} ${s.code} topics`,"pTopic")}
    ${mode("🔀","Mixed revision",`10 questions across ${s.name}${dueS?`, including ${dueS} due for review`:""}`,"pMixed")}
    ${s.id==="logc"?mode("▦","Trace table practice",`Fill in the blanks in real trace tables · ${S.n.trace||0}/10 for the Trace Table Pro badge`,"pTrace"):""}
    ${mode("⏱️","Exam simulation",`${esc(s.sim.label)} ${Math.min(s.sim.n,nS)} questions, ${Math.max(5,Math.round(s.sim.min*Math.min(s.sim.n,nS)/s.sim.n))} minutes.`,"pExam")}
    <a class="mode" href="${esc(coachLink({s:s.id, m:"struct"}))}" target="_blank" rel="noopener"><span class="mi">✍️</span><span><b>Structured questions</b><span class="d">Type a long answer and the Coach marks it: +${XP.structuredBase} XP plus ${XP.perMark} per mark</span></span><span class="go">↗</span></a>
  </div>
  <div class="sec-h" id="gamesH"><h3>Speed games</h3><span class="muted" style="font-size:13px">45 seconds · streaks of 3 earn bonus points · ${XP.perPoint} XP per point</span></div>
  <div class="modelist">${Object.entries(GAMES).map(([k,g])=>`<button class="mode s-${g.s}" data-game="${k}"><span class="mi" style="background:var(--sub-soft)">⚡</span><span><b>${esc(g.n)}</b><span class="d">${esc(SUBJ[g.s].code)} · ${esc(g.d)}</span></span><span class="score">Best ${S.games[k]||0}</span></button>`).join("")}</div>`;
  bindSubjPicker(v);
  $("#pDaily").onclick = ()=>{ if(S.daily===today()){ toast("Today's challenge is done. Come back tomorrow!"); return; } startQuiz({mode:"daily", ids:[pickDaily().id], title:"Daily challenge"}); };
  $("#pFix").onclick = ()=>startQuiz({mode:"fix", n:8, title:"Fix My Weak Spots"});
  $("#pTopic").onclick = ()=>go("topics");
  if($("#pTrace")) $("#pTrace").onclick = ()=>startQuiz({mode:"mixed", ids:shuffle(BANK.filter(q=>q.ty==="trace").map(q=>q.id)).slice(0,5), title:"Trace table practice"});
  $("#pMixed").onclick = ()=>startQuiz({mode:"mixed", s:s.id, n:10, title:`${s.name} mixed revision`});
  $("#pExam").onclick = ()=>{ const n=Math.min(s.sim.n,nS), min=Math.max(5,Math.round(s.sim.min*n/s.sim.n));
    modal(`<span class="eyebrow">${s.code} · exam simulation</span><h2>${n} questions, ${min} minutes</h2><p class="muted" style="margin:0">No answers are shown until the end, just like the real thing. Unanswered questions count as wrong.</p><button class="btn gold block" id="exGo">Start the clock</button><button class="btn line block" id="exNo">Not now</button>`, (r,close)=>{ $("#exNo").onclick=close; $("#exGo").onclick=()=>{ close(); startQuiz({mode:"exam", s:s.id, n, min, title:`${s.code} exam simulation`}); }; }); };
  v.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{ G={key:b.dataset.game, state:"intro"}; go("game"); });
  if(sub==="games") setTimeout(()=>$("#gamesH")?.scrollIntoView({behavior:"smooth"}),50);
}

/* =================== SPEED GAMES =================== */
let G = null, gTimer = null;
function stopGame(){ if(gTimer){ clearInterval(gTimer); gTimer=null; } }
function gameOptions(c){
  if(c.opts) return shuffle(c.opts);
  const others = shuffle([...new Set(c.pool)].filter(x=>x!==c.a)).slice(0,3);
  return shuffle([c.a, ...others]);
}
function viewGame(v){
  if(!G) return go("practice", "games");
  const g = GAMES[G.key], sc = `s-${g.s}`;
  if(G.state==="intro"){
    v.innerHTML = `<button class="back" id="bk">← Practice</button>
    <div class="hero subj ${sc}"><div class="circuit"></div><span class="eyebrow">${SUBJ[g.s].code} · speed game · 45 seconds</span><h2>${esc(g.n)}</h2>
    <p style="margin:0">${esc(g.d)} Get 3 in a row for bonus points.</p>
    <div class="stats"><div class="stat"><b>${S.games[G.key]||0}</b><span>your best</span></div><div class="stat"><b>45s</b><span>time</span></div><div class="stat"><b>${XP.perPoint}</b><span>XP per point</span></div></div></div>
    <button class="btn gold block" id="gStart">Start</button>
    ${G.key==="layer"?`<div class="card"><span class="eyebrow">Memory aid</span><p style="margin:6px 0 0">Layers 1 → 7: <b>P</b>lease <b>D</b>o <b>N</b>ot <b>T</b>hrow <b>S</b>ausage <b>P</b>izza <b>A</b>way (Physical, Data Link, Network, Transport, Session, Presentation, Application).</p></div>`:""}`;
    $("#bk").onclick=()=>{ G=null; go("practice","games"); }; $("#gStart").onclick=startGame; return;
  }
  if(G.state==="over"){
    v.innerHTML = `<div class="hero subj ${sc}"><div class="circuit"></div><span class="eyebrow">Time's up · ${esc(g.n)}</span><div class="big">${G.score}</div><h2>${G.newBest?"New personal best!":`Best: ${S.games[G.key]||0}`}</h2><p style="margin:0">${G.right} right, ${G.wrong.length} wrong.</p></div>
    ${G.wrong.length?`<div class="card"><span class="eyebrow">Fix these</span><div class="view" style="gap:10px;margin-top:8px">${G.wrong.slice(0,8).map(w=>`<div class="mistake">${w.code?`<pre class="qcode">${esc(w.code)}</pre>`:`<b>${esc(w.p)}</b>`}<span>Answer: <b>${esc(w.a.replace("\n"," – "))}</b></span></div>`).join("")}</div></div>`:""}
    <div class="grid2"><button class="btn gold" id="gAgain">Play again</button><button class="btn ghost" id="gBack">Done</button></div>`;
    $("#gAgain").onclick=startGame; $("#gBack").onclick=()=>{G=null;go("practice","games");}; return;
  }
  const c = G.cur;
  v.innerHTML = `
  <div class="row between"><span class="big" style="font-size:34px">${G.score}</span><span class="eyebrow">${G.combo>=3?`🔥 Streak x${G.combo}`:esc(g.n)}</span></div>
  <div class="timer"><i id="gBar" style="width:${G.left/45*100}%"></i></div>
  <div class="gcard ${G.flash||""} ${sc}" id="gCard">${c.code?`<span class="muted">What does it print?</span><pre>${esc(c.code)}</pre>`:`<div class="tx">${esc(c.p)}</div>`}</div>
  <div class="gopts ${sc}">${G.opts.map((o,k)=>`<button class="btn" data-g="${k}">${esc(o)}</button>`).join("")}</div>`;
  v.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>answerGame(G.opts[+b.dataset.g]));
}
function nextCard(){ G.cur = G.deck[G.i % G.deck.length]; G.opts = gameOptions(G.cur); }
function startGame(){
  stopGame();
  G = {key:G.key, state:"play", deck:shuffle(GAMES[G.key].deck()), i:0, score:0, right:0, combo:0, wrong:[], left:45, flash:""};
  nextCard(); render();
  const t0 = Date.now();
  gTimer = setInterval(()=>{ G.left = Math.max(0, 45 - (Date.now()-t0)/1000); const b=$("#gBar"); if(b) b.style.width=(G.left/45*100)+"%"; if(G.left<=0) endGame(); }, 200);
}
function answerGame(choice){
  if(G.state!=="play") return;
  const c = G.cur;
  if(choice===c.a){ G.combo++; G.right++; G.score += 1 + (G.combo>=3?1:0); G.flash="flashok"; }
  else { G.combo=0; G.wrong.push(c); G.flash="flashbad"; }
  G.i++; nextCard(); render(); setTimeout(()=>{ G.flash=""; const gc=$("#gCard"); if(gc) gc.classList.remove("flashok","flashbad"); }, 300);
}
function endGame(){
  stopGame(); G.state="over";
  G.newBest = G.score > (S.games[G.key]||0); if(G.newBest) S.games[G.key] = G.score;
  S.log.push({at:new Date().toISOString(), q:"game:"+G.key, t:GAMES[G.key].s, ok:G.right, m:"game", ms:45000, c:`score ${G.score}, wrong ${G.wrong.length}`});
  if(G.score>0) addXP(G.score*XP.perPoint, GAMES[G.key].n); else { checkBadges(); save(); }
  render();
}

/* =================== PROGRESS (ME) =================== */
function viewMe(v){
  const L = levelOf(S.xp), lo=levelFloor(L), hi=levelFloor(L+1);
  const week = [...Array(7)].map((_,k)=>{ const d=new Date(); d.setDate(d.getDate()-(6-k)); const s=dstr(d); return {s, x:S.days[s]||0, l:"SMTWTFS"[d.getDay()]}; });
  const mx = Math.max(DAILY_GOAL, ...week.map(w=>w.x));
  const answers = S.log.filter(x=>!String(x.q).startsWith("game:"));
  const acc = answers.length ? Math.round(answers.filter(x=>x.ok).length/answers.length*100) : 0;
  const totalTime = Object.values(S.topics).reduce((a,t)=>a+(t.time||0),0);
  const s = SUBJ[S.subj] || SUBJECTS[0];
  const tileCls = st => ({m:"g", g:"a", l:"r", n:""})[st];
  v.innerHTML = `
  <div class="hero"><div class="circuit"></div><span class="eyebrow">Level ${L}</span><h2>${esc(S.name)}, ${esc(levelName(L))}</h2>
    <div><div class="bar" style="background:rgba(255,255,255,.22)"><i style="width:${Math.round((S.xp-lo)/(hi-lo)*100)}%;background:#FFC94A"></i></div><span style="font-size:13px;opacity:.88">${hi-S.xp} XP to ${esc(levelName(L+1))}</span></div>
    <div class="stats"><div class="stat"><b>${S.xp.toLocaleString()}</b><span>total XP</span></div><div class="stat"><b>${S.best}</b><span>best streak</span></div><div class="stat"><b>${S.n.quiz+S.n.daily}</b><span>quizzes</span></div></div></div>
  <div class="card"><span class="eyebrow">This week</span>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:110px;margin-top:10px">
    ${week.map(w=>`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><span style="font-size:11px;font-variant-numeric:tabular-nums" class="muted">${w.x||""}</span><div style="width:100%;max-width:28px;border-radius:6px 6px 2px 2px;height:${Math.max(4,Math.round(w.x/mx*70))}px;background:${w.x>=DAILY_GOAL?"var(--ok)":w.x?"var(--gold)":"var(--line)"}"></div><b style="font-size:12px">${w.l}</b></div>`).join("")}
    </div></div>
  <div class="card"><span class="eyebrow">Stats</span><div class="stats" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">${[["Questions answered",answers.length],["Correct",acc+"%"],["Time studied",fmtTime(totalTime)],["Topics mastered",masteredCount()+"/"+TOPICS.length],["Due for review",dueReviews().length],["Coach questions",S.n.tutor]].map(([a,b])=>`<div class="stat" style="background:var(--bg)"><b>${b}</b><span>${a}</span></div>`).join("")}</div></div>

  <div class="card"><span class="eyebrow">Topic map</span>
    <div style="margin:10px 0">${subjPicker(s.id)}</div>
    <div class="legend"><span><i style="background:var(--ok)"></i>Mastered (80%+)</span><span><i style="background:var(--gold)"></i>Getting there</span><span><i style="background:var(--red)"></i>Learning</span><span><i style="background:var(--line)"></i>Not started</span></div>
    <div class="map" style="margin-top:10px">${topicsOf(s.id).map((t,k)=>{ const st=masteryState(t.id), p=masteryPct(t.id); return `<button class="tile ${tileCls(st)}" data-topic="${t.id}"><span>${s.code} · ${k+1}</span><b>${esc(t.name)}</b><span>${MLABEL[st]}${p!==null?" · "+p+"%":""}</span></button>`; }).join("")}</div>
    <div class="tblwrap" style="margin-top:12px"><table class="stt"><thead><tr><th>Topic</th><th>Done</th><th>Right</th><th>Best</th><th>Time</th><th>Last</th></tr></thead><tbody>
    ${topicsOf(s.id).map((t,k)=>{ const st=S.topics[t.id]||{}; return `<tr><td>${k+1}. ${esc(t.name)}</td><td>${st.att||0}</td><td>${st.att?Math.round(st.ok/st.att*100)+"%":"–"}</td><td>${st.quiz?st.best+"%":"–"}</td><td>${st.time?fmtTime(st.time):"–"}</td><td>${fmtDate(st.last)}</td></tr>`; }).join("")}
    </tbody></table></div></div>

  <div class="card"><span class="eyebrow">My mistakes</span>
    ${S.mistakes.length?`<div class="view" style="gap:12px;margin-top:8px">${S.mistakes.slice(0,10).map(m=>`<div class="mistake"><span class="eyebrow">${esc(SUBJ[TOPIC[m.t]?.s]?.code||"")} · ${esc(TOPIC[m.t]?.name||"")}</span><b>${esc(m.q)}</b><span>You said: ${esc(m.chosen)} · Correct: ${esc(m.correct)}</span>${m.fix?`<span class="muted">${esc(m.fix)}</span>`:""}</div>`).join("")}</div>
      <a class="btn gold block" style="margin-top:12px" href="${esc(coachLink({mistakes:S.mistakes, m:"review"}))}" target="_blank" rel="noopener">Review my mistakes with Coach ↗</a>`
    :`<p class="muted" style="margin:6px 0 0">Questions you get wrong are saved here so you can fix them later.</p>`}</div>

  <div class="card"><span class="eyebrow">Settings</span>
    <div class="view" style="gap:12px;margin-top:8px">
      <div><label class="lab" for="rn">Name</label><div class="row" style="flex-wrap:nowrap"><input class="field" id="rn" value="${esc(S.name)}" maxlength="30"><button class="btn sm" id="rnSave">Save</button></div></div>
      <div><span class="lab">Appearance</span><div class="seg">${[["auto","Auto"],["light","Light"],["dark","Dark"]].map(([k,l])=>`<button class="${(S.look||"auto")===k?"on":""}" data-look="${k}">${l}</button>`).join("")}</div></div>
      <div><span class="lab">Cloud backup</span>
        ${S.cloud?.code?`<p style="margin:0 0 6px;font-size:14px">Your progress backs up automatically. On a new phone, choose <b>Restore</b> on the welcome screen and enter this code:</p>
        <div class="row" style="flex-wrap:nowrap"><input class="field mono" readonly value="${fmtCode(S.cloud.code)}" id="ccode"><button class="btn sm" id="ccopy">Copy</button></div>
        <p class="muted" style="margin:6px 0 0;font-size:13px" id="cstat">${syncErr?"Last backup didn't go through (no internet?). It will retry.":lastSync?"Backed up at "+lastSync.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})+".":"Backs up a few seconds after you study."}</p>
        <button class="btn line sm" id="cnow" style="margin-top:8px">Back up now</button>`
        :`<p class="muted" style="margin:0;font-size:14px">Cloud backup starts when you use the app online at utt.tidyassistant.com.</p>`}
      </div>
    </div></div>`;
  bindSubjPicker(v); bindTopicRows(v);
  $("#rnSave").onclick=()=>{ const n=$("#rn").value.trim(); if(n){ S.name=n; save(); toast("Name saved"); render(); } };
  v.querySelectorAll("[data-look]").forEach(b=>b.onclick=()=>{ S.look=b.dataset.look; save(); applyTheme(); render(); });
  if($("#ccopy")) $("#ccopy").onclick=async()=>{ try{ await navigator.clipboard.writeText(fmtCode(S.cloud.code)); toast("Backup code copied"); }catch(e){ $("#ccode").select(); } };
  if($("#cnow")) $("#cnow").onclick=async()=>{ dirty=true; await syncNow(); render(); toast(syncErr?"Couldn't reach the backup. Try again with internet.":"Backed up ✓"); };
}

/* =================== COACH DOOR (main app) =================== */
function viewCoachDoor(v){
  const t = S.lastTopic && TOPIC[S.lastTopic];
  v.innerHTML = `<div class="hero"><div class="circuit"></div><span class="eyebrow">Needs internet</span><h2>Ask Coach</h2>
    <p style="margin:0">Coach opens in Claude. Ask anything, get a lesson with diagrams, work through a problem together step by step, or send a photo of your working for feedback.</p>
    <a class="btn gold" href="${esc(coachLink({t:t?.id}))}" target="_blank" rel="noopener">Open Coach${t?": "+esc(t.name):""} ↗</a></div>
  <div class="integrity"><span style="font-size:20px">🎓</span><div><b>Coach teaches, it doesn't do graded work.</b> UTT's rule for all three courses is "AI use barely permitted". If you paste an assignment, lab, project or quiz question, Coach will explain the idea and work a <i>different</i> example with you, so the work you hand in is all yours.</div></div>
  <div class="grid2">
    <a class="btn ghost" href="${esc(coachLink({t:t?.id, m:"work"}))}" target="_blank" rel="noopener">Work it with me ↗</a>
    <a class="btn ghost" href="${esc(coachLink({mistakes:S.mistakes, m:"review"}))}" target="_blank" rel="noopener" ${S.mistakes.length?"":"aria-disabled=\"true\""}>Review my mistakes ↗</a>
  </div>
  <div class="card"><span class="eyebrow">Your points come back here</span><p style="margin:6px 0 0">When you finish with Coach, tap <b>Add XP to app</b> at the top of the Coach page. Your XP, streak and badges all stay in this app (up to ${MAX_CLAIM.toLocaleString()} XP per link, and each link works once).</p></div>
  ${SUBJECTS.map(s=>`<div class="card s-${s.id}"><span class="eyebrow" style="color:var(--sub)">${s.code} · open Coach on a topic</span><div class="chips" style="flex-wrap:wrap;margin-top:8px">${topicsOf(s.id).map(x=>`<a class="chip" href="${esc(coachLink({t:x.id}))}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join("")}</div></div>`).join("")}`;
}
