# web — playable Canvas rebuild

## Purpose

Browser playable of No Way Out: splash/map/levels, free pointer follow, hold/click glow bullets, allies, food economy.

## Ownership

- Owns `web/game.js`, `web/index.html`, `web/style.css`, `web/serve.sh`, `web/assets/`
- Deploy surface for Cloudflare Pages (`npx wrangler pages deploy web --project-name=no-way-out`)
- Does not own Unity `Assets/` or long-form plans under `docs/`

## Local Contracts

- Entry: `index.html` → `game.js` (IIFE); harness `window.__nwo` (`startLevel`, `setPointer`, `fire`, `bullets`)
- Play: pointer XY lerp; `firing` while primary pointer down; bullets travel +Y, code-drawn glow (no bullet sprites)
- Serve: `./serve.sh [port]` → `http://127.0.0.1:PORT/`

## Work Guidance

- Prefer code-drawn FX over new frames under `assets/frames/`
- Keep ally melee when changing player offense
- After control/combat changes, redeploy Pages from `web/` (Git builds must use root directory `web`)

## Verification

- `cd web && ./serve.sh` then `__nwo.startLevel(1); __nwo.fire(); __nwo.bullets()`
- Confirm production hint/copy is not still “Hold to fly”

## Child DOX Index

- `assets/` — cropped sprites; no nested AGENTS.md (leaf assets)
