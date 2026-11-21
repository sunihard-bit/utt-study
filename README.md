# UTT Study Coach

A study app for Suri's Year 1 Diploma in Software Engineering courses at UTT: NTWK1007 (Networks), LOGC1002 (Reasoning & Logic / Python) and COHW1004 (Computer Hardware).

- **Main app (works offline):** https://utt.tidyassistant.com. Install it from the browser to the phone's home screen.
- **Coach (needs internet):** https://claude.ai/artifact/Vmzqstn6cmwHpYswrjS4pN. The AI tutor runs inside Claude. XP earned there comes back to the main app through the signed "Add X XP to app" link (max 1,000 XP per link, each link works once).

## How it is built

`src/` is the single source (shell + content + app code). It runs in two modes:

| Where it runs | Mode | What it does |
|---|---|---|
| utt.tidyassistant.com (no `window.claude`) | `STANDALONE` | Full app: topics, quizzes from the built-in bank, spaced repetition, speed games, XP/streak/coins/rewards, parent area, cloud backup. Coach buttons open the Claude page. |
| The Claude artifact | `COACH_MODE` | Coach chat, AI lessons, "Work it with me", photo feedback, structured questions marked by Coach. XP is held as pending and sent to the main app via a signed `#claim-…` link. |

## Updating

1. Edit files in `src/` (content is in `src/10-content.js`).
2. Run `python3 build.py` (writes `site/` and `coach/coach.html`).
3. Commit and push to `main`. The Cloudflare Worker `utt-study` serves `site/` from this public repo at utt.tidyassistant.com (GitHub's raw cache can take ~5 minutes).
4. Republish the Coach artifact from `coach/coach.html` to the same URL (capabilities: sample with images, db, user).

## Cloud backup

Progress is saved on the phone and, every ~30 seconds while studying, to Cloudflare KV namespace `utt-study-backups` under key `b:<backup code>`. The backup code is shown in the app under Progress → Settings and restores everything on a new phone.
