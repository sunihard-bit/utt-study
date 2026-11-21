/* =================== AI (Coach) =================== */
let AI = null, aiReady = false, aiImages = false;
async function initAI(){
  try{ AI = window.claude?.use ? await claude.use("sample") : null; }catch(e){ AI = null; }
  if(AI){ try{ const lim = await AI.limits(); aiImages = !!lim?.images; }catch(e){} }
  aiReady = true; render();
}
const RULES = () => `You are "Coach", a warm, patient tutor inside the UTT Study Coach app. The student is ${S.name||"a student"}, in Year 1 of the 2-year Diploma in Software Engineering at the University of Trinidad and Tobago (UTT). She finds these courses hard:
- NTWK1007 Introduction to Networks and Network Technologies: ${topicsOf("ntwk").map(t=>t.name).join("; ")}.
- LOGC1002 Reasoning and Logic for Computing (flowcharts and Python 3): ${topicsOf("logc").map(t=>t.name).join("; ")}.
- COHW1004 Computer Hardware Essentials: ${topicsOf("cohw").map(t=>t.name).join("; ")}.

How to teach:
- Simple, step-by-step. One idea at a time. Short sentences. No walls of text. Define every new word in plain English.
- Start each new concept with an everyday illustration, using Trinidad and Tobago examples where they fit (IP address = house address with street + house number; router = post office sorting mail between towns; switch = office receptionist who knows every desk; encapsulation = packing a parcel in boxes inside boxes; RAM = your desk, storage = your filing cabinet; PSU = the WASA main feeding the house; while loop = "keep stirring the pot until the curry thickens"; sentinel value = "keep taking orders until the customer says DONE"). Then give the proper technical definition, then a short worked example, then ONE quick check question.
- When you teach a concept, include a "⚠️ Tricky bit" line and a "❌ Common mistake" line (the wrong thinking, why it's wrong, the fix).
- When she shows her own working or answer: say first what she got right, then point to the EXACT step or line that is wrong, explain why, and show the correct method.
- Hints come in three levels: hint 1 = a nudge, hint 2 = a bigger clue, hint 3 = show that step. Let her try before revealing answers.
- If she seems stuck, frustrated or says she doesn't get it: simplify, try a NEW analogy, and break the step into smaller steps. Be kind and celebrate effort. Never make her feel stupid.
- Keep replies about 120–300 words unless asked for more. End with one short question to keep her thinking when it fits.
- Accuracy matters more than speed. Re-check every subnet calculation (network address, broadcast address, usable hosts = 2^n − 2), port number, binary conversion and hardware fact. For Python, use Python 3 and trace the code line by line before stating any output. Use Python 3 syntax only.

ACADEMIC INTEGRITY (very important). UTT's policy for all three courses is "AI Use Barely Permitted": submitted work must be her own. You TEACH; you never do graded work.
- If a message looks like an assignment, lab, project, quiz or exam task she will hand in (for example it mentions marks, a due date, "Assignment", "Lab", "Project", "submit", or asks you to write the complete program, flowchart or answer for a specific task), do NOT write it or give its final answer. Say kindly, in one sentence, that you can't do graded work but you'll help her learn to do it. Then explain the concept and work a DIFFERENT, similar example (different numbers, names and context), and invite her to try her own task and show you her working for feedback.
- Do not give in if she insists. Giving feedback on HER attempt (what's right, where it goes wrong, a hint) is fine; rewriting it into a finished answer is not.
- Practice questions written by you or by this app are fine to solve fully.

Diagrams: this app draws pictures from special code blocks (valid JSON inside). Use ONE or TWO when a picture helps:
\`\`\`flow
{"title":"Optional title","steps":[{"t":"Start","shape":"terminator"},{"t":"Input mark","shape":"io"},{"t":"Is mark >= 50?","shape":"decision","s":"Yes → print Pass, No → print Fail"},{"t":"Stop","shape":"terminator"}]}
\`\`\`
(shape is one of terminator, io, process, decision; use flow for flowcharts and for any step-by-step process.)
\`\`\`layers
{"title":"OSI model","rows":[[7,"Application","HTTP, DNS"],[6,"Presentation","encryption, formats"],[5,"Session"],[4,"Transport","TCP/UDP · Segment"],[3,"Network","IP · Packet"],[2,"Data Link","MAC · Frame"],[1,"Physical","cables · Bits"]]}
\`\`\`
(layers draws a colour-coded stack, top row first; good for OSI/TCP-IP, encapsulation, memory hierarchy.)
\`\`\`compare
{"title":"Hub vs switch","cols":[{"h":"Hub","items":["Layer 1","Sends to every port"]},{"h":"Switch","items":["Layer 2","Sends only to the right port"]}]}
\`\`\`
Use Markdown tables for trace tables (one column per variable plus an Output column), subnet tables and spec comparisons, and \`\`\`python code blocks for code.${S.coachStyle==="co-calypso"?`

