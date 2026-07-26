# No Way Out

A vertical endless-style action game where you play as a bacterium invading a body. Steer with the pointer, fire energy bullets, eat food, recruit virus allies, dodge antibodies and walls, and survive through three levels — including a boss fight on Level 3.

## Play (web)

The runnable build is a browser port under `web/`. Original Unity C# gameplay scripts are not in this repo (see [Project status](#project-status)).

```bash
cd web
./serve.sh
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). Optional custom port: `./serve.sh 9000`.

Works with mouse or touch: move to steer, hold / click / tap to shoot upward.

## How to play

1. You are a bacterium — conquer the body with your allies.
2. Eat food to earn points; avoid dying too soon.
3. After 3 food, you can spawn virus allies (costs 3 points each, up to 3 allies).
4. Move freely in the tunnel and hold / click / tap to fire energy bullets.

Avoid antibodies and tunnel walls. Level 3 has a boss. Progress is saved in the browser (`localStorage`).

**Flow:** Splash → Attack Map → Levels 1–3.

## Project status

| Piece | Status |
| --- | --- |
| Unity project (`Assets/`, `ProjectSettings/`) | Present — Unity **2017.3.0f3**, product name `codejam` |
| Gameplay C# (`Assets/MainApp/Scripts/`) | **Missing** — directory gitignores all scripts |
| Web playable (`web/`) | Playable rebuild from scenes/prefabs + original art |

Scenes, prefabs, animations, and sprites remain under `Assets/MainApp/`. The web client reuses cropped frames from that art and reverse-engineered mechanics from serialized Unity data. It is a smoke-testable port, not a pixel-perfect engine restore.

Background on why the web build exists: [`docs/solutions/tooling-decisions/unity-missing-scripts-web-rebuild.md`](docs/solutions/tooling-decisions/unity-missing-scripts-web-rebuild.md).

## Repository layout

```
Assets/MainApp/     Unity content (scenes, prefabs, sprites, animations, SFX)
ProjectSettings/    Unity project settings (Editor 2017.3.0f3)
UnityPackageManager/
web/                HTML5 playable (index.html, game.js, assets/frames/)
docs/               Decision notes and tooling write-ups
```

### Unity scenes

`Splash` → `Map` → `Level 1` / `Level 2` / `Level 3` (plus `Video`).

### Web stack

Plain Canvas + JavaScript. No build step. Local static server only (`python3 -m http.server` via `web/serve.sh`).

## Opening in Unity

1. Install Unity **2017.3.0f3** (or a compatible 2017.3.x editor).
2. Open this folder as a Unity project.
3. Expect missing script references until gameplay C# is restored under `Assets/MainApp/Scripts/`.

## License

No license file is included in this repository. Treat rights as unspecified unless the upstream owner clarifies them.
