---
title: Rebuild a playable test build when Unity scripts are gitignored
date: 2026-07-26
category: tooling-decisions
module: web-playable
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - "Unity project has scenes and prefabs but Scripts/ (or other source) is gitignored"
  - "Target machine lacks the matching Unity Editor version for a native build"
  - "Goal is a quick playable test, not a pixel-perfect engine restore"
root_cause: incomplete_setup
resolution_type: tooling_addition
tags:
  - unity
  - reverse-engineering
  - html5
  - web-rebuild
  - missing-scripts
---

# Rebuild a playable test build when Unity scripts are gitignored

## Context

This repo is a Unity **2017.3.0f3** project (`ProjectSettings/ProjectVersion.txt`) with scenes, prefabs, animations, and sprites under `Assets/MainApp/`, but gameplay C# was never committed: `Assets/MainApp/Scripts/.gitignore` ignores everything except itself. Without scripts, the Editor project cannot run as shipped, and recovering a matching ancient Editor is often slower than getting something playable for design/QA smoke tests.

## Guidance

Prefer a **browser playable rebuild** that reuses the original art and reverse-engineers behavior from YAML:

1. **Confirm the gap** — empty `*.cs` count, Scripts `.gitignore` with `*`, scenes/prefabs still present.
2. **Mine serialized truth** — read `EditorBuildSettings.asset` for scene order; scrape MonoBehaviour fields on Player / Spawner / GameController / BackgroundScroller prefabs and level scenes (speeds, bounds, tags, ally cost, boss flags). Splash instruction UI text is often the design brief.
3. **Ship a thin web client** — `web/` with Canvas + `game.js`, cropped frames under `web/assets/frames/` (avoid drawing huge sprite sheets every frame), serve with `python3 -m http.server` or `web/serve.sh`.
4. **Match fantasy + controls, not binary fidelity** — free pointer follow + click-to-shoot (web rebuild evolved past the original hold-to-fly fantasy), food/points/allies, obstacles, level map, boss on level 3; tune durations for testability when the original had no serialized level timer.

## Why This Matters

Waiting on missing source or a legacy Editor blocks the only useful next step: **playing the game**. A web rebuild turns prefab/scene data into a testable loop in hours, keeps original art, and documents intended mechanics for a later real Unity restore if scripts reappear.

## When to Apply

- Scripts (or fonts/sfx) were intentionally gitignored or lost, but scenes/prefabs remain
- You need a smoke-testable build on Linux without Unity Hub/Editor
- Gameplay can be inferred from serialized fields + in-scene UI copy

## Examples

**Before:** Clone opens in Unity (if available) with broken/missing script references; no runnable player build.

**After:**

```bash
cd web && ./serve.sh
# open http://127.0.0.1:8765/
```

Key artifacts from this session: `web/index.html`, `web/game.js`, `web/assets/frames/`, `web/serve.sh`. Flow: Splash → Attack Map → Levels 1–3; move to steer, click to shoot glow bullets, eat food, spawn allies at 3 points, avoid antibodies/walls, Level 3 boss.

## Related

- Original Unity scripts remain absent; this is a parallel playable surface, not a drop-in Editor restore