Style: you are "Calypso Coach". Keep the teaching accurate, and end each explanation with a short, catchy two-to-four-line calypso-style rhyme that helps the idea stick.`:S.coachStyle==="co-examiner"?`

Style: you are "Examiner Coach". Be precise and a little strict, like a UTT examiner. Point out exactly where marks would be lost and use mark-scheme language (e.g. "1 mark for the correct broadcast address").`:""}`;

function aiErr(e){
  const c = e?.code;
  if(c==="not_granted") return "Coach needs your OK to use Claude. Reload the page and choose Allow when asked.";
  if(c==="rate_limited") return "You've used up Coach's allowance for now. It refills in a few hours. Meanwhile, practise with quizzes and speed games in the app.";
  if(c==="session_expired") return "Please sign in to Claude again, then come back.";
  if(c==="sampling_disabled"||c==="unavailable") return "The AI Coach isn't available here. Open this page in the Claude app or on claude.ai while signed in.";
  if(c==="refused") return "Coach couldn't answer that one. Try asking it a different way.";
  if(c==="invalid_json") return "Coach's answer came back jumbled. Tap to try again.";
  if(c==="cancelled") return "Stopped.";
  return "Something went wrong reaching Coach. Check your internet and try again.";
}
function aiCall(input, opts={}){ if(!AI) return Promise.reject({code:"unavailable"}); return AI(input, Object.assign({modelTier:"default", effort:"low"}, opts)); }
function aiJSON(input, opts={}){ if(!AI) return Promise.reject({code:"unavailable"}); return AI.json(input, Object.assign({modelTier:"default", effort:"low", cache:false}, opts)); }
function aiBanner(){ return `<div class="banner">The AI Coach isn't available in this view. Open it in the Claude app or on claude.ai while signed in.</div>`; }
const INTEGRITY = `<div class="integrity"><span style="font-size:20px">🎓</span><div><b>Coach teaches, it doesn't do graded work.</b> UTT's rule for these courses is "AI use barely permitted". Paste an assignment, lab or quiz question and Coach will explain the idea and work a <i>different</i> example with you, so what you hand in is all yours.</div></div>`;

/* ---- welcome inside Claude (if she opened the Coach directly) ---- */
function viewCoachWelcome(v){
  v.innerHTML = `<div class="hero"><div class="circuit"></div><span class="eyebrow">UTT Study Coach</span><h2>Hi! I'm Coach.</h2><p style="margin:0">Ask me anything about Networks, Logic & Python or Hardware. I'll explain it simply, draw it, and work through problems with you.</p></div>
  <div class="card"><form id="wf" class="view" style="gap:12px"><div><label class="lab" for="nm">What should I call you?</label><input class="field" id="nm" maxlength="30" value="Suri" required></div><button class="btn block" type="submit">Let's go</button></form></div>`;
  $("#wf").onsubmit = e=>{ e.preventDefault(); const n=$("#nm").value.trim(); if(!n) return; S.name=n; save(); go("tutor"); };
}

