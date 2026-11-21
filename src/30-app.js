/* =================== ROUTER =================== */
let tab = "home", sub = null;
const TABS = [["home","Home","home"],["topics","Topics","book"],["tutor","Coach","chat"],["practice","Practice","target"],["rewards","Rewards","gift"]];
function go(t, s=null){ stopGame(); stopQuizTimer(); tab=t; sub=s; render(); window.scrollTo({top:0}); }
function renderTabs(){
  const list = COACH_MODE ? [["tutor","Coach","chat"],["topics","Lessons","book"],["practice","Structured","target"]] : S.role==="parent" ? [["parenthome","Rewards","gift"]] : TABS;
  document.querySelector("nav.tabs").hidden = S.role==="parent" || (!S.name && !COACH_MODE);
  $("#tabs").style.gridTemplateColumns = `repeat(${list.length},1fr)`;
  const cur = ["quiz","game","structured"].includes(tab) ? "practice" : tab==="lesson" ? "topics" : tab==="me" ? "rewards" : tab==="parent" ? "rewards" : tab;
  $("#tabs").innerHTML = list.map(([id,label,ic])=>`<button class="${cur===id?"on":""}" data-tab="${id}" aria-current="${cur===id?"page":"false"}">${ico(ic)}<span>${label}</span></button>`).join("");
  $("#tabs").querySelectorAll("button").forEach(b=>b.onclick=()=>go(b.dataset.tab));
}
async function renderHeader(){
  if(COACH_MODE){
    $("#hdrAv").hidden=true; $("#hdrBar").parentElement.hidden=true; $("#hdrStreak").hidden=true;
    $("#brand").innerHTML = "UTT Study <small>COACH</small>";
    const pend=S.pendXP||0, c=pendingCounts(), any = pend||c.t||c.s||c.p||c.r;
    const show = Math.min(pend, MAX_CLAIM);
    $("#hdrCoins").innerHTML = any ? `<a href="#" id="sendPts">Add ${show} XP to app ↗</a>` : `<a href="${APP_URL}" target="_blank" rel="noopener">Open app ↗</a>`;
    const sp=$("#sendPts");
    if(sp){ const url = await claimURL(); sp.href=url; sp.target="_blank"; sp.rel="noopener"; sp.onclick=()=>setTimeout(()=>{ markClaimSent(); if(S.pendXP>0) toast(`${S.pendXP} XP still waiting. Tap again to send the rest.`); },300); }
    return;
  }
  const isP = S.role==="parent", hide = isP || !S.name;
  $("#hdrAv").hidden=hide; $("#hdrStreak").hidden=hide; $("#hdrCoins").hidden=hide; $("#hdrBar").parentElement.hidden=hide;
  $("#brand").innerHTML = isP ? "UTT Study <small>PARENT</small>" : "UTT Study Coach";
  const L = levelOf(S.xp), lo = levelFloor(L), hi = levelFloor(L+1);
  $("#hdrStreak").innerHTML = ico("flame")+liveStreak();
  $("#hdrCoins").innerHTML = `<span class="coinico">c</span>`+S.coins.toLocaleString();
  const av=$("#hdrAv"); av.textContent = avatarFace(); av.onclick = ()=>go("me");
  $("#hdrBar").style.width = Math.round((S.xp-lo)/(hi-lo)*100)+"%";
}
function render(){
  renderHeader(); renderTabs();
  const v = $("#view");
  if(COACH_MODE && !["tutor","topics","practice","structured"].includes(tab)) tab="tutor";
  if(S.role==="parent" && S.name) tab="parenthome"; else if(tab==="parenthome") tab="home";
  if(!S.name){ return COACH_MODE ? viewCoachWelcome(v) : viewWelcome(v); }
  ({home:viewHome, topics:viewTopics, tutor:viewTutor, practice:viewPractice, me:viewMe, quiz:viewQuiz, game:viewGame, structured:viewStructured, rewards:viewRewards, parent:viewParent, parenthome:viewParentHome, lesson:viewLesson})[tab](v);
}

