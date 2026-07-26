(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width;
  const H = canvas.height;

  const VIEW_H = 10;
  const PPU = H / VIEW_H;

  const saveKey = "nwo-progress";
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(saveKey)) || { cleared: [] };
    } catch {
      return { cleared: [] };
    }
  }
  function saveProgress(p) {
    localStorage.setItem(saveKey, JSON.stringify(p));
  }
  let progress = loadProgress();

  const imgs = {
    virus: [],
    food: [],
    anti: [],
    ally: [],
    bg: null,
    wall: null,
    boss: null,
    nen: null,
    bodymap: null,
    flag: null,
    start: null,
    next: null,
    back: null,
    cancel: null,
    popup: null,
  };

  const LEVELS = {
    1: { duration: 35, enemyChance: 0.22, haveBoss: false, allied: false },
    2: { duration: 45, enemyChance: 0.32, haveBoss: false, allied: true },
    3: { duration: 20, enemyChance: 0.38, haveBoss: true, bossLife: 30, allied: true },
  };

  const BULLET_COOLDOWN = 0.2;
  const BULLET_SPEED = 10;
  const BULLET_DAMAGE = 2;
  const BULLET_RADIUS = 0.18;
  const BULLET_BOSS_FACTOR = 0.35;

  const state = {
    screen: "boot",
    level: 1,
    pointerX: 0,
    pointerY: 0,
    t: 0,
    anim: 0,
    points: 0,
    player: null,
    allies: [],
    foods: [],
    enemies: [],
    obstacles: [],
    bullets: [],
    fireCooldown: 0,
    boss: null,
    bgY: [9, 0],
    spawnTimer: 0,
    obstacleTimer: 0,
    warningT: 0,
    grace: 1.2,
    buttons: [],
    popupMsg: "",
  };

  function worldToScreen(x, y) {
    return { x: W / 2 + x * PPU, y: H / 2 - y * PPU };
  }

  function eventToCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.changedTouches?.[0] || e.touches?.[0] || e;
    return {
      x: ((src.clientX - rect.left) / rect.width) * W,
      y: ((src.clientY - rect.top) / rect.height) * H,
    };
  }

  function canvasToWorld(cx, cy) {
    return { x: (cx - W / 2) / PPU, y: (H / 2 - cy) / PPU };
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function hitCircle(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy <= (ar + br) * (ar + br);
  }

  function drawImgCentered(img, wx, wy, dw, dh, alpha = 1) {
    if (!img) return;
    const p = worldToScreen(wx, wy);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, p.x - dw / 2, p.y - dh / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(text, x, y, maxW, lineH) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += lineH;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function buttonAt(cx, cy) {
    for (const b of state.buttons) {
      if (Math.abs(cx - b.x) <= b.w / 2 && Math.abs(cy - b.y) <= b.h / 2) return b;
    }
    return null;
  }

  function buildSplashButtons() {
    state.buttons = [
      { id: "play", x: W / 2, y: H * 0.58, w: 130, h: 130 },
      { id: "instruct", x: W / 2, y: H * 0.78, w: 240, h: 50 },
    ];
  }

  function buildMapButtons() {
    state.buttons = [
      { id: "lvl1", label: "Level 1", x: W * 0.28, y: H * 0.42, w: 110, h: 60 },
      { id: "lvl2", label: "Level 2", x: W * 0.72, y: H * 0.52, w: 110, h: 60 },
      { id: "lvl3", label: "Level 3", x: W * 0.4, y: H * 0.72, w: 110, h: 60 },
      { id: "back", x: 56, y: 48, w: 80, h: 80 },
    ];
  }

  function buildPopupButtons(isWin) {
    state.buttons = [
      { id: isWin ? "next" : "replay", label: isWin ? "Next" : "Replay", x: W * 0.32, y: H * 0.58, w: 100, h: 100 },
      { id: "exit", label: "Exit", x: W * 0.68, y: H * 0.58, w: 100, h: 100 },
    ];
  }

  function resetPlay(level) {
    const cfg = LEVELS[level];
    state.screen = "play";
    state.level = level;
    state.t = 0;
    state.points = 0;
    state.allies = [];
    state.foods = [];
    state.enemies = [];
    state.obstacles = [];
    state.bullets = [];
    state.fireCooldown = 0;
    state.boss = null;
    state.bgY = [9, 0];
    state.spawnTimer = 1;
    state.obstacleTimer = 0;
    state.warningT = 0;
    state.grace = 1.2;
    state.popupMsg = "";
    state.buttons = [];
    state.player = {
      x: 0,
      y: 0,
      r: 0.42,
      scale: 1,
      targetScale: 1,
      allied: cfg.allied,
      foodEaten: 0,
    };
    state.pointerX = state.player.x;
    state.pointerY = state.player.y;
  }

  function tryFireBullet() {
    if (state.screen !== "play" || !state.player) return false;
    if (state.fireCooldown > 0) return false;
    const p = state.player;
    state.bullets.push({
      x: p.x,
      y: p.y + p.r * 0.5 * p.scale,
      r: BULLET_RADIUS,
      dmg: BULLET_DAMAGE,
      speed: BULLET_SPEED,
    });
    state.fireCooldown = BULLET_COOLDOWN;
    return true;
  }

  function spawnFoodOrEnemy() {
    const cfg = LEVELS[state.level];
    const lane = [-2, 0, 2][Math.floor(Math.random() * 3)];
    const y = 6.2;
    if (Math.random() < cfg.enemyChance) {
      const kind = Math.random() < 0.5 ? 1 : 2;
      state.enemies.push({
        x: lane,
        y,
        r: 0.45,
        kind,
        hp: kind === 1 ? 6 : 4,
        phase: Math.random() * Math.PI * 2,
        frame: Math.floor(Math.random() * 3),
      });
    } else {
      state.foods.push({
        x: lane + rand(-0.2, 0.2),
        y,
        r: 0.35,
        frame: Math.floor(Math.random() * 4),
        bob: Math.random() * 10,
      });
    }
  }

  function spawnObstaclePair() {
    state.obstacles.push(
      { x: -2.55, y: 7, w: 1.7, h: 1.0 },
      { x: 2.55, y: 7, w: 1.7, h: 1.0 }
    );
  }

  function spawnAlly() {
    if (state.allies.length >= 3) return;
    const types = [
      { frame: 0, speed: 1, dmg: 6, ox: -1.2, oy: -0.9 },
      { frame: 1, speed: 2, dmg: 4, ox: 0, oy: -1.1 },
      { frame: 2, speed: 3, dmg: 2, ox: 1.2, oy: -0.9 },
    ];
    const used = new Set(state.allies.map((a) => a.frame));
    const pool = types.filter((t) => !used.has(t.frame));
    const t = (pool.length ? pool : types)[Math.floor(Math.random() * (pool.length || 1))];
    state.allies.push({
      ...t,
      x: state.player.x + t.ox,
      y: state.player.y + t.oy,
      r: 0.32,
      cooldown: 0,
    });
  }

  function trySpendAlly() {
    if (!state.player.allied && state.player.foodEaten < 3) return;
    if (state.points < 3 || state.allies.length >= 3) return;
    state.points -= 3;
    state.player.allied = true;
    spawnAlly();
  }

  function killPlayer(msg) {
    if (state.screen !== "play") return;
    state.screen = "dead";
    state.popupMsg = msg || "Oops. Your bacteria is eaten. Try this level again.";
    state.bullets = [];
    buildPopupButtons(false);
  }

  function winLevel() {
    if (state.screen !== "play") return;
    state.screen = "win";
    state.popupMsg = "Congratulation. You just pass this level.";
    state.bullets = [];
    if (!progress.cleared.includes(state.level)) {
      progress.cleared.push(state.level);
      saveProgress(progress);
    }
    buildPopupButtons(true);
  }

  function updatePlay(dt) {
    const cfg = LEVELS[state.level];
    const p = state.player;
    state.t += dt;
    state.grace = Math.max(0, state.grace - dt);

    const scrollSpeed = 2;
    for (let i = 0; i < state.bgY.length; i++) {
      state.bgY[i] -= scrollSpeed * dt;
      if (state.bgY[i] < -9) state.bgY[i] += 18;
    }

    state.obstacleTimer += scrollSpeed * dt;
    if (state.obstacleTimer >= 10) {
      state.obstacleTimer -= 10;
      spawnObstaclePair();
    }
    for (const o of state.obstacles) o.y -= scrollSpeed * dt;
    state.obstacles = state.obstacles.filter((o) => o.y > -6);

    if (!state.boss || state.boss.alive) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = rand(2, 5);
        spawnFoodOrEnemy();
      }
    }

    p.x += (state.pointerX - p.x) * Math.min(1, 12 * dt);
    p.y += (state.pointerY - p.y) * Math.min(1, 12 * dt);
    p.x = clamp(p.x, -2.2, 2.2);
    p.y = clamp(p.y, -5, 5);
    p.scale += (p.targetScale - p.scale) * Math.min(1, dt / 0.35);

    state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    for (const b of state.bullets) {
      b.y += b.speed * dt;
      if (b.y > 7) b.dead = true;
      if (b.dead) continue;
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (hitCircle(b.x, b.y, b.r, e.x, e.y, e.r)) {
          e.hp -= b.dmg;
          b.dead = true;
          if (e.hp <= 0) e.dead = true;
          break;
        }
      }
      if (b.dead) continue;
      if (state.boss?.alive) {
        const boss = state.boss;
        if (hitCircle(b.x, b.y, b.r, boss.x, boss.y, boss.r)) {
          boss.hp -= b.dmg * BULLET_BOSS_FACTOR;
          b.dead = true;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => !b.dead);

    for (const f of state.foods) {
      f.y -= (scrollSpeed + 1.2) * dt;
      f.x += Math.sin(state.t * 3 + f.bob) * 0.3 * dt;
      if (hitCircle(p.x, p.y, p.r * p.scale, f.x, f.y, f.r)) {
        f.dead = true;
        state.points += 1;
        p.foodEaten += 1;
        p.targetScale = clamp(p.targetScale + 0.05, 0.85, 1.35);
        if (p.foodEaten >= 3) p.allied = true;
        trySpendAlly();
      }
    }
    state.foods = state.foods.filter((f) => !f.dead && f.y > -8);

    for (const e of state.enemies) {
      e.y -= (scrollSpeed + 0.6) * dt;
      e.x += Math.sin(state.t * (e.kind === 1 ? 2 : 3) + e.phase) * (e.kind === 1 ? 0.8 : 1.4) * dt;
      e.x = clamp(e.x, -2.4, 2.4);

      if (state.grace <= 0 && hitCircle(p.x, p.y, p.r * 0.85 * p.scale, e.x, e.y, e.r)) {
        killPlayer();
        return;
      }

      for (const a of state.allies) {
        if (a.cooldown > 0) continue;
        if (hitCircle(a.x, a.y, a.r + 0.35, e.x, e.y, e.r)) {
          e.hp -= a.dmg;
          a.cooldown = 0.35;
          if (e.hp <= 0) e.dead = true;
        }
      }
    }
    state.enemies = state.enemies.filter((e) => !e.dead && e.y > -10);

    for (const o of state.obstacles) {
      if (
        state.grace <= 0 &&
        Math.abs(p.x - o.x) < o.w * 0.45 + p.r * 0.7 * p.scale &&
        Math.abs(p.y - o.y) < o.h * 0.4 + p.r * 0.5 * p.scale
      ) {
        killPlayer();
        return;
      }
    }

    for (const a of state.allies) {
      a.x += (p.x + a.ox - a.x) * Math.min(1, a.speed * 3 * dt);
      a.y += (p.y + a.oy - a.y) * Math.min(1, a.speed * 3 * dt);
      a.cooldown = Math.max(0, a.cooldown - dt);
    }

    if (cfg.haveBoss && !state.boss && state.t >= cfg.duration) {
      state.warningT = 2.2;
      state.boss = {
        x: 0,
        y: 7,
        targetY: 4,
        r: 1.1,
        hp: 40,
        alive: true,
        life: cfg.bossLife,
        phase: 0,
        spawnT: 0,
      };
    }

    if (state.boss && state.boss.alive) {
      const b = state.boss;
      state.warningT = Math.max(0, state.warningT - dt);
      b.y += (b.targetY - b.y) * Math.min(1, 1.5 * dt);
      b.phase += dt;
      b.x = Math.sin(b.phase * 1.2) * 1.6;
      b.life -= dt;
      b.spawnT -= dt;
      if (b.spawnT <= 0) {
        b.spawnT = rand(0.4, 1.1);
        if (Math.random() < 0.8) {
          state.enemies.push({
            x: b.x,
            y: b.y - 1.2,
            r: 0.4,
            kind: 2,
            hp: 4,
            phase: Math.random() * 6,
            frame: 1,
          });
        } else {
          state.foods.push({
            x: b.x + rand(-0.5, 0.5),
            y: b.y - 1.2,
            r: 0.35,
            frame: 2,
            bob: Math.random() * 8,
          });
        }
      }

      for (const a of state.allies) {
        if (a.cooldown > 0) continue;
        if (hitCircle(a.x, a.y, a.r + 0.5, b.x, b.y, b.r)) {
          b.hp -= a.dmg * 0.35;
          a.cooldown = 0.25;
        }
      }

      if (state.grace <= 0 && hitCircle(p.x, p.y, p.r * 0.8 * p.scale, b.x, b.y, b.r * 0.85)) {
        killPlayer();
        return;
      }

      if (b.hp <= 0 || b.life <= 0) {
        b.alive = false;
        winLevel();
        return;
      }
    }

    if (!cfg.haveBoss && state.t >= cfg.duration) winLevel();
  }

  function drawBackgroundPlay() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#4a1824");
    g.addColorStop(0.5, "#2c1018");
    g.addColorStop(1, "#180810");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (imgs.bg) {
      for (const y of state.bgY) {
        const p = worldToScreen(0, y);
        const dw = W * 1.05;
        const dh = 9 * PPU * 1.15;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(imgs.bg, p.x - dw / 2, p.y - dh / 2, dw, dh);
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = "rgba(90, 20, 35, 0.35)";
    ctx.fillRect(0, 0, W * 0.08, H);
    ctx.fillRect(W * 0.92, 0, W * 0.08, H);
  }

  function drawGlowBullet(b) {
    const s = worldToScreen(b.x, b.y);
    const rPx = Math.max(4, b.r * PPU);
    const halo = rPx * 2.6;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, halo);
    g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    g.addColorStop(0.25, "rgba(120, 255, 255, 0.85)");
    g.addColorStop(0.55, "rgba(40, 200, 255, 0.35)");
    g.addColorStop(1, "rgba(20, 120, 255, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, halo, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(230, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, rPx * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlay() {
    drawBackgroundPlay();

    for (const o of state.obstacles) {
      drawImgCentered(imgs.wall, o.x, o.y, o.w * PPU, o.h * PPU, 0.95);
    }
    for (const f of state.foods) {
      drawImgCentered(imgs.food[f.frame % imgs.food.length], f.x, f.y, 48, 52);
    }
    for (const e of state.enemies) {
      drawImgCentered(imgs.anti[e.frame % imgs.anti.length], e.x, e.y, 56, 64);
    }

    if (state.boss?.alive) {
      const b = state.boss;
      drawImgCentered(imgs.boss, b.x, b.y, 140, 120);
      const bp = worldToScreen(b.x, b.y + 1.5);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bp.x - 50, bp.y - 8, 100, 8);
      ctx.fillStyle = "#ff5a5a";
      ctx.fillRect(bp.x - 50, bp.y - 8, 100 * clamp(b.hp / 40, 0, 1), 8);
    }

    for (const a of state.allies) {
      drawImgCentered(imgs.ally[a.frame % imgs.ally.length], a.x, a.y, 44, 44);
    }

    for (const b of state.bullets) drawGlowBullet(b);

    const p = state.player;
    const vf = imgs.virus[Math.floor(state.anim * 8) % imgs.virus.length];
    const size = 70 * p.scale;
    drawImgCentered(vf, p.x, p.y, size, size * 0.85);

    ctx.fillStyle = "rgba(10, 4, 8, 0.55)";
    roundRect(12, 12, W - 24, 54, 12);
    ctx.fill();
    ctx.fillStyle = "#ffe8d8";
    ctx.font = '600 16px "IBM Plex Sans", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(`Remaining Points: ${state.points}`, 28, 36);
    ctx.font = '400 13px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = "rgba(255,220,200,0.75)";
    const cfg = LEVELS[state.level];
    const left = cfg.haveBoss
      ? state.boss?.alive
        ? `Boss ${Math.ceil(state.boss.life)}s`
        : `Invasion ${Math.max(0, Math.ceil(cfg.duration - state.t))}s`
      : `Survive ${Math.max(0, Math.ceil(cfg.duration - state.t))}s`;
    ctx.fillText(`Level ${state.level}  ·  Allies ${state.allies.length}/3  ·  ${left}`, 28, 54);

    if (state.grace > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = '600 18px "IBM Plex Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("Move to steer · Click to shoot", W / 2, H * 0.62);
    }

    if (state.warningT > 0) {
      ctx.fillStyle = `rgba(255, 40, 40, ${0.35 + 0.35 * Math.sin(state.t * 14)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = '700 42px "Bungee", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("WARNING!!!", W / 2, H * 0.45);
    }
  }

  function drawSplash() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#5a1a28");
    g.addColorStop(1, "#12060c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (imgs.nen) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(imgs.nen, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#ff6b4a";
    ctx.font = '700 44px "Bungee", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("NO WAY", W / 2, H * 0.28);
    ctx.fillStyle = "#ffe4c8";
    ctx.fillText("OUT", W / 2, H * 0.35);

    ctx.fillStyle = "rgba(255,230,210,0.8)";
    ctx.font = '400 14px "IBM Plex Sans", sans-serif';
    ctx.fillText("Conquer the body. Aim true.", W / 2, H * 0.42);

    const vf = imgs.virus[Math.floor(state.anim * 6) % Math.max(1, imgs.virus.length)];
    drawImgCentered(vf, 0, -0.4, 110, 95);

    const play = state.buttons.find((b) => b.id === "play");
    if (play) {
      if (imgs.start) ctx.drawImage(imgs.start, play.x - 55, play.y - 55, 110, 110);
      else {
        ctx.fillStyle = "#e85a3c";
        roundRect(play.x - 60, play.y - 28, 120, 56, 16);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = '600 22px "IBM Plex Sans", sans-serif';
        ctx.fillText("PLAY", play.x, play.y + 8);
      }
    }

    ctx.fillStyle = "rgba(255,220,200,0.9)";
    ctx.font = '600 15px "IBM Plex Sans", sans-serif';
    ctx.fillText("How to play", W / 2, H * 0.8);
  }

  function drawInstruct() {
    ctx.fillStyle = "#16080e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe4c8";
    ctx.font = '700 26px "Bungee", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("INSTRUCTIONS", W / 2, 70);

    const lines = [
      "1. You are a bacteria. Conquer the body",
      "   with your allies.",
      "2. Eat food and don't die too soon.",
      "3. After 3 food you can create more",
      "   virus allies (costs 3 points).",
      "4. Move to steer. Click / tap to shoot",
      "   energy bullets upward.",
      "",
      "Avoid antibodies and tunnel walls.",
      "Level 3 has a boss — survive it!",
    ];
    ctx.font = '400 15px "IBM Plex Sans", sans-serif';
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,230,210,0.9)";
    lines.forEach((line, i) => ctx.fillText(line, 36, 130 + i * 28));

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff8a60";
    ctx.font = '600 16px "IBM Plex Sans", sans-serif';
    ctx.fillText("Tap anywhere to continue", W / 2, H - 48);
  }

  function drawMap() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1030");
    g.addColorStop(1, "#100818");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ff8a60";
    ctx.font = '700 30px "Bungee", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("ATTACK MAP", W / 2, 84);

    if (imgs.bodymap) {
      const bw = W * 0.78;
      const bh = bw * (164 / 307);
      ctx.drawImage(imgs.bodymap, (W - bw) / 2, H * 0.22, bw, bh);
    }

    const dots = [
      [0.28, 0.42],
      [0.5, 0.48],
      [0.72, 0.52],
      [0.55, 0.62],
      [0.4, 0.72],
    ];
    ctx.strokeStyle = "rgba(255,180,120,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    dots.forEach(([x, y], i) => {
      const px = W * x;
      const py = H * y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    for (const b of state.buttons) {
      if (b.id === "back") {
        if (imgs.back) ctx.drawImage(imgs.back, b.x - 28, b.y - 28, 56, 56);
        continue;
      }
      const cleared = progress.cleared.includes(Number(b.id.replace("lvl", "")));
      ctx.fillStyle = cleared ? "rgba(60,140,80,0.85)" : "rgba(180,50,60,0.85)";
      roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,220,180,0.5)";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = '600 15px "IBM Plex Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(b.label, b.x, b.y + 5);
      if (cleared && imgs.flag) ctx.drawImage(imgs.flag, b.x + 28, b.y - 48, 48, 30);
    }
  }

  function drawPopup() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    const pw = 300;
    const ph = 280;
    const px = (W - pw) / 2;
    const py = H * 0.28;
    if (imgs.popup) {
      ctx.drawImage(imgs.popup, px, py, pw, ph);
      ctx.fillStyle = "rgba(20,8,12,0.55)";
      roundRect(px + 20, py + 30, pw - 40, ph - 60, 16);
      ctx.fill();
    } else {
      ctx.fillStyle = "#3a1820";
      roundRect(px, py, pw, ph, 20);
      ctx.fill();
    }

    ctx.fillStyle = "#ffe8d8";
    ctx.font = '600 18px "IBM Plex Sans", sans-serif';
    ctx.textAlign = "center";
    wrapText(state.popupMsg, W / 2, py + 90, 240, 24);

    for (const b of state.buttons) {
      const icon = b.id === "next" || b.id === "replay" ? imgs.next : imgs.cancel;
      if (icon) ctx.drawImage(icon, b.x - 40, b.y - 40, 80, 80);
      else {
        ctx.fillStyle = "#e85a3c";
        roundRect(b.x - 40, b.y - 24, 80, 48, 12);
        ctx.fill();
      }
      ctx.fillStyle = "#fff";
      ctx.font = '600 13px "IBM Plex Sans", sans-serif';
      ctx.fillText(b.label, b.x, b.y + 52);
    }
  }

  function render() {
    if (state.screen === "splash") drawSplash();
    else if (state.screen === "instruct") drawInstruct();
    else if (state.screen === "map") drawMap();
    else if (state.screen === "play" || state.screen === "dead" || state.screen === "win") {
      drawPlay();
      if (state.screen === "dead" || state.screen === "win") drawPopup();
    } else {
      ctx.fillStyle = "#12060c";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Loading…", W / 2, H / 2);
    }
  }

  function handleUiClick(cx, cy) {
    if (state.screen === "splash") {
      const b = buttonAt(cx, cy);
      if (b?.id === "play") {
        state.screen = "map";
        buildMapButtons();
      } else if (b?.id === "instruct") {
        state.screen = "instruct";
        state.buttons = [];
      }
      return true;
    }

    if (state.screen === "instruct") {
      state.screen = "splash";
      buildSplashButtons();
      return true;
    }

    if (state.screen === "map") {
      const b = buttonAt(cx, cy);
      if (!b) return true;
      if (b.id === "back") {
        state.screen = "splash";
        buildSplashButtons();
      } else if (b.id.startsWith("lvl")) {
        resetPlay(Number(b.id.replace("lvl", "")));
      }
      return true;
    }

    if (state.screen === "dead" || state.screen === "win") {
      const b = buttonAt(cx, cy);
      if (!b) return true;
      if (b.id === "replay") resetPlay(state.level);
      else if (b.id === "next") {
        if (state.level < 3) resetPlay(state.level + 1);
        else {
          state.screen = "map";
          buildMapButtons();
        }
      } else if (b.id === "exit") {
        state.screen = "map";
        buildMapButtons();
      }
      return true;
    }

    return false;
  }

  function setPointerFromCanvas(cx, cy) {
    const w = canvasToWorld(cx, cy);
    state.pointerX = clamp(w.x, -2.2, 2.2);
    state.pointerY = clamp(w.y, -5, 5);
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (typeof e.button === "number" && e.button !== 0) return;
    const { x, y } = eventToCanvas(e);
    if (handleUiClick(x, y)) return;
    if (state.screen === "play") {
      setPointerFromCanvas(x, y);
      tryFireBullet();
    }
  }

  function onPointerMove(e) {
    if (state.screen !== "play") return;
    e.preventDefault();
    const { x, y } = eventToCanvas(e);
    setPointerFromCanvas(x, y);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.anim += dt;
    if (state.screen === "play") updatePlay(dt);
    render();
    requestAnimationFrame(loop);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function boot() {
    const base = "assets/frames/";
    const [v0, v1, v2, v3, f0, f1, f2, f3, a0, a1, a2, al0, al1, al2] = await Promise.all([
      loadImage(base + "virus_0.png"),
      loadImage(base + "virus_1.png"),
      loadImage(base + "virus_2.png"),
      loadImage(base + "virus_3.png"),
      loadImage(base + "food_0.png"),
      loadImage(base + "food_1.png"),
      loadImage(base + "food_2.png"),
      loadImage(base + "food_3.png"),
      loadImage(base + "anti_0.png"),
      loadImage(base + "anti_1.png"),
      loadImage(base + "anti_2.png"),
      loadImage(base + "ally_0.png"),
      loadImage(base + "ally_1.png"),
      loadImage(base + "ally_2.png"),
    ]);
    imgs.virus = [v0, v1, v2, v3].filter(Boolean);
    imgs.food = [f0, f1, f2, f3].filter(Boolean);
    imgs.anti = [a0, a1, a2].filter(Boolean);
    imgs.ally = [al0, al1, al2].filter(Boolean);

    Object.assign(imgs, {
      bg: await loadImage(base + "bg.png"),
      wall: await loadImage(base + "wall.png"),
      boss: await loadImage(base + "boss.png"),
      nen: await loadImage(base + "nen.png"),
      bodymap: await loadImage(base + "bodymap.png"),
      flag: await loadImage(base + "flag.png"),
      start: await loadImage(base + "start.png"),
      next: await loadImage(base + "next.png"),
      back: await loadImage(base + "back.png"),
      cancel: await loadImage(base + "cancel.png"),
      popup: await loadImage(base + "popup.png"),
    });

    state.screen = "splash";
    buildSplashButtons();
    requestAnimationFrame(loop);
  }

  boot();

  window.__nwo = {
    getState: () => state.screen,
    startLevel: (n) => resetPlay(n || 1),
    setPointer: (wx, wy) => {
      state.pointerX = clamp(wx, -2.2, 2.2);
      state.pointerY = clamp(wy, -5, 5);
    },
    fire: () => tryFireBullet(),
    bullets: () => state.bullets.length,
    player: () => (state.player ? { x: state.player.x, y: state.player.y } : null),
    enemies: () => state.enemies.map((e) => ({ x: e.x, y: e.y, hp: e.hp })),
    boss: () => (state.boss ? { hp: state.boss.hp, life: state.boss.life, alive: state.boss.alive } : null),
    // Deprecated hold-to-fly harness; kept as no-op for any external callers.
    hold: () => {},
    click: (cx, cy) => handleUiClick(cx, cy),
  };
})();