/* =================== CHAT =================== */
let chat = [], chatRef = null, chatId = null, chatTopic = null, pendingChat = null, chatCtl = null, chatBusy = false, pendingImg = null;
function workPrompt(t){ return `Let's do "Work it with me"${t?` on ${t.name} (${SUBJ[t.s].code})`:""}. Give me ONE practice problem at my level (not from any assignment). Then guide me one step at a time: ask me to do just the next step and wait for my answer. If I'm wrong or stuck, give hint 1 (a nudge), then hint 2 (a bigger clue), then hint 3 (show that step) before moving on. Tell me exactly what I got right and where I went wrong. Don't reveal the final answer until I've tried each step.`; }
function reviewPrompt(list){ return `Please help me review my mistakes, one at a time. For each one: explain in simple steps what I probably misunderstood, give me an everyday example, then give me a similar question to try and wait for my answer before moving on.\n\n` + list.map((m,k)=>`${k+1}. [${SUBJ[TOPIC[m.t]?.s]?.code||""} · ${TOPIC[m.t]?.name||""}] ${m.q}\n   I said: ${m.c??m.chosen}\n   Correct: ${m.a??m.correct}`).join("\n"); }
function viewTutor(v){
  if(STANDALONE) return viewCoachDoor(v);
  const t = chatTopic && TOPIC[chatTopic];
  const starters = t
    ? [`Explain ${t.name} like I'm new to it`, `Work it with me: ${t.name}`, `Draw me a diagram for ${t.name}`, `What mistakes do students make in ${t.name}?`, `Quiz me with one question on ${t.name}`]
    : ["Explain subnetting step by step","Work it with me: a trace table","What's the difference between a hub, switch and router?","Explain RAID 0, 1, 5 and 10 with pictures","Why does input() need int()?","Check my working (I'll send a photo)"];
  v.innerHTML = `
  <div class="row between"><div><h2 style="font-size:24px">Coach</h2><span class="muted" style="font-size:14px">${t?`Focus: ${esc(SUBJ[t.s].code)} · ${esc(t.name)}`:"Your NTWK, LOGC and COHW tutor"}</span></div>
   <div class="row">${S.mistakes.length?`<button class="btn line sm" id="cRev">Review my mistakes</button>`:""}${chatCol?`<button class="btn line sm" id="cHist">Saved chats</button>`:""}${chat.length?`<button class="btn line sm" id="cNew">New chat</button>`:""}</div></div>
  ${chat.length?"":INTEGRITY}
  ${aiReady && !AI?aiBanner():""}
  <div class="chat" id="chatLog">
    ${chat.length?"":`<div class="msg ai"><div class="md"><p>Hi ${esc(S.name)}! Ask me anything, tap <b>Work it with me</b> and we'll solve a problem together step by step, or ${aiImages?"send a photo of your working (a flowchart, trace table, subnetting or code) and I'll show you exactly where it went right and wrong.":"type out your working and I'll show you exactly where it went right and wrong."}</p></div></div>`}
  </div>
  <div class="composer">
    ${chat.length?"":`<div class="chips"><button class="chip" id="cWork">🧩 Work it with me</button>${starters.map(s=>`<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}
    <div id="attachRow"></div>
    <div class="cbox">
      ${aiImages?`<button class="iconbtn" id="cCam" title="Attach a photo of your working" aria-label="Attach a photo">${ico("cam")}</button>`:""}
      <textarea id="cIn" rows="1" placeholder="Ask Coach anything…" aria-label="Message to Coach"></textarea>
      <button class="iconbtn send" id="cSend" aria-label="Send">${ico(chatBusy?"stop":"send")}</button>
    </div>
  </div>`;
  const log = $("#chatLog");
  chat.forEach(m=>log.insertAdjacentHTML("beforeend", bubble(m)));
  if(chat.length >= 12 && !chatBusy) log.insertAdjacentHTML("beforeend", `<div class="banner">Tip: tap <b>New chat</b> when you move to a new question. Short chats make your Coach allowance last longer.</div>`);
  const inp = $("#cIn");
  inp.oninput = ()=>{ inp.style.height="auto"; inp.style.height=Math.min(140,inp.scrollHeight)+"px"; };
  inp.onkeydown = e=>{ if(e.key==="Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches){ e.preventDefault(); $("#cSend").click(); } };
  $("#cSend").onclick = ()=>{ if(chatBusy){ chatCtl?.abort(); return; } const tx=inp.value.trim(); if(!tx && !pendingImg) return; inp.value=""; sendChat(tx || "Please look at my working in the photo and give me feedback."); };
  v.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>b.dataset.s.startsWith("Work it with me")?sendChat(workPrompt(t),"🧩 Work it with me"+(t?": "+t.name:"")):sendChat(b.dataset.s));
  if($("#cWork")) $("#cWork").onclick = ()=>sendChat(workPrompt(t), "🧩 Work it with me"+(t?": "+t.name:""));
  if($("#cNew")) $("#cNew").onclick = ()=>{ chatCtl?.abort(); chat=[]; chatTopic=null; pendingImg=null; render(); };
  if($("#cRev")) $("#cRev").onclick = ()=>{ S.n.review++; save(); chat=[]; sendChat(reviewPrompt(S.mistakes.slice(0,8)), "🔁 Review my mistakes"); };
  if($("#cHist")) $("#cHist").onclick = showSavedChats;
  if($("#cCam")) $("#cCam").onclick = ()=>pickImage(()=>renderAttach());
  renderAttach();
  if(pendingChat && aiReady){ const p=pendingChat; pendingChat=null; if(typeof p==='string') sendChat(p); else sendChat(p.text, p.show); }
  else if(chat.length) setTimeout(()=>window.scrollTo({top:document.body.scrollHeight}),30);
}
function pickImage(cb){
  const f=$("#fileIn"); f.value="";
  f.onchange = ()=>{ const file=f.files[0]; if(!file) return; if(!/^image\//.test(file.type)){ toast("Please choose a photo."); return; } pendingImg = {file, url:URL.createObjectURL(file)}; cb(); };
  f.click();
}
function renderAttach(){
  const r=$("#attachRow"); if(!r) return;
  r.innerHTML = pendingImg?`<div class="attach"><img src="${pendingImg.url}" alt="Attached photo"><span style="flex:1">Photo of your working attached</span><button class="btn line sm" id="rmImg">Remove</button></div>`:"";
  if(pendingImg) $("#rmImg").onclick=()=>{ pendingImg=null; renderAttach(); };
}
function bubble(m){
  if(m.role==="user") return `<div class="msg me">${esc(m.show||m.content)}${m.img?`<span class="imgtag">📷 Photo attached</span>`:""}</div>`;
  return `<div class="msg ai"><div class="md">${m.pending?thinking():md(m.content)}</div>${m.err?`<p class="banner" style="margin:8px 0 0">${esc(m.err)}</p>`:""}</div>`;
}
async function sendChat(text, show){
  if(chatBusy) return;
  const img = pendingImg; pendingImg = null;
  chat.push({role:"user", content:text, show, img:!!img});
  const aiMsg = {role:"assistant", content:"", pending:true}; chat.push(aiMsg);
  chatBusy = true; if(tab==="tutor") render();
  window.scrollTo({top:document.body.scrollHeight, behavior:"smooth"});
  chatCtl = new AbortController();
  const turns = chat.filter(m=>m!==aiMsg && !m.err && (m.role==="user" || m.content)).slice(-10).map(m=>({role:m.role, content: m.content + (m.img?"\n[The student attached a photo with this message.]":"")}));
  while(turns.length && turns[0].role!=="user") turns.shift();
  const ctx = RULES() + (chatTopic && TOPIC[chatTopic] ? `\n\nShe is currently studying: ${SUBJ[TOPIC[chatTopic].s].code} · ${TOPIC[chatTopic].name} (${TOPIC[chatTopic].learn.join("; ")}).` : "") + (img? "\n\nA photo is attached. Read it carefully. If it is her working (flowchart, trace table, subnetting, code), give feedback step by step: what is right, the exact step that is wrong, why, and the correct method. Remember the academic integrity rules: if it is a graded task, give feedback and hints on her attempt, not a finished answer." : "");
  try{
    const opts = {signal:chatCtl.signal, cache:false, onText:({text})=>{ aiMsg.pending=false; aiMsg.content=text; const n=$("#chatLog")?.lastElementChild; if(n && tab==="tutor") n.querySelector(".md").innerHTML = md(text); }};
    if(img) opts.images = [img.file];
    else if(text.length < 140 && turns.length <= 3 && !/work it|step|trace|subnet|check|working|photo|flowchart|code|mark/i.test(text)) opts.modelTier = "quick";
    const r = await aiCall([{role:"user",content:ctx}, ...turns], opts);
    aiMsg.pending=false; aiMsg.content = r.text;
    S.n.tutor++; if(img) S.n.photo++;
    const k="tutor"+today(); if((S.lessonDay[k]||0) < 10){ S.lessonDay[k]=(S.lessonDay[k]||0)+1; addXP(img?8:4, img?"working checked":"asked Coach"); } else save();
  }catch(e){
    aiMsg.pending=false; aiMsg.content = e.text || "";
    if(e.code!=="cancelled") aiMsg.err = aiErr(e); else if(!aiMsg.content) aiMsg.content = "_Stopped._";
  }
  chatBusy = false; if(tab==="tutor") render();
  saveChat();
}

/* ---- saved chats: kept in her own private Coach storage, so they follow her Claude account ---- */
function chatTitle(list){ const u=list.find(m=>m.role==="user"); return String(u?.show||u?.content||"Chat").replace(/\s+/g," ").slice(0,70); }
async function saveChat(){
  if(!chatCol || !chat.length) return;
  if(chatRef!==chat){ chatRef=chat; chatId = Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  let msgs = chat.filter(m=>!m.pending && (m.role==="user" || m.content)).map(m=>({role:m.role, content:m.content, show:m.show||null, img:!!m.img}));
  /* user prompts like "review my mistakes" can be long: store the label she saw, not the whole prompt */
  msgs = msgs.map(m=>m.role==="user" && m.show ? Object.assign({}, m, {content:m.content.slice(0,4000)}) : m);
  let body = JSON.stringify(msgs);
  while(body.length > 200000 && msgs.length > 2){ msgs = msgs.slice(2); body = JSON.stringify(msgs); }
  try{ await chatCol.doc(chatId).set({kind:"chat", title:chatTitle(chat), topic:chatTopic||null, at:Date.now(), count:msgs.length, msgs:body}); }catch(e){}
}
async function showSavedChats(){
  if(!chatCol) return;
  modal(`<h3 style="margin:0 0 4px">Saved chats</h3><p class="muted" style="margin:0 0 12px;font-size:14px">Every Coach chat is saved here, on any device where you open the Coach.</p><div id="histList" class="view" style="gap:8px"><p class="muted">Loading…</p></div><button class="btn line block" style="margin-top:12px" id="histClose">Close</button>`, ()=>{
    $("#histClose").onclick = ()=>{ $("#modalRoot").innerHTML=""; };
  });
  const box = ()=>$("#histList");
  const timer = setTimeout(()=>{ if(box() && /Loading/.test(box().textContent)) box().innerHTML = `<p class="muted">Couldn't load your chats. Check your internet and try again.</p>`; }, 10000);
  let docs = [];
  try{ docs = (await chatCol.orderBy("at","desc").limit(40).get()).docs; }catch(e){ clearTimeout(timer); if(box()) box().innerHTML = `<p class="muted">Couldn't load your chats. Check your internet and try again.</p>`; return; }
  clearTimeout(timer);
  if(!box()) return;
  if(!docs.length){ box().innerHTML = `<p class="muted">No saved chats yet. Ask Coach something and it will appear here.</p>`; return; }
  box().innerHTML = docs.map(d=>{ const x=d.data(); const t=x.topic&&TOPIC[x.topic];
    return `<div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px">
      <button class="linkbtn" data-open="${esc(d.id)}" style="flex:1;text-align:left;background:none;border:0;padding:0;color:var(--ink);font:inherit;cursor:pointer"><b style="display:block">${esc(x.title||"Chat")}</b><span class="muted" style="font-size:13px">${new Date(x.at).toLocaleDateString([], {day:"numeric",month:"short"})} ${new Date(x.at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}${t?" · "+esc(SUBJ[t.s].code):""} · ${x.count||0} messages</span></button>
      <button class="btn line sm" data-del="${esc(d.id)}" aria-label="Delete this chat">Delete</button></div>`; }).join("");
  const byId = Object.fromEntries(docs.map(d=>[d.id, d.data()]));
  box().querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{
    const x = byId[b.dataset.open]; let msgs=[]; try{ msgs = JSON.parse(x.msgs||"[]"); }catch(e){}
    chatCtl?.abort(); chat = msgs; chatRef = chat; chatId = b.dataset.open; chatTopic = x.topic||null; pendingImg = null;
    $("#modalRoot").innerHTML=""; go("tutor");
  });
  box().querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
    if(b.dataset.sure!=="1"){ b.dataset.sure="1"; b.textContent="Sure?"; return; }
    try{ await chatCol.doc(b.dataset.del).delete(); b.closest(".row").remove(); if(chatId===b.dataset.del){ chatRef=null; } }catch(e){ toast("Couldn't delete. Try again."); }
  });
}