/* =================== WELCOME =================== */
function viewWelcome(v){
  v.innerHTML = `
  <div class="hero"><div class="circuit"></div>
    <span class="eyebrow">UTT · Diploma in Software Engineering · Year 1</span>
    <h2>Networks, Python and hardware, one step at a time.</h2>
    <p style="margin:0">Short lessons with pictures, quizzes that explain your mistakes, a Coach you can ask anything, and rewards for every bit of effort.</p>
  </div>
  <div class="card"><form id="wf" class="view" style="gap:12px">
    <div><label class="lab" for="nm">What should Coach call you?</label>
    <input class="field" id="nm" maxlength="30" autocomplete="given-name" placeholder="Your first name" value="Suri" required></div>
    <button class="btn block" type="submit">Start studying</button>
  </form></div>
  <div class="card"><span class="eyebrow">Already use the app on another device?</span><p style="margin:6px 0 10px">Enter the backup code from <b>Me → Settings</b> on that device to bring your progress here and keep both in sync.</p>
    <div class="row" style="flex-wrap:nowrap"><input class="field mono" id="rcode" placeholder="xxxx-xxxx-xxxx-xxxx" autocomplete="off" autocapitalize="off"><button class="btn sm" id="rgo">Restore</button></div></div>
  <div class="card"><span class="eyebrow">Parents</span><p style="margin:6px 0 10px">Setting up real-life rewards from your own phone?</p><button class="btn line block" id="asParent">I'm a parent</button></div>`;
  $("#asParent").onclick = ()=>{ S.role="parent"; S.name="Parent"; save(); go("parenthome"); };
  $("#wf").onsubmit = e => { e.preventDefault(); const n=$("#nm").value.trim(); if(!n) return; S.name=n; S.created ||= today(); save(); initCloud(); go("home"); };
  $("#rgo").onclick = ()=>restoreFrom($("#rcode").value);
}
async function restoreFrom(raw){
  const code = String(raw||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  if(!/^[a-z2-9]{16}$/.test(code)){ toast("That code should be 16 letters and numbers."); return; }
  try{
    const remote = await pullCloud(code);
    if(!remote){ toast("No backup found for that code."); return; }
    S = Object.assign(DEF(), remote); S.n = Object.assign(DEF().n, S.n||{}); S.cloud = {code, since:S.cloud?.since||today()}; S.role=null;
    try{ localStorage.setItem(BASE_KEY, JSON.stringify(S)); }catch(e){}
    save(); applyTheme(); toast(`Welcome back, ${S.name}! Progress restored.`, true); go("home");
  }catch(e){ toast("Couldn't reach the backup. Check your internet and try again."); }
}

/* =================== HOME =================== */
function pickDaily(){
  if(S.dailyQ?.d===today() && QB[S.dailyQ.id]) return QB[S.dailyQ.id];
  const due = dueReviews(); const weak = weakTopics(3).map(t=>t.id);
  let pool = due.length ? due.map(id=>QB[id]) : weak.length ? BANK.filter(q=>weak.includes(q.t)) : BANK;
  if(!pool.length) pool = BANK;
  const q = pool[hashStr(today()+"utt") % pool.length];
  S.dailyQ = {d:today(), id:q.id}; save(); return q;
}
function viewHome(v){
  const h = new Date().getHours();
  const greet = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const todayXP = S.days[today()]||0, pct = Math.min(100, Math.round(todayXP/DAILY_GOAL*100));
  const L = levelOf(S.xp), st = liveStreak();
  const dq = pickDaily(); const done = S.daily===today();
  const weak = weakTopics(3);
  const last = S.lastTopic && TOPIC[S.lastTopic];
  const due = dueReviews().length;
  v.innerHTML = `
  <div class="hero"><div class="circuit"></div>
    <span class="eyebrow">${esc(levelName(L))} · Level ${L}</span>
    <h2>${greet}, ${esc(S.name)}.</h2>
    <div class="goal"><div class="ring" style="--p:${pct}"><b>${todayXP}/${DAILY_GOAL}</b></div>
      <div>${pct>=100?"<b>Daily goal smashed.</b> Anything extra is a bonus.":`<b>Today's goal: ${DAILY_GOAL} XP.</b> ${DAILY_GOAL-todayXP} XP to go.`}<br><span style="opacity:.88">${st?`Keep your ${st}-day streak alive 🔥`:"Earn any XP today to start a streak."}</span></div></div>
    <div class="stats">
      <div class="stat"><b>${st}</b><span>day streak</span></div>
      <div class="stat"><b>${Object.keys(S.badges).length}/${BADGES.length}</b><span>badges</span></div>
      <div class="stat"><b>${due}</b><span>to review</span></div>
    </div>
  </div>

  ${last?`<div class="card s-${last.s}"><span class="eyebrow">Continue where you left off</span><div class="row between" style="margin-top:4px;flex-wrap:nowrap"><div style="min-width:0"><span class="eyebrow" style="color:var(--sub)">${esc(SUBJ[last.s].code)}</span><h3 style="margin:2px 0 0">${esc(last.name)}</h3></div>${masteryChip(last.id)}</div><button class="btn sub block" id="hLast" style="margin-top:10px">Continue</button></div>`:""}

  <div class="sec-h"><h3>Your subjects</h3></div>
  <div class="subjects">${SUBJECTS.map(s=>`<button class="subjcard s-${s.id}" data-subj="${s.id}"><span class="ic">${ico(s.ic)}</span><span style="min-width:0"><span class="code">${s.code}</span><b>${esc(s.name)}</b><div class="bar" style="margin-top:6px"><i style="width:${subjPct(s.id)}%"></i></div></span><span class="pct">${subjPct(s.id)}%</span></button>`).join("")}</div>

  <div class="card s-${dq.s}">
    <div class="row between"><span class="eyebrow">Daily challenge · ${esc(SUBJ[dq.s].name)}</span><span class="score">+${XP.daily} XP</span></div>
    ${done?`<p style="margin:8px 0 0"><b>Done for today.</b> A new challenge unlocks tomorrow. Daily challenges completed: ${S.n.daily}.</p>`:
    `<p class="qtext" style="margin:8px 0 12px">${esc(dq.q)}</p><button class="btn gold block" id="dqGo">Answer today's challenge</button>`}
  </div>

  <div class="card">
    <span class="eyebrow">${weak.length?"Your 3 weakest topics":"Where to start"}</span>
    <div class="tlist" style="margin-top:8px">${(weak.length?weak:[TOPIC.n6,TOPIC.l4,TOPIC.c1]).map(t=>topicRow(t)).join("")}</div>
    ${weak.length?`<button class="btn gold block" id="hWeak" style="margin-top:10px">Practise these</button>`:""}
  </div>

  ${STANDALONE && !window.matchMedia("(display-mode: standalone)").matches && !S.hideInstall ? `<div class="card"><span class="eyebrow">Use it like an app</span><h3 style="margin-top:4px">Add it to your home screen</h3>
    <p class="muted" style="margin:0 0 10px;font-size:14px">${installEvt?"Tap Install and it opens like a normal app, even offline.":"<b>iPhone:</b> tap Share, then <i>Add to Home Screen</i>. <b>Android:</b> tap ⋮, then <i>Install app</i>."}</p>
    <div class="row">${installEvt?`<button class="btn sm" id="instBtn">Install</button>`:""}<button class="btn line sm" id="instHide">Hide</button></div></div>`:""}
  <div class="grid2">
    <a class="btn" id="hAsk" href="${esc(coachLink())}" target="_blank" rel="noopener">${ico("chat")} Ask Coach ↗</a>
    <button class="btn ghost" id="hGame">⚡ Speed games</button>
  </div>`;
  if(!done) $("#dqGo").onclick = ()=> startQuiz({mode:"daily", ids:[dq.id], title:"Daily challenge"});
  if(last) $("#hLast").onclick = ()=> go("topics", last.id);
  if($("#hWeak")) $("#hWeak").onclick = ()=> startQuiz({mode:"weak", topics:weak.map(t=>t.id), n:6, title:"Your weak spots"});
  if($("#instHide")) $("#instHide").onclick = ()=>{ S.hideInstall=true; save(); render(); };
  if($("#instBtn")) $("#instBtn").onclick = async ()=>{ try{ installEvt.prompt(); await installEvt.userChoice; }catch(e){} installEvt=null; render(); };
  $("#hGame").onclick = ()=> go("practice", "games");
  v.querySelectorAll("[data-subj]").forEach(b=>b.onclick=()=>{ S.subj=b.dataset.subj; save(); go("topics"); });
  bindTopicRows(v);
}
function topicRow(t){
  const n = topicsOf(t.s).indexOf(t)+1;
  return `<button class="titem s-${t.s}" data-topic="${t.id}"><span class="num">${pad(n)}</span><span><b>${esc(t.name)}</b><span class="sub">${COACH_MODE?"":esc(SUBJ[t.s].code)+" · "}${esc(t.short)}</span></span>${COACH_MODE?"":masteryChip(t.id)}</button>`;
}
function bindTopicRows(v){ v.querySelectorAll("[data-topic]").forEach(b=>b.onclick=()=>go("topics", b.dataset.topic)); }

/* =================== TOPICS =================== */
function subjPicker(cur){ return `<div class="segsub">${SUBJECTS.map(s=>`<button class="s-${s.id} ${cur===s.id?"on":""}" data-ps="${s.id}">${esc(s.name)}<small>${s.code}</small></button>`).join("")}</div>`; }
function bindSubjPicker(v, after){ v.querySelectorAll("[data-ps]").forEach(b=>b.onclick=()=>{ S.subj=b.dataset.ps; save(); after ? after() : render(); }); }
function viewTopics(v){
  if(sub && TOPIC[sub]) return COACH_MODE ? viewCoachTopic(v, TOPIC[sub]) : viewTopic(v, TOPIC[sub]);
  const s = SUBJ[S.subj] || SUBJECTS[0];
  const ts = topicsOf(s.id);
  const tried = ts.filter(t=>S.topics[t.id]?.att).length;
  v.innerHTML = `${subjPicker(s.id)}
  <div class="hero subj s-${s.id}"><div class="circuit"></div><span class="eyebrow">${s.code}</span><h2>${esc(s.full)}</h2>
    ${COACH_MODE?`<p style="margin:0">Pick a topic for a step-by-step lesson, a worked example or a diagram.</p>`:`<div class="stats"><div class="stat"><b>${subjPct(s.id)}%</b><span>progress</span></div><div class="stat"><b>${tried}/${ts.length}</b><span>topics tried</span></div><div class="stat"><b>${ts.filter(t=>masteryState(t.id)==="m").length}</b><span>mastered</span></div></div>`}</div>
  ${COACH_MODE?"":`<div class="card s-${s.id}"><span class="eyebrow">How you pass</span><p style="margin:6px 0 10px"><b>${esc(s.pass)}</b></p>
    <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px">${s.assess.map(([n,w],k)=>`<i title="${esc(n)}" style="flex:${w};background:var(--sub);opacity:${1-k*0.2}"></i>`).join("")}</div>
    <div class="view" style="gap:2px;margin-top:8px;font-size:13px">${s.assess.map(([n,w])=>`<div class="row between"><span>${esc(n)}</span><b class="mono">${w}%</b></div>`).join("")}</div></div>`}
  <div class="tlist">${ts.map(topicRow).join("")}</div>`;
  bindSubjPicker(v); bindTopicRows(v);
}
function viewTopic(v, t){
  S.lastTopic = t.id; S.subj = t.s; save();
  const st = S.topics[t.id], s = SUBJ[t.s], ms = masteryState(t.id), p = masteryPct(t.id);
  const nQ = BANK.filter(q=>q.t===t.id).length;
  v.innerHTML = `
  <button class="back" id="bk">← ${esc(s.name)} topics</button>
  <div class="hero subj s-${t.s}"><div class="circuit"></div><span class="eyebrow">${s.code} · Topic ${topicsOf(t.s).indexOf(t)+1}</span><h2>${esc(t.name)}</h2>
   <div class="row" style="flex-wrap:nowrap"><div class="bar" style="flex:1;background:rgba(255,255,255,.25)"><i style="width:${p||0}%;background:#FFC94A"></i></div><b style="font-size:14px">${MLABEL[ms]}${p!==null?" · "+p+"%":""}</b></div></div>
  <div class="card s-${t.s}"><span class="eyebrow">What you'll learn</span><ul class="learnlist" style="margin-top:8px">${t.learn.map((x,k)=>`<li><span>${"abcdefg"[k]}</span><div>${esc(x)}</div></li>`).join("")}</ul></div>
  ${lessonCard(t)}
  <div class="grid2 s-${t.s}">
    <button class="btn gold" id="tQuiz" ${nQ?"":"disabled"}>Quiz me (5)</button>
    <a class="btn sub" href="${esc(coachLink({t:t.id, m:"lesson"}))}" target="_blank" rel="noopener">Learn with Coach ↗</a>
    <a class="btn subghost" href="${esc(coachLink({t:t.id, m:"work"}))}" target="_blank" rel="noopener">Work it with me ↗</a>
    <a class="btn subghost" href="${esc(coachLink({t:t.id}))}" target="_blank" rel="noopener">Ask Coach ↗</a>
  </div>
  ${nQ?"":`<p class="muted" style="margin:0;font-size:14px">Quiz questions for this topic arrive with the ${esc(s.name)} update.</p>`}
  ${st?.att?`<div class="card"><span class="eyebrow">Your record</span><div class="stats" style="margin-top:8px">${[["Answered",st.att],["Correct",Math.round(st.ok/st.att*100)+"%"],["Best quiz",st.quiz?st.best+"%":"–"]].map(([a,b])=>`<div class="stat" style="background:var(--bg)"><b>${b}</b><span>${a}</span></div>`).join("")}</div><p class="muted" style="margin:8px 0 0;font-size:13px">Time spent ${fmtTime(st.time)} · last studied ${fmtDate(st.last)}</p></div>`:""}`;
  $("#bk").onclick = ()=>{ go("topics"); };
  $("#tQuiz").onclick = ()=>startQuiz({mode:"topic", topics:[t.id], n:5, title:t.name});
  if($("#tLesson")) $("#tLesson").onclick = ()=>startLesson(t.id, S.lessonPos?.[t.id]||0);
}
