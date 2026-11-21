#!/usr/bin/env python3
"""Build the UTT Study Coach.

Usage: python3 build.py
  src/*.html + src/*.js  ->  coach/coach.html  (one file: published as the Claude artifact = the Coach)
                         ->  site/              (installable PWA: index.html, sw.js, manifest, icons)
The Cloudflare Worker in worker/worker.js serves site/ from GitHub at utt.tidyassistant.com and stores backups in KV.
The Coach artifact URL lives in config.json (coach_url).
"""
import base64, hashlib, json, pathlib

ROOT = pathlib.Path(__file__).parent
CFG = json.loads((ROOT / "config.json").read_text())
src = ROOT / "src"
shell = (src / "00-shell.html").read_text()
js = "\n".join(p.read_text() for p in sorted(src.glob("*.js")))
APP = shell + "\n<script>\n" + js.replace("__COACH_URL__", CFG["coach_url"]) + "\n</script>\n"
OUT = ROOT / "coach"; OUT.mkdir(exist_ok=True); SITE = ROOT / "site"; SITE.mkdir(exist_ok=True)
(OUT / "coach.html").write_text(APP)
VERSION = hashlib.sha1(APP.encode()).hexdigest()[:10]

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0A5A5A">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="UTT Study">
<meta name="description" content="Study coach for NTWK1007, LOGC1002 and COHW1004">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
"""
TAIL = """
<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
</script>
</body>
</html>
"""
MANIFEST = {"name":"UTT Study Coach","short_name":"UTT Study","start_url":"/","scope":"/","display":"standalone",
  "background_color":"#EEF4F4","theme_color":"#0A5A5A",
  "icons":[{"src":"/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"/icon-512.png","sizes":"512x512","type":"image/png"},
           {"src":"/icon-maskable.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
SW = """const CACHE = "utt-__V__";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("/", c)); return r; }).catch(() => caches.match("/")));
    return;
  }
  if (url.origin === location.origin || /fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
""".replace("__V__", VERSION)

files = {"/index.html": ("text/html; charset=utf-8", HEAD + APP + TAIL), "/sw.js": ("text/javascript; charset=utf-8", SW),
         "/manifest.webmanifest": ("application/manifest+json", json.dumps(MANIFEST, indent=1))}
for p, (_, body) in files.items(): (SITE / p.lstrip("/")).write_text(body)
icons = {}
for f in sorted((ROOT / "icons").glob("*.png")):
    (SITE / f.name).write_bytes(f.read_bytes()); icons["/" + f.name] = base64.b64encode(f.read_bytes()).decode()

print("built", VERSION, "coach.html", len(APP)//1024, "KB")
