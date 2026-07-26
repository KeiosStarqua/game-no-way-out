---
title: Free pointer follow plus code-drawn upward glow bullets
date: 2026-07-26
category: design-patterns
module: web-playable
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Web Canvas rebuild needs a freer twin-stick-lite feel than original hold-to-fly"
  - "Player projectiles are required but new sprite assets are rejected"
  - "Ally melee should remain meaningful alongside player shots"
tags:
  - canvas
  - controls
  - projectiles
  - mouse-follow
  - glow-bullets
  - web-rebuild
---

# Free pointer follow plus code-drawn upward glow bullets

## Context

The thin Canvas rebuild in `web/` originally mirrored Unity hold-to-fly: hold to stay aloft, release to fall and die, drag only on X. The desired play feel was freer steering in XY plus click-to-shoot, without adding frames under `web/assets/frames/`. Ally contact damage and the food → points → ally spawn economy still needed to matter.

Shipped on the KeiosStarqua fork in PR [#1](https://github.com/KeiosStarqua/game-no-way-out/pull/1) (merge target: fork default branch only).

## Guidance

1. **Replace hold/fall with continuous pointer follow** — track clamped `pointerX` / `pointerY` on `pointermove` / `pointerdown` in `play` with no `holding` gate; lerp the player toward both axes; drop gravity and the release-death path. Initialize the pointer target to the player on `resetPlay` so the first frame does not yank to an unset cursor.
2. **Fire only after UI handling** — on primary `pointerdown`, if `handleUiClick` returns true (menus / dead / win popups), return early; otherwise set `firing`, update the pointer, and attempt a shot. Keep `firing` until `pointerup` / cancel so hold repeats through the cooldown in `updatePlay`.
3. **Rate-limit bullets and keep them simple** — spawn into `state.bullets` with a short cooldown; travel straight +Y (same world axis as enemy descent); cull above the spawn band; destroy on first enemy/boss hit (no pierce). Boss hits use a reduced damage factor similar to ally boss melee so Level 3 stays fair. Spawn slightly ahead of the player so the shot is not buried under the virus sprite.
4. **Draw glow in world space** — `drawGlowBullet` uses a short trail plus radial halo via `worldToScreen`; no sprite load. Draw after enemies/obstacles and immediately before the player.
5. **Deploy from `web/`** — Cloudflare Pages must publish the `web/` directory (`wrangler pages deploy web`). Git builds that use repo root (or a failed master build) can leave production on an older hold-to-fly bundle; hard-refresh if hint still says “Hold to fly”.
6. **Keep dual offense** — leave ally melee loops unchanged so food/points/ally spawn still matters while Level 1 remains completable with bullets alone.
7. **Sync copy and harness** — replace hold/release language in HUD, instruct, `#hint`, and README; expose `window.__nwo.setPointer` / `fire` for console smoke (`cd web && ./serve.sh`).

## Why This Matters

Fidelity to the original hold-to-fly fantasy blocked the intended vertical-shooter feel and made Level 1 hard without allies. Code-drawn bullets avoid art pipeline work while remaining readable on the dark tunnel. Dual offense preserves the ally economy instead of replacing melee with guns.

## When to Apply

- Evolving a web rebuild past original Unity control fantasy when playtest demands freer movement
- Adding player offense without new sprites
- Keeping secondary systems (allies, food) valuable after introducing projectiles

## Examples

**Before (hold-to-fly):** `state.holding` gated X follow; release applied gravity and killed below a Y threshold with “Don’t release your finger…”.

**After (follow + shoot):** continuous lerp to pointer XY; click/tap calls `tryFireBullet()`; bullets update with constants such as cooldown `0.2`, speed `10`, damage `2`, boss factor `0.35` (`web/game.js`).

```js
// Fire gate + spawn (play only, cooldown-gated)
function tryFireBullet() {
  if (state.screen !== "play" || !state.player || state.fireCooldown > 0) return false;
  // push { x, y, r } at player; set fireCooldown
}

// Pointerdown: UI first, then aim + fire
if (handleUiClick(x, y)) return;
if (state.screen === "play") {
  setPointerFromCanvas(x, y);
  tryFireBullet();
}
```

Console smoke:

```js
__nwo.startLevel(1);
__nwo.setPointer(1.5, 2);
__nwo.fire(); // expect __nwo.bullets() >= 1
```

## Related

- [`docs/solutions/tooling-decisions/unity-missing-scripts-web-rebuild.md`](../tooling-decisions/unity-missing-scripts-web-rebuild.md) — why the web playable exists; control sentence updated to match this pattern
- Plan: `docs/plans/2026-07-26-001-feat-mouse-follow-energy-bullets-plan.md`
- PR: [KeiosStarqua/game-no-way-out#1](https://github.com/KeiosStarqua/game-no-way-out/pull/1)