/* =================== LESSONS (inside Claude) =================== */
let lessonCtl = null;
function viewCoachTopic(v, t){
  S.subj = t.s; save();
  const s = SUBJ[t.s];
  v.innerHTML = `
  <button class="back" id="bk">← ${esc(s.name)} lessons</button>
  <div class="hero subj s-${t.s}"><div class="circuit"></div><span class="eyebrow">${s.code} · Topic ${topicsOf(t.s).indexOf(t)+1}</span><h2>${esc(t.name)}</h2></div>
  <div class="card s-${t.s}"><span class="eyebrow">What you'll learn</span><ul class="learnlist" style="margin-top:8px">${t.learn.map((x,k)=>`<li><span>${"abcdefg"[k]}</span><div>${esc(x)}</div></li>`).join("")}</ul></div>
  <div class="grid2 s-${t.s}">
    <button class="btn sub" id="tLesson" ${AI?"":"disabled"}>Step-by-step lesson</button>
    <button class="btn subghost" id="tEx" ${AI?"":"disabled"}>New worked example</button>
    <button class="btn subghost" id="tVis" ${AI?"":"disabled"}>Draw it for me</button>
    <button class="btn subghost" id="tWork">Work it with me</button>
  </div>
  <div class="card" id="lessonBox" hidden><div class="row between"><span class="eyebrow" id="lessonLbl">Lesson</span><button class="btn line sm" id="lessonStop" hidden>Stop</button></div><div class="md" id="lessonOut" style="margin-top:8px"></div>
    <button class="btn ghost block" id="lAsk" hidden style="margin-top:10px">Ask Coach about this</button></div>
  ${aiReady && !AI?aiBanner():""}`;
  $("#bk").onclick = ()=>go("topics");
  $("#tLesson").onclick = ()=>runLesson(t, "lesson");
  $("#tEx").onclick = ()=>runLesson(t, "example");
  $("#tVis").onclick = ()=>runLesson(t, "visual");
  $("#tWork").onclick = ()=>{ chatTopic=t.id; chat=[]; pendingChat={text:workPrompt(t), show:"🧩 Work it with me: "+t.name}; go("tutor"); };
  $("#lAsk").onclick = ()=>{ chatTopic=t.id; go("tutor"); };
  if(autoLesson===t.id && aiReady){ autoLesson=null; runLesson(t, "lesson"); }
}
let autoLesson = null;
async function runLesson(t, kind){
  const box=$("#lessonBox"), out=$("#lessonOut"), stop=$("#lessonStop");
  box.hidden=false; $("#lessonLbl").textContent = {lesson:"Step-by-step lesson", example:"Worked example", visual:"Picture explanation"}[kind];
  out.innerHTML = thinking(kind==="example"?"Coach is writing a fresh example":kind==="visual"?"Coach is drawing":"Coach is preparing your lesson");
  box.scrollIntoView({behavior:"smooth",block:"start"});
  lessonCtl?.abort(); lessonCtl = new AbortController(); stop.hidden=false; stop.onclick=()=>lessonCtl.abort();
  const topic = `"${t.name}" from ${SUBJ[t.s].code} ${SUBJ[t.s].full} (covers: ${t.learn.join("; ")})`;
  const prompt = RULES() + "\n\n" + (kind==="example"
    ? `Give ONE new worked example on ${topic}, set in Trinidad and Tobago. Show the question first, then solve it in short numbered steps with all working (tables or diagram blocks where they help). End with "⚠️ Tricky bit:" and one sentence. Make it different from a typical textbook example. Random seed: ${Math.random().toString(36).slice(2,7)}.`
    : kind==="visual"
    ? `Explain ${topic} mainly with pictures: one or two diagram blocks (flow, layers or compare) or a Markdown table, each with 2-3 short sentences underneath saying what to notice. Start with a one-line everyday Trinidad and Tobago comparison.`
    : `Teach ${topic} as a short lesson for a student who is struggling with it. Use these headings: "### In everyday words" (a Trinidad and Tobago illustration), "### The proper definition", "### Step by step" (with a diagram block or table), "### Worked example", "### ⚠️ Tricky bit", "### ❌ Common mistakes" (wrong thinking → why it's wrong → the fix), "### Quick check" (one question; put the answer on the last line after "Answer:").`);
  try{
    await aiCall(prompt, {signal:lessonCtl.signal, cache: kind==="lesson"?{gcTime:86400000}:false, onText:({text})=>{ out.innerHTML = md(text); }});
    const st = topicStat(t.id); st.lessons++; S.n.lesson++; if(kind==="visual") S.n.visual++;
    const k = t.id+kind;
    if(S.lessonDay[k]!==today()){ S.lessonDay[k]=today(); addXP(kind==="visual"?XP.visual:XP.lesson, kind==="example"?"worked example":kind==="visual"?"diagram":"lesson"); } else save();
    $("#lAsk").hidden=false;
  }catch(e){ if(e.code!=="cancelled") out.innerHTML = (e.text?md(e.text):"") + `<p class="banner">${esc(aiErr(e))}</p>`; else if(e.text) out.innerHTML = md(e.text); }
  stop.hidden=true;
}

