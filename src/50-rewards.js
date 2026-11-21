/* =================== REWARDS =================== */
function viewRewards(v){
  const L = levelOf(S.xp);
  const pr = S.parent.rewards||[];
  const sec = (k,label)=>`<button class="${(S.shopTab||"theme")===k?"on":""}" data-st="${k}">${label}</button>`;
  const shopItems = SHOP.filter(x=>x.kind===(S.shopTab||"theme"));
  const isOn = it => it.kind==="theme"?(S.theme||"th-circuit")===it.id : it.kind==="avatar"?S.avatar===it.id : it.kind==="coach"?S.coachStyle===it.id : false;
  v.innerHTML = `
  <div class="hero"><div class="circuit"></div>
    <div class="coinrow"><div class="coinbig">${S.coins>999?"1k+":"¢"}</div><div><span class="eyebrow">Your coins</span><div class="big" style="font-size:36px">${S.coins.toLocaleString()}</div></div></div>
    <p style="margin:0;opacity:.92">Every XP you earn adds a coin. Hit your daily goal to open a treasure chest. Badges and level-ups pay bonus coins.</p>
    <div class="stats"><div class="stat"><b>${S.freezes||0}/2</b><span>streak freezes</span></div><div class="stat"><b>${Math.min(L,EMPIRE.length)}/${EMPIRE.length}</b><span>Tech Empire</span></div><div class="stat"><b>${Object.keys(S.badges).length}/${BADGES.length}</b><span>badges</span></div></div>
  </div>

  <div class="card"><div class="row between"><span class="eyebrow">Real-life rewards</span><button class="btn line sm" id="parentBtn">Parents 🔒</button></div>
    ${pr.length?`<div class="view" style="gap:8px;margin-top:10px">${pr.map(r=>{ const now=Math.min(goalNow(r.type), r.target); const done=goalNow(r.type)>=r.target;
      return `<div class="rreward ${done&&!r.given?"ready":""}"><div class="row between" style="flex-wrap:nowrap"><b>${done?"🏆":"🎯"} ${esc(r.title)}</b>${r.given?`<span class="mastery good">Received</span>`:done?`<span class="mastery mid">Unlocked!</span>`:""}</div>
      <span class="muted" style="font-size:13px">${esc(GOALS[r.type])} ${r.target}</span><div class="row" style="flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${Math.round(now/r.target*100)}%;background:var(--gold)"></i></div><span class="mono" style="font-size:12px">${now}/${r.target}</span></div>
      ${done&&!r.given?`<span style="font-size:13px"><b>Real-life reward unlocked — show this to your parent to claim it!</b></span>`:""}</div>`; }).join("")}</div>`
    :`<p class="muted" style="margin:8px 0 0">A parent can set real prizes for milestones, like "Reach level 5: KFC lunch" or "30-day streak: new headphones". They can set them here with a PIN, or on their own phone and send them to you.</p>`}
    <button class="btn ghost block" id="sendProg" style="margin-top:10px">Send my progress to my parent</button><div id="progBox" hidden style="margin-top:8px"></div>
    ${pasteBox("pasteRew","Got a rewards link from your parent? Paste it here")}
  </div>

  <div class="card"><span class="eyebrow">Shop</span>
    <div class="seg" style="margin:10px 0">${sec("theme","Themes")}${sec("avatar","Avatars")}${sec("power","Power-ups")}${sec("coach","Coach styles")}</div>
    <div class="shop">${shopItems.map(it=>{ const owned = it.p===0 || S.owned[it.id]; const on=isOn(it);
      return `<div class="item ${on?"owned":""}">${it.sw?`<span class="sw" style="background:${it.sw}"></span>`:`<span class="ic">${it.ic}</span>`}<b>${esc(it.n)}</b>${it.d?`<span>${esc(it.d)}</span>`:""}
      ${it.kind==="power"?`<span class="price"><span class="coinico">c</span>${it.p} · you have ${S.freezes||0}/2</span><button class="btn sm gold" data-buy="${it.id}" ${(S.freezes||0)>=2||S.coins<it.p?"disabled":""}>Buy</button>`
       : on?`<button class="btn sm ghost" ${it.kind==="coach"?`data-off="${it.id}"`:"disabled"}>${it.kind==="coach"?"On · turn off":"Equipped"}</button>`
       : owned?`<button class="btn sm" data-use="${it.id}">Use</button>`
       :`<span class="price"><span class="coinico">c</span>${it.p}</span><button class="btn sm gold" data-buy="${it.id}" ${S.coins<it.p?"disabled":""}>Buy</button>`}</div>`; }).join("")}</div>
  </div>

  <div class="card"><span class="eyebrow">Your Tech Empire</span><p class="muted" style="margin:4px 0 10px;font-size:14px">Each level unlocks a new business, from a phone repair stall to a regional tech giant.</p>
    <div class="empire">${EMPIRE.map((b,i)=>`<div class="biz ${i<L?"on":"off"}"><span class="ic">${b.ic}</span><b>${i<L?esc(b.n):"Level "+(i+1)}</b><span>${i<L?esc(b.f):"Locked"}</span></div>`).join("")}</div>
  </div>

  <div class="card"><span class="eyebrow">Badges · ${Object.keys(S.badges).length}/${BADGES.length}</span><div class="badges" style="margin-top:10px">
    ${BADGES.map(b=>`<div class="badge ${S.badges[b.id]?"got":""}"><div class="medal">${esc(b.m)}</div><b>${esc(b.n)}</b><span>${esc(b.d)}</span></div>`).join("")}</div></div>
  <div class="card"><span class="eyebrow">Levels</span><div class="view" style="gap:4px;margin-top:8px;font-size:14px">${LEVELS.map((n,k)=>`<div class="row between" style="${k+1===Math.min(L,10)?"font-weight:800;color:var(--brand)":k+1>L?"opacity:.55":""}"><span>${k+1}. ${esc(n)}</span><span class="mono" style="font-size:12px">${levelFloor(k+1).toLocaleString()} XP</span></div>`).join("")}</div></div>
  <button class="btn line block" id="toMe">My progress, mistakes and settings</button>`;
  $("#toMe").onclick = ()=>go("me");
  bindPaste("pasteRew");
  $("#sendProg").onclick = async ()=>shareLink("UTT Study progress", `My UTT Study progress (level ${levelOf(S.xp)}, ${liveStreak()}-day streak). Open it in the parent view of the app:`, await signed("progress", progressPayload()), "progBox");
  $("#parentBtn").onclick = ()=>parentGate();
  v.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{ S.shopTab=b.dataset.st; save(); render(); });
  v.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{ const it=SHOP.find(x=>x.id===b.dataset.buy); if(S.coins<it.p) return;
    if(it.kind==="power" && (S.freezes||0)>=2) return;
    S.coins-=it.p; if(it.kind==="power"){ S.freezes=(S.freezes||0)+1; toast("Streak freeze ready 🧊"); } else { S.owned[it.id]=1; useItem(it); toast(`${it.n} unlocked!`, true); confetti(); } save(); render(); });
  v.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>{ useItem(SHOP.find(x=>x.id===b.dataset.use)); save(); render(); });
  v.querySelectorAll("[data-off]").forEach(b=>b.onclick=()=>{ S.coachStyle=null; save(); render(); });
}
function useItem(it){ if(it.kind==="theme"){ S.theme=it.id; applyTheme(); } else if(it.kind==="avatar") S.avatar=it.id; else if(it.kind==="coach") S.coachStyle=it.id; renderHeader(); }

