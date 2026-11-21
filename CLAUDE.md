# Notes for Claude

- Source of truth: `src/`. Never edit `site/` or `coach/` by hand; run `python3 build.py`.
- After changing the source, do BOTH: push to `main` (Worker `utt-study` proxies raw.githubusercontent.com/sunihard-bit/utt-study/main/site at utt.tidyassistant.com) and republish the Claude artifact https://claude.ai/artifact/Vmzqstn6cmwHpYswrjS4pN from `coach/coach.html` (pass the URL; capabilities carry forward).
- Keep `CLAIM_KEY`, `LINK_KEY`, `APP_URL` and `config.json` coach_url consistent, or Coach points and parent links stop working.
- Verify all technical content before publishing: run Python snippets, re-check subnet maths, ports and hardware specs.
- Progress reports: read KV namespace `utt-study-backups` (id fe140d12e6734408b55d27161a3aaccf) on Sunil's Cloudflare account; each key `b:<code>` holds `{state, at}` where state has topics, log (every answer), quizLog, mistakes, srs, badges, days, streak.
- The owner (Sunil, Trinidad) is non-technical; explain any step he must take in plain words.
