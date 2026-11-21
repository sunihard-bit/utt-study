// UTT Study Coach Worker (utt.tidyassistant.com).
// Serves the app from the public GitHub repo sunihard-bit/utt-study (folder site/) and keeps cloud backups in KV (binding BACKUP).
const ORIGIN = "https://raw.githubusercontent.com/sunihard-bit/utt-study/main/site";
const TYPES = { html:"text/html; charset=utf-8", js:"text/javascript; charset=utf-8", webmanifest:"application/manifest+json", png:"image/png", json:"application/json" };
const CODE = /^[a-z2-9]{16}$/;
const SEC = { "x-content-type-options":"nosniff", "referrer-policy":"strict-origin-when-cross-origin" };
const json = (o, status=200) => new Response(JSON.stringify(o), { status, headers:{ "content-type":"application/json", "cache-control":"no-store", ...SEC } });
async function api(req, env, code){
  if(!CODE.test(code)) return json({error:"bad code"}, 400);
  const key = "b:" + code;
  if(req.method === "GET"){
    const v = await env.BACKUP.get(key);
    return v ? new Response(v, { headers:{ "content-type":"application/json", "cache-control":"no-store", ...SEC } }) : json({error:"not found"}, 404);
  }
  if(req.method === "PUT" || req.method === "POST"){
    const body = await req.text();
    if(body.length > 5000000) return json({error:"too big"}, 413);
    let o; try{ o = JSON.parse(body); }catch(e){ return json({error:"bad json"}, 400); }
    const s = o && o.state;
    if(!s || typeof s !== "object" || typeof s.xp !== "number") return json({error:"bad state"}, 400);
    // a code that was linked into another one keeps its forwarding note: devices still on it get 409 and follow movedTo
    if(!s.movedTo){ const cur = await env.BACKUP.get(key, "json"); if(cur && cur.state && cur.state.movedTo) return json({error:"moved", movedTo:cur.state.movedTo}, 409); }
    const at = new Date().toISOString();
    await env.BACKUP.put(key, JSON.stringify({ state:s, at }), { metadata:{ name:String(s.name||"").slice(0,30), xp:s.xp, streak:s.streak||0, last:s.last||null, at } });
    return json({ok:true});
  }
  return json({error:"method"}, 405);
}
export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if(url.pathname.startsWith("/api/backup/")) return api(req, env, url.pathname.slice(12));
    if(req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status:405 });
    let path = url.pathname;
    if(path === "/" || !/\.[a-z0-9]+$/i.test(path)) path = "/index.html";
    if(path.includes("..")) return new Response("Not found", { status:404 });
    const ext = path.split(".").pop().toLowerCase();
    if(!TYPES[ext]) return new Response("Not found", { status:404 });
    const r = await fetch(ORIGIN + path, { cf:{ cacheTtl:60, cacheEverything:true } });
    if(!r.ok) return new Response(path === "/index.html" ? "UTT Study Coach is being set up. Please check back soon." : "Not found", { status:404, headers:{ "content-type":"text/plain; charset=utf-8" } });
    const img = ext === "png";
    return new Response(r.body, { headers:{ "content-type":TYPES[ext], "cache-control": img ? "public, max-age=86400" : "no-cache", ...SEC } });
  }
};