/* =================== STRUCTURED QUESTIONS (marked by Coach) =================== */
let P2 = null, structTopic = null;
function viewCoachPractice(v){
  const s = SUBJ[S.subj] || SUBJECTS[0];
  const ts = topicsOf(s.id);
  const sel = structTopic && TOPIC[structTopic]?.s===s.id ? structTopic : ts[0].id;
  v.innerHTML = `<div><h2 style="font-size:26px">Structured questions</h2><p class="muted" style="margin:4px 0 0">Coach writes an exam-style long question. You type your answer (or add a photo of your working), and Coach marks it part by part.</p></div>
  ${subjPicker(s.id)}
  <div class="card s-${s.id}"><span class="eyebrow">${s.code}</span>
    <label class="lab" for="p2t" style="margin-top:8px">Topic</label><select class="field" id="p2t">${ts.map(t=>`<option value="${t.id}" ${t.id===sel?"selected":""}>${esc(t.name)}</option>`).join("")}</select>
    <button class="btn sub block" id="pP2" style="margin-top:10px" ${AI?"":"disabled"}>Write me a question</button>
    <p class="muted" style="margin:8px 0 0;font-size:13px">+${XP.structuredBase} XP for every marked question, plus ${XP.perMark} XP for each mark you earn.</p></div>
  ${INTEGRITY}
  ${aiReady && !AI?aiBanner():""}`;
  bindSubjPicker(v);
  $("#p2t").onchange = ()=>{ structTopic=$("#p2t").value; };
  $("#pP2").onclick = ()=>startStructured($("#p2t").value);
}
async function startStructured(topicId){
  P2 = {topic:topicId, loading:true, q:null, answers:{}, marking:false, result:null, err:""};
  go("structured");
  const t = TOPIC[topicId], s = SUBJ[t.s];
  try{
    const q = await aiJSON(`You write exam-style structured questions for ${s.code} ${s.full} at the University of Trinidad and Tobago (Year 1 diploma).
Topic: ${t.name} (${t.learn.join("; ")}).
Write ONE practice question worth 10-15 marks with 3-4 parts that build on each other (e.g. define/explain, apply or calculate, draw or trace, troubleshoot or justify). ${t.s==="logc"?"Where useful, include a short Python 3 program or ask for a flowchart described in words or a trace table. ":""}${t.s==="ntwk"&&t.id==="n6"?"Include a subnetting calculation with exact, checked figures. ":""}Use Trinidad and Tobago contexts. Make every figure consistent and check that every part has one clear correct answer.
Reply with only JSON: {"title": "short title", "scenario": "the information given, in Markdown (code in a python code block)", "parts": [{"label": "(a)", "task": "what to do", "marks": number}]}
Random seed: ${Math.random().toString(36).slice(2,8)}`);
    if(!q || !Array.isArray(q.parts) || !q.parts.length) throw {code:"invalid_json"};
    P2.q = {title:String(q.title||t.name), scenario:String(q.scenario||""), parts:q.parts.map(p=>({label:String(p.label||""), task:String(p.task||""), marks:Math.max(1,Math.round(+p.marks||1))}))};
  }catch(e){ P2.err = aiErr(e); }
  P2.loading=false; if(tab==="structured") render();
}
function viewStructured(v){
  if(!P2) return go("practice");
  const t = TOPIC[P2.topic], s = SUBJ[t.s];
  const head = `<button class="back" id="bk">← Structured questions</button>`;
  if(P2.loading){ v.innerHTML = head+`<div class="card"><span class="eyebrow">${s.code} · ${esc(t.name)}</span><h3 style="margin-top:6px">Coach is setting your question</h3><p class="muted">Usually 20–60 seconds.</p>${thinking("Writing the question")}</div>`; $("#bk").onclick=()=>{P2=null;go("practice");}; return; }
  if(P2.err && !P2.q){ v.innerHTML = head+`<div class="card"><p class="banner">${esc(P2.err)}</p><button class="btn" id="retry" style="margin-top:10px">Try again</button></div>`; $("#bk").onclick=()=>go("practice"); $("#retry").onclick=()=>startStructured(P2.topic); return; }
  const q=P2.q, total=q.parts.reduce((a,p)=>a+p.marks,0), R=P2.result;
  v.innerHTML = head + `
  <div class="card s-${t.s}"><span class="eyebrow">${s.code} · ${esc(t.name)} · ${total} marks</span><h3 style="margin-top:4px">${esc(q.title)}</h3><div class="md" style="margin-top:8px">${md(q.scenario)}</div>
   ${q.parts.map((p,k)=>{ const r=R?.parts?.[k];
    return `<div class="part"><div class="row between"><b>${esc(p.label)} ${esc(p.task)}</b><span class="score">${r?`${r.awarded}/${p.marks}`:`${p.marks} mark${p.marks===1?"":"s"}`}</span></div>
     ${R?`<div class="muted" style="white-space:pre-wrap;font-size:14px;font-family:var(--f-mono)">${esc(P2.answers[k]||"(no answer)")}</div>
      ${r?`<div class="fb ${r.awarded>=p.marks?"ok":"bad"}"><div class="md">${md(r.feedback||"")}</div>${r.fix && r.awarded<p.marks?`<div class="fixbox"><span class="lbl">How to fix it</span><div class="md">${md(r.fix)}</div></div>`:""}</div>`:""}`
     :`<textarea class="field mono" id="ans${k}" placeholder="Your answer" aria-label="Answer to part ${esc(p.label)}">${esc(P2.answers[k]||"")}</textarea>`}
    </div>`;}).join("")}
  </div>
  ${R?`<div class="hero subj s-${t.s}"><div class="circuit"></div><span class="eyebrow">Your mark</span><div class="big">${R.total}/${total}</div><h2>${esc(R.summary||"")}</h2></div>
     ${R.model?`<div class="card"><span class="eyebrow">Model answer</span><div class="md" style="margin-top:8px">${md(R.model)}</div></div>`:""}
     <div class="grid2"><button class="btn" id="p2again">New question</button><button class="btn ghost" id="p2ask">Discuss with Coach</button></div>`
   :`${P2.err?`<p class="banner">${esc(P2.err)}</p>`:""}<div id="p2Attach"></div>
     <div class="grid2">${aiImages?`<button class="btn line" id="p2cam">${ico("cam")} Photo of my working</button>`:""}<button class="btn gold" id="p2mark" ${P2.marking?"disabled":""}>${P2.marking?"Marking…":"Mark my answer"}</button></div>
     ${P2.marking?`<div class="card">${thinking("Coach is marking")}</div>`:""}`}`;
  $("#bk").onclick = ()=>{ P2=null; go("practice"); };
  if(!R){
    q.parts.forEach((_,k)=>{ const el=$("#ans"+k); if(el) el.oninput=()=>{ P2.answers[k]=el.value; }; });
    const showA=()=>{ const a=$("#p2Attach"); if(a) a.innerHTML = P2.img?`<div class="attach"><img src="${P2.img.url}" alt="Working photo"><span style="flex:1">Photo of working attached</span></div>`:""; };
    showA();
    if($("#p2cam")) $("#p2cam").onclick=()=>pickImage(()=>{ P2.img=pendingImg; pendingImg=null; showA(); });
    $("#p2mark").onclick = markStructured;
  } else {
    $("#p2again").onclick = ()=>startStructured(P2.topic);
    $("#p2ask").onclick = ()=>{ chatTopic=P2.topic; chat=[]; pendingChat=`I just did this structured question and got ${R.total}/${total}.\n\n${q.title}\n${q.scenario}\n\n${q.parts.map((p,k)=>`${p.label} ${p.task}\nMy answer: ${P2.answers[k]||"(blank)"}`).join("\n\n")}\n\nHelp me understand the parts I lost marks on, one at a time.`; go("tutor"); };
  }
}
async function markStructured(){
  const q=P2.q, t=TOPIC[P2.topic], s=SUBJ[t.s];
  if(!q.parts.some((_,k)=>(P2.answers[k]||"").trim()) && !P2.img){ toast("Write an answer or add a photo first."); return; }
  P2.marking=true; P2.err=""; render();
  try{
    const opts = {effort:"medium"}; if(P2.img) opts.images=[P2.img.file];
    const r = await aiJSON(`You are a fair, encouraging examiner for ${s.code} ${s.full} at UTT, marking a Year 1 student's practice answer. Award method marks for correct working even if a final figure is wrong, and accept correct alternative wording. Check every calculation, port number, Python output and hardware fact yourself before marking.${S.coachStyle==="co-examiner"?" Be strict and use mark-scheme language.":""}
Question: ${q.title}
${q.scenario}

${q.parts.map((p,k)=>`${p.label} ${p.task} [${p.marks} marks]\nStudent's answer: ${(P2.answers[k]||"").trim()||"(left blank"+(P2.img?" – see the attached photo of the student's working)":")")}`).join("\n\n")}

Reply with only JSON: {"parts": [{"awarded": number, "feedback": "1-3 short sentences: what she got right, then exactly where it went wrong and why", "fix": "the correct method for what she missed, step by step (Markdown)"}], "total": number, "summary": "one encouraging sentence on what to do next", "model": "a full model answer in Markdown"}
The parts array must have exactly ${q.parts.length} items in order.`, opts);
    if(!r || !Array.isArray(r.parts)) throw {code:"invalid_json"};
    r.parts = q.parts.map((p,k)=>{ const x=r.parts[k]||{}; return {awarded:Math.max(0,Math.min(p.marks, Math.round(+x.awarded||0))), feedback:String(x.feedback||""), fix:String(x.fix||"")}; });
    r.total = r.parts.reduce((a,p)=>a+p.awarded,0);
    P2.result = r; P2.marking=false;
    S.n.structured++; if(P2.img) S.n.photo++;
    addXP(XP.structuredBase + r.total*XP.perMark, "structured question marked");
  }catch(e){ P2.marking=false; P2.err = aiErr(e); }
  if(tab==="structured") render();
}

/* ---- App → Coach hand-off: #go-<payload> ---- */
function handleCoachHash(){
  const h = location.hash;
  const m = h.match(/^#go-([A-Za-z0-9_-]+)$/);
  if(!m){ tab="tutor"; return; }
  let o; try{ o = b64d(m[1]); }catch(e){ tab="tutor"; return; }
  if(o.n) S.name = String(o.n).slice(0,30);
  if(o.st!==undefined) S.coachStyle = SHOP.some(x=>x.id===o.st) ? o.st : null;
  if(SUBJ[o.s]) S.subj = o.s;
  const t = TOPIC[o.t] ? o.t : null;
  if(Array.isArray(o.k)) S.mistakes = o.k.map(x=>({t:x.t, q:x.q, chosen:x.c, correct:x.a}));
  save();
  if(o.m==="lesson" && t){ autoLesson=t; tab="topics"; sub=t; }
  else if(o.m==="work"){ chatTopic=t; chat=[]; pendingChat={text:workPrompt(t&&TOPIC[t]), show:"🧩 Work it with me"+(t?": "+TOPIC[t].name:"")}; tab="tutor"; }
  else if(o.m==="review" && S.mistakes.length){ chatTopic=t; chat=[]; S.n.review++; save(); pendingChat={text:reviewPrompt(S.mistakes), show:"🔁 Review my mistakes ("+S.mistakes.length+")"}; tab="tutor"; }
  else if(o.m==="struct"){ structTopic=t; tab="practice"; }
  else { chatTopic=t; tab="tutor"; }
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
}