/* ---- parent area (on Suri's phone, PIN protected; the PIN is stored only as a SHA-256 hash) ---- */
let parentOK = false;
function parentGate(){
  if(parentOK) return go("parent");
  const setting = !S.parent.pin; let entry="", first=null;
  const draw = (msg)=>{
    $("#modalRoot .box").innerHTML = `<span class="eyebrow">Parents only</span><h2>${setting?(first===null?"Create a 4-digit PIN":"Enter the PIN again"):"Enter your PIN"}</h2>
      <p class="muted" style="margin:0;font-size:14px">${msg||(setting?"Suri won't be able to change rewards without it.":"")}</p>
      <div class="pindots">${[0,1,2,3].map(i=>`<i class="${i<entry.length?"on":""}"></i>`).join("")}</div>
      <div class="pinpad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-k="${n}">${n}</button>`).join("")}<button data-k="x" aria-label="Cancel">✕</button><button data-k="0">0</button><button data-k="b" aria-label="Delete">⌫</button></div>`;
    $("#modalRoot .box").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>press(b.dataset.k));
  };
  const press = async k => {
    if(k==="x"){ $("#modalRoot").innerHTML=""; return; }
    if(k==="b"){ entry=entry.slice(0,-1); return draw(); }
    if(entry.length<4) entry+=k;
    if(entry.length<4) return draw();
    const h = await sha("utt-parent:"+entry);
    if(setting){
      if(first===null){ first=entry; entry=""; return draw(); }
      if(first!==entry){ first=null; entry=""; return draw("The PINs didn't match. Try again."); }
      S.parent.pin = h; save(); parentOK=true; $("#modalRoot").innerHTML=""; return go("parent");
    }
    if(h===S.parent.pin){ parentOK=true; $("#modalRoot").innerHTML=""; return go("parent"); }
    entry=""; draw("That PIN isn't right.");
  };
  modal("", ()=>draw());
}
function goalSelect(id){ return `<select class="field" id="${id}">${Object.entries(GOALS).map(([k,l])=>`<option value="${k}">${esc(l.replace(/ of$|:$/,""))}</option>`).join("")}</select>`; }
function viewParent(v){
  if(!parentOK) return go("rewards");
  const pr = S.parent.rewards ||= [];
  v.innerHTML = `<button class="back" id="bk">← Rewards</button>
  <div><h2 style="font-size:24px">Real-life rewards</h2><p class="muted" style="margin:4px 0 0">Set prizes ${esc(S.name)} unlocks by studying. ${esc(S.name)} sees a progress bar for each, and the app celebrates when one is reached.</p></div>
  <div class="card"><form id="rf" class="view" style="gap:10px">
    <div><label class="lab" for="rt">Reward</label><input class="field" id="rt" maxlength="60" placeholder="e.g. KFC lunch" required></div>
    <div class="grid2"><div><label class="lab" for="rty">Milestone</label>${goalSelect("rty")}</div>
    <div><label class="lab" for="rn2">Target</label><input class="field" id="rn2" type="number" min="1" max="100000" value="5" required></div></div>
    <p class="muted" style="margin:0;font-size:13px" id="rnow"></p>
    <button class="btn gold" type="submit">Add reward</button></form></div>
  <div class="card"><span class="eyebrow">Current rewards</span>${pr.length?`<div class="view" style="gap:8px;margin-top:8px">${pr.map((r,i)=>{ const done=goalNow(r.type)>=r.target; return `<div class="rreward ${done&&!r.given?"ready":""}"><b>${esc(r.title)}</b><span class="muted" style="font-size:13px">${esc(GOALS[r.type])} ${r.target} · now ${goalNow(r.type)}${done?" · UNLOCKED":""}</span>
    <div class="row">${done&&!r.given?`<button class="btn sm" data-given="${i}">Mark as given</button>`:""}${r.given?`<span class="mastery good">Given ${esc(r.given)}</span>`:""}<button class="btn line sm" data-del="${i}">Remove</button></div></div>`; }).join("")}</div>`:`<p class="muted" style="margin:6px 0 0">No rewards yet.</p>`}</div>
  <div class="card"><span class="eyebrow">Right now</span><p style="margin:6px 0 0;font-size:14px">Level ${levelOf(S.xp)} (${esc(levelName(levelOf(S.xp)))}) · best streak ${S.best} · ${S.xp.toLocaleString()} XP · ${masteredCount()} topics at 80%+ · ${S.n.structured} structured questions marked · ${S.n.daily} daily challenges.</p>
   <p class="muted" style="margin:8px 0 0;font-size:13px">Ideas: a treat for a 7-day streak, something bigger at level 5, an outing for 10 topics at 80%+.</p></div>
  <button class="btn line" id="lock">Lock parent area</button>`;
  const showNow=()=>{ $("#rnow").textContent = `Right now: ${goalNow($("#rty").value)}`; }; $("#rty").onchange=showNow; showNow();
  $("#bk").onclick=()=>go("rewards"); $("#lock").onclick=()=>{ parentOK=false; go("rewards"); };
  $("#rf").onsubmit = e=>{ e.preventDefault(); const title=$("#rt").value.trim(), type=$("#rty").value, target=Math.max(1,parseInt($("#rn2").value,10)||1); if(!title) return;
    pr.push({title,type,target,reached: null, given:null}); checkParentGoals(); save(); toast("Reward added"); render(); };
  v.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ pr.splice(+b.dataset.del,1); save(); render(); });
  v.querySelectorAll("[data-given]").forEach(b=>b.onclick=()=>{ pr[+b.dataset.given].given=today(); save(); render(); });
}

/* =================== PARENT'S OWN PHONE =================== */
async function shareLink(title, text, url, boxId){
  if(navigator.share){ try{ await navigator.share({title, text, url}); return; }catch(e){ if(e && e.name==="AbortError") return; } }
  try{ await navigator.clipboard.writeText(text+"\n"+url); toast("Link copied. Paste it into WhatsApp or a text message."); }catch(e){}
  const box = boxId && document.getElementById(boxId);
  if(box){ box.hidden=false; box.innerHTML = `<label class="lab" for="${boxId}-t">Copy this link and send it:</label><textarea class="field mono" id="${boxId}-t" readonly style="min-height:70px">${esc(url)}</textarea>`; const t=document.getElementById(boxId+"-t"); t.focus(); t.select(); }
}
const goalLabel = r => `${GOALS[r.type]} ${r.target}`;
function pasteBox(id, label){ return `<div style="margin-top:12px"><label class="lab" for="${id}">${label}</label><div class="row" style="flex-wrap:nowrap"><input class="field" id="${id}" placeholder="Paste the link here" autocomplete="off"><button class="btn sm" id="${id}-go">Open</button></div></div>`; }
function bindPaste(id){ const b=document.getElementById(id+"-go"); if(!b) return; b.onclick=()=>{ const v=document.getElementById(id).value.trim(); const i=v.indexOf("#"); if(i<0){ toast("That doesn't look like a UTT Study link."); return; } location.hash = v.slice(i); }; }
/* Suri's phone: receive rewards set on the parent's phone */
async function handleRewardsLink(){
  if(COACH_MODE) return;
  const d = await readSigned("rewards"); if(!d || !Array.isArray(d.r)) return;
  if(S.role==="parent"){ toast("That rewards link is for Suri's phone."); return; }
  const old = S.parent.rewards || [];
  S.parent.rewards = d.r.map(x=>{ const prev = old.find(o=>o.title===x.title && o.type===x.type && o.target===x.target);
    return {title:String(x.title).slice(0,60), type:GOALS[x.type]?x.type:"level", target:Math.max(1,+x.target||1), reached: prev?.reached || null, given: x.given || prev?.given || null}; });
  S.parentLinkAt = d.at || today();
  save(); if(S.name) go("rewards");
  queueModal(()=>{ confetti(); modal(`<span class="eyebrow">From your parent</span><h2>Your real-life rewards are set!</h2>
    <div class="view" style="gap:6px;width:100%;text-align:left">${S.parent.rewards.map(r=>`<div class="rreward"><b>🎯 ${esc(r.title)}</b><span class="muted" style="font-size:13px">${esc(goalLabel(r))}</span></div>`).join("")||"<p>No rewards right now.</p>"}</div>
    <button class="btn block" id="mClose">Let's go</button>`, (x,close)=>{ $("#mClose").onclick=()=>{ close(); checkParentGoals(); save(); }; }); });
}
function progressPayload(){
  const week = [...Array(7)].map((_,k)=>{ const d=new Date(); d.setDate(d.getDate()-(6-k)); return S.days[dstr(d)]||0; });
  const ans = S.log.filter(x=>!String(x.q).startsWith("game:"));
  return {n:S.name, l:levelOf(S.xp), x:S.xp, s:liveStreak(), b:S.best, m:masteredCount(), q:S.n.quiz, d:S.n.daily, st:S.n.structured, bd:Object.keys(S.badges).length, w:week, at:today(),
    acc: ans.length?Math.round(ans.filter(a=>a.ok).length/ans.length*100):null, na:ans.length,
    sp:SUBJECTS.map(s=>[s.code, subjPct(s.id)]), weak:weakTopics(3).map(t=>SUBJ[t.s].code+": "+t.name)};
}
async function handleProgressLink(){
  if(COACH_MODE) return;
  const d = await readSigned("progress"); if(!d) return;
  if(S.role!=="parent"){ toast("That's a progress link for a parent's phone."); return; }
  S.kid = d; S.kidName = d.n || S.kidName; save(); go("parenthome"); toast(`${d.n||"Your child"}'s progress updated`, true);
}
function viewParentHome(v){
  const kid = S.kid, kn = S.kidName || "Suri";
  const pr = S.pRewards ||= [];
  const kidNow = type => !kid ? null : type==="level"?kid.l:type==="streak"?kid.b:type==="xp"?kid.x:type==="mastered"?kid.m:type==="structured"?kid.st:type==="daily"?kid.d:null;
  v.innerHTML = `
  <div class="hero"><div class="circuit"></div><span class="eyebrow">Parent mode</span><h2>${esc(kn)}'s rewards</h2>
    <p style="margin:0">Set real-life prizes here, then send them to ${esc(kn)}'s phone. Ask ${esc(kn)} to send you a progress link any time to see how it's going.</p></div>

  <div class="card"><span class="eyebrow">Latest progress</span>
   ${kid?`<p class="muted" style="margin:4px 0 8px;font-size:13px">Sent on ${esc(kid.at)}</p>
    <div class="stats">
      ${[["Level",kid.l],["Day streak",kid.s],["Best streak",kid.b],["Total XP",kid.x],["Topics 80%+",kid.m],["Accuracy",kid.acc==null?"–":kid.acc+"%"]].map(([a,b])=>`<div class="stat" style="background:var(--bg)"><b>${esc(String(b))}</b><span>${a}</span></div>`).join("")}
    </div>
    ${kid.sp?`<div class="view" style="gap:6px;margin-top:12px">${kid.sp.map(([c,p])=>`<div class="row" style="flex-wrap:nowrap;font-size:13px"><span class="mono" style="width:76px">${esc(c)}</span><div class="bar" style="flex:1"><i style="width:${+p||0}%;background:var(--brand)"></i></div><b class="mono" style="width:40px;text-align:right">${+p||0}%</b></div>`).join("")}</div>`:""}
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:70px;margin-top:12px">${(kid.w||[]).map(x=>`<div style="height:${Math.max(4,Math.round(x/Math.max(DAILY_GOAL,...kid.w)*60))}px;border-radius:4px;background:${x>=DAILY_GOAL?"var(--ok)":x?"var(--gold)":"var(--line)"}"></div>`).join("")}</div>
    <span class="muted" style="font-size:12px">XP over the last 7 days (green = daily goal met)</span>
    ${kid.weak?.length?`<p style="margin:10px 0 0;font-size:14px"><b>Needs practice:</b> ${esc(kid.weak.join(" · "))}</p>`:""}`
   :`<p class="muted" style="margin:6px 0 0">Nothing yet. On ${esc(kn)}'s phone: Rewards, then <b>Send my progress to my parent</b>. When you open that link here, the progress shows up.</p>`}
   ${pasteBox("pasteProg","Got a progress link? Paste it here")}
  </div>

  <div class="card"><span class="eyebrow">Rewards</span>
   ${pr.length?`<div class="view" style="gap:8px;margin-top:8px">${pr.map((r,i)=>{ const n=kidNow(r.type); const done = n!==null && n>=r.target;
     return `<div class="rreward ${done&&!r.given?"ready":""}"><div class="row between" style="flex-wrap:nowrap"><b>${done?"🏆":"🎯"} ${esc(r.title)}</b>${r.given?`<span class="mastery good">Given</span>`:done?`<span class="mastery mid">Earned!</span>`:""}</div>
      <span class="muted" style="font-size:13px">${esc(goalLabel(r))}${n!==null?` · now ${n}`:""}</span>
      ${n!==null?`<div class="bar"><i style="width:${Math.min(100,Math.round(n/r.target*100))}%;background:var(--gold)"></i></div>`:""}
      <div class="row">${done&&!r.given?`<button class="btn sm" data-given="${i}">Mark as given</button>`:""}<button class="btn line sm" data-del="${i}">Remove</button></div></div>`; }).join("")}</div>`
   :`<p class="muted" style="margin:6px 0 0">No rewards yet. Add one below.</p>`}
   <form id="prf" class="view" style="gap:10px;margin-top:14px;border-top:1px dashed var(--line);padding-top:14px">
    <div><label class="lab" for="prt">New reward</label><input class="field" id="prt" maxlength="60" placeholder="e.g. New headphones" required></div>
    <div class="grid2"><div><label class="lab" for="prty">When ${esc(kn)} reaches</label>${goalSelect("prty")}</div>
    <div><label class="lab" for="prn">Target</label><input class="field" id="prn" type="number" min="1" max="100000" value="5" required></div></div>
    <button class="btn line" type="submit">Add reward</button></form>
  </div>
  <button class="btn gold block" id="pSend">Send rewards to ${esc(kn)}'s phone</button>
  <div id="pLinkBox" hidden></div>
  <div class="card"><span class="eyebrow">Settings</span><div class="view" style="gap:8px;margin-top:8px">
    <div><label class="lab" for="pkn">Child's name</label><div class="row" style="flex-wrap:nowrap"><input class="field" id="pkn" value="${esc(S.kidName||"Suri")}" maxlength="30"><button class="btn sm" id="pknS">Save</button></div></div>
    <div id="pSwitch"><button class="btn line sm" id="pStudent">Switch this phone to student mode</button></div></div></div>`;
  bindPaste("pasteProg");
  $("#prf").onsubmit = e=>{ e.preventDefault(); const title=$("#prt").value.trim(); if(!title) return; pr.push({title, type:$("#prty").value, target:Math.max(1,parseInt($("#prn").value,10)||1), given:null}); save(); toast("Added. Remember to send it."); render(); };
  v.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ pr.splice(+b.dataset.del,1); save(); render(); });
  v.querySelectorAll("[data-given]").forEach(b=>b.onclick=()=>{ pr[+b.dataset.given].given=today(); save(); render(); });
  $("#pSend").onclick = async ()=>{ if(!pr.length){ toast("Add a reward first."); return; }
    const url = await signed("rewards", {r:pr.map(r=>({title:r.title,type:r.type,target:r.target,given:r.given})), at:today()});
    shareLink("UTT Study rewards", `${S.kidName||"Suri"}, here are your study rewards! Tap the link. (iPhone: if it opens in Safari, copy it and paste it into the app's Rewards tab.)`, url, "pLinkBox"); };
  $("#pknS").onclick = ()=>{ S.kidName=$("#pkn").value.trim(); save(); render(); };
  $("#pStudent").onclick = ()=>{ $("#pSwitch").innerHTML = `<p style="margin:0 0 8px"><b>Use this phone for studying instead?</b> Your reward list stays saved.</p><div class="row"><button class="btn sm" id="psY">Yes, switch</button><button class="btn line sm" id="psN">Cancel</button></div>`;
    $("#psY").onclick=()=>{ S.role=null; S.name=""; save(); go("home"); }; $("#psN").onclick=()=>render(); };
}
