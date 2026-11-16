// ===== F1 ASCII SCENE =====
// Lights out sequence -> car racing on a scrolling track with telemetry HUD.

const F1_GLITCH_CHARS = "░▒▓█<>/\\|?*!@#$%^&()_+-=[]{}";

function f1RandomChar() {
  return F1_GLITCH_CHARS[Math.floor(Math.random() * F1_GLITCH_CHARS.length)];
}

(() => {
  const el = document.getElementById("f1-scene");
  if (!el) return;

  const COLS = 64;
  const ROWS = 14;
  const CAR_X = 7;
  const CAR_Y = 2;
  const HUD_Y = 13;

  const CAR = [
    String.raw`  ______                                          `,
    String.raw` |______|                 _                        `,
    String.raw`    ||                  _/o\_                      `,
    String.raw`    ||_________________/     \_____________        `,
    String.raw`   _||   .---.   </>                .---.  ` + "``" + String.raw`--.__  `,
    String.raw`  [__|__/  W  \____________________/  W  \_______=> `,
    String.raw`        \     /                    \     /         `,
    String.raw`         ` + "`" + String.raw`---'                      ` + "`" + String.raw`---'          `,
  ];

  // Colour mask: wheels -> tyre, "</>" and helmet -> yellow, everything else -> red
  const CAR_MASK = CAR.map(row => row.split("").map(ch => (ch === " " ? null : "f-red")));
  CAR.forEach((row, y) => {
    for (const m of row.matchAll(/W/g)) {
      for (let dy = -1; dy <= 2; dy++)
        for (let dx = -3; dx <= 3; dx++)
          if (CAR_MASK[y + dy]) CAR_MASK[y + dy][m.index + dx] = CAR[y + dy][m.index + dx] === " " ? "fill" : "f-tyre";
    }
    for (const m of row.matchAll(/<\/>|o/g)) {
      for (let dx = 0; dx < m[0].length; dx++) CAR_MASK[y][m.index + dx] = "f-yel";
    }
  });
  // Make the body opaque so speed streaks pass behind it, not through it
  for (let y = 3; y <= 5; y++) {
    const row = CAR[y];
    for (let x = row.search(/\S/); x < row.trimEnd().length; x++) {
      if (!CAR_MASK[y][x]) CAR_MASK[y][x] = "fill";
    }
  }

  const WHEEL_SPIN = "|/-\\";
  const SKYLINE = buildSkyline(240);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // State
  let phase = "idle"; // idle -> lights -> race
  let phaseStart = 0;
  let lightsOutAt = 0;
  let speed = 0;
  let offset = 0;
  let wheel = 0;
  let lapStart = 0;
  let boost = false;
  let glitch = null;
  let lastTime = 0;
  const streaks = [];

  let chars, classes;

  function buildSkyline(len) {
    let s = "";
    while (s.length < len) {
      const r = Math.random();
      if (r < 0.25) s += "_|‾‾|_";
      else if (r < 0.4) s += "_/‾‾‾\\_";
      else if (r < 0.55) s += "__[]__";
      else s += "_".repeat(2 + Math.floor(Math.random() * 6));
    }
    return s.slice(0, len);
  }

  function clear() {
    chars = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));
    classes = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function put(x, y, str, cls) {
    if (y < 0 || y >= ROWS) return;
    for (let i = 0; i < str.length; i++) {
      const cx = x + i;
      if (cx < 0 || cx >= COLS) continue;
      chars[y][cx] = str[i];
      classes[y][cx] = cls;
    }
  }

  function drawCar(x, y) {
    const spin = WHEEL_SPIN[Math.floor(wheel) % WHEEL_SPIN.length];
    CAR.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const cls = CAR_MASK[ry][rx];
        if (!cls) continue;
        if (cls === "fill") put(x + rx, y + ry, " ", null);
        else put(x + rx, y + ry, row[rx] === "W" ? spin : row[rx], cls);
      }
    });
  }

  function drawTrack() {
    // Skyline (parallax, slow)
    for (let x = 0; x < COLS; x++) {
      const i = Math.floor(x + offset * 0.15) % SKYLINE.length;
      put(x, 0, SKYLINE[i], "f-dim");
    }
    // Kerb (red / white blocks)
    for (let x = 0; x < COLS; x++) {
      const seg = Math.floor((x + offset) / 3) % 2;
      put(x, CAR_Y + CAR.length, "▀", seg === 0 ? "f-red" : "f-white");
    }
    // Asphalt texture
    for (let x = 0; x < COLS; x++) {
      const n = Math.sin((Math.floor(x + offset * 1.3)) * 12.9898) * 43758.5453;
      const v = n - Math.floor(n);
      put(x, CAR_Y + CAR.length + 1, v < 0.08 ? "·" : v < 0.12 ? "." : " ", "f-dim");
    }
  }

  function drawStreaks(dt) {
    const spawnRate = speed / 320;
    if (Math.random() < spawnRate * 0.3) {
      streaks.push({
        x: COLS,
        y: CAR_Y + 1 + Math.floor(Math.random() * (CAR.length - 1)),
        len: 3 + Math.floor(Math.random() * 8),
        ch: Math.random() < 0.5 ? "-" : "=",
      });
    }
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.x -= speed * dt * 0.12;
      if (s.x + s.len < 0) {
        streaks.splice(i, 1);
        continue;
      }
      put(Math.floor(s.x), s.y, s.ch.repeat(s.len), "f-dim");
    }
  }

  function drawLights(now) {
    const n = phase === "lights" ? Math.min(5, Math.floor((now - phaseStart) / 650)) : 0;
    const startX = Math.floor((COLS - 37) / 2);
    for (let i = 0; i < 5; i++) {
      const x = startX + i * 8;
      put(x, 3, ".---.", "f-dim");
      put(x, 4, "|   |", "f-dim");
      put(x, 5, "|   |", "f-dim");
      put(x, 6, "'---'", "f-dim");
      const on = i < n;
      put(x + 2, 4, on ? "●" : "○", on ? "f-red f-light" : "f-dim");
      put(x + 2, 5, on ? "●" : "○", on ? "f-red f-light" : "f-dim");
    }
    const label = phase === "idle" ? "[ waiting for grid ]" : "[ formation lap complete ]";
    put(Math.floor((COLS - label.length) / 2), 9, label, "f-dim");
  }

  function drawDecodedText(text, y, progress, cls) {
    const x = Math.floor((COLS - text.length) / 2);
    const revealed = Math.floor(text.length * progress);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i] === " " ? " " : i < revealed ? text[i] : f1RandomChar();
      put(x + i, y, ch, i < revealed ? cls : "f-glitch");
    }
  }

  function drawHud(now) {
    const thresholds = [0, 90, 130, 170, 210, 250, 290, 330];
    let gear = 1;
    for (let g = 1; g < thresholds.length; g++) if (speed >= thresholds[g]) gear = g + 1;
    gear = Math.min(gear, 8);
    const lo = thresholds[gear - 1];
    const hi = thresholds[gear] || 360;
    const rpm = 0.35 + 0.65 * Math.min(1, (speed - lo) / (hi - lo));
    const cells = 12;
    const filled = Math.round(rpm * cells);

    const lapMs = phase === "race" ? now - lapStart : 0;
    const min = Math.floor(lapMs / 60000);
    const sec = String(Math.floor((lapMs % 60000) / 1000)).padStart(2, "0");
    const ms = String(Math.floor(lapMs % 1000)).padStart(3, "0");

    let x = 0;
    const seg = (str, cls) => { put(x, HUD_Y, str, cls); x += str.length; };
    seg("GEAR ", "f-dim");
    seg(String(gear), "f-yel");
    seg(" │ ", "f-dim");
    seg(String(Math.round(speed)).padStart(3, " "), "f-white");
    seg(" km/h", "f-dim");
    seg(" │ RPM ", "f-dim");
    for (let i = 0; i < cells; i++) {
      const cls = i >= filled ? "f-dim" : i >= 10 ? "f-red" : i >= 7 ? "f-yel" : "f-green";
      seg(i < filled ? "█" : "░", cls);
    }
    seg(" │ DRS ", "f-dim");
    seg(boost && phase === "race" ? "ON " : "OFF", boost && phase === "race" ? "f-green" : "f-dim");
    seg(" │ ", "f-dim");
    seg(`${min}:${sec}.${ms}`, "f-white");
  }

  function applyGlitch() {
    if (!glitch && Math.random() < 0.015) {
      glitch = {
        row: Math.floor(Math.random() * (ROWS - 1)),
        shift: Math.floor(Math.random() * 7) - 3,
        ttl: 3 + Math.floor(Math.random() * 4),
      };
    }
    if (!glitch) {
      el.classList.remove("f1-glitching");
      return;
    }
    el.classList.add("f1-glitching");
    const rowChars = chars[glitch.row].slice();
    const rowCls = classes[glitch.row].slice();
    for (let x = 0; x < COLS; x++) {
      const src = x - glitch.shift;
      const inRange = src >= 0 && src < COLS;
      chars[glitch.row][x] = inRange ? rowChars[src] : " ";
      classes[glitch.row][x] = inRange ? rowCls[src] : null;
      if (chars[glitch.row][x] !== " " && Math.random() < 0.15) {
        chars[glitch.row][x] = f1RandomChar();
        classes[glitch.row][x] = "f-glitch";
      }
    }
    if (--glitch.ttl <= 0) glitch = null;
  }

  function escapeHtml(ch) {
    return ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;
  }

  function render() {
    let html = "";
    for (let y = 0; y < ROWS; y++) {
      let current = undefined;
      for (let x = 0; x < COLS; x++) {
        const cls = classes[y][x];
        if (cls !== current) {
          if (current) html += "</span>";
          if (cls) html += `<span class="${cls}">`;
          current = cls;
        }
        html += escapeHtml(chars[y][x]);
      }
      if (current) html += "</span>";
      if (y < ROWS - 1) html += "\n";
    }
    el.innerHTML = html;
  }

  function fit() {
    const w = el.parentElement.clientWidth;
    const fontSize = Math.max(6, Math.min(14, w / (COLS * 0.61)));
    el.style.fontSize = fontSize + "px";
    el.style.lineHeight = fontSize * 1.15 + "px";
  }

  function frame(now) {
    const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
    lastTime = now;
    clear();

    if (phase === "lights" && now - phaseStart > 650 * 5 + lightsOutAt) {
      phase = "race";
      phaseStart = now;
      lapStart = now;
    }

    if (phase === "race") {
      const target = boost ? 342 : 305;
      speed += (target - speed) * dt * (speed < 200 ? 0.9 : 0.5) + (Math.random() - 0.5) * 2;
      speed = Math.max(0, speed);
      offset += speed * dt * 0.12;
      wheel += speed * dt * 0.15;

      drawTrack();
      drawStreaks(dt);
      const jitter = speed > 280 && Math.random() < 0.08 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      drawCar(CAR_X + jitter, CAR_Y);

      const since = now - phaseStart;
      if (since < 2200) {
        drawDecodedText("LIGHTS OUT AND AWAY WE GO", CAR_Y + CAR.length + 2, Math.min(1, since / 900), "f-red");
      }
    } else {
      drawLights(now);
    }

    drawHud(now);
    applyGlitch();
    render();

    if (!reducedMotion) requestAnimationFrame(frame);
  }

  function startLights() {
    phase = "lights";
    phaseStart = performance.now();
    lightsOutAt = 300 + Math.random() * 1200; // random hold, like the real start
    speed = 0;
    streaks.length = 0;
  }

  // Init
  fit();
  window.addEventListener("resize", fit);

  if (reducedMotion) {
    phase = "race";
    speed = 305;
    lapStart = performance.now() - 83456;
    phaseStart = -10000;
    frame(performance.now());
    return;
  }

  el.addEventListener("mouseenter", () => (boost = true));
  el.addEventListener("mouseleave", () => (boost = false));
  el.addEventListener("click", startLights);

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && phase === "idle") {
      startLights();
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  observer.observe(el);

  requestAnimationFrame(frame);
})();

// ===== DECODE TEXT EFFECT =====
// Elements with [data-decode] scramble from random chars into their final text.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-decode]").forEach((node, idx) => {
    const finalText = node.textContent;
    const delay = 400 + idx * 350;
    const duration = 900;
    node.textContent = finalText.replace(/\S/g, () => f1RandomChar());

    setTimeout(() => {
      const start = performance.now();
      const step = now => {
        const p = Math.min(1, (now - start) / duration);
        const revealed = Math.floor(finalText.length * p);
        node.textContent = finalText
          .split("")
          .map((ch, i) => (i < revealed || ch === " " ? ch : f1RandomChar()))
          .join("");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
  });
});
