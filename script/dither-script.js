// Dither page effects:
//  - .dither-bar      -> ░▒▓█ gradients built with ordered (Bayer) dithering
//  - .dither-cover    -> project images re-drawn live as shaded ascii
(() => {
  // 4x4 Bayer matrix, normalised to [0, 1)
  const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ].map((row) => row.map((v) => v / 16));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cssTriplet(name, fallback) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
  }

  // ------------------------------------------------------------------
  // Dither gradient bars
  // ------------------------------------------------------------------
  const BLOCKS = [" ", "░", "▒", "▓", "█"];
  const measureCtx = document.createElement("canvas").getContext("2d");

  function charWidth(el) {
    const cs = getComputedStyle(el);
    measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return measureCtx.measureText("█").width || 6;
  }

  const bars = [...document.querySelectorAll(".dither-bar")].map((el) => ({
    el,
    rows: parseInt(el.dataset.rows || "2", 10),
    animated: el.dataset.animated !== undefined && !reduceMotion,
    cols: 0,
  }));

  function sizeBars() {
    bars.forEach((b) => {
      b.cols = Math.max(1, Math.floor(b.el.clientWidth / charWidth(b.el)));
    });
  }

  function drawBar(b, t) {
    const lines = [];
    for (let y = 0; y < b.rows; y++) {
      let line = "";
      for (let x = 0; x < b.cols; x++) {
        const u = x / b.cols;
        let d = Math.pow(1 - u, 1.35);
        if (b.animated) d += 0.09 * Math.sin(u * 9 - t * 0.0012 + y * 0.6);
        const level = Math.floor(d * (BLOCKS.length - 1) + BAYER[y & 3][x & 3]);
        line += BLOCKS[Math.max(0, Math.min(BLOCKS.length - 1, level))];
      }
      lines.push(line);
    }
    b.el.textContent = lines.join("\n");
  }

  // ------------------------------------------------------------------
  // ASCII covers
  // ------------------------------------------------------------------
  // Presets picked with data-ascii="<name>" on the cover (empty = default)
  const PRESETS = {
    // shaded objects: big cells, alphanumeric glyphs (mirrors the gear.gif look)
    default: {
      cellW: 6,
      cellH: 10,
      font: '500 10px "IBM Plex Mono", monospace',
      glyphs: ["", ".:'`,-", "-=+~<>/\\|()", "iltfjc[]{}?*1", "eonuxZ53FCP#"],
      mutation: 0.025,
      breathe: 0.05,
      darkInk: false,
      contrast: (v) => v,
    },
    // logos with lettering / fine details: finer grid, classic ascii-art ramp,
    // harder contrast and steadier glyphs so text stays readable
    logo: {
      cellW: 4,
      cellH: 7,
      font: '600 6.5px "IBM Plex Mono", monospace',
      glyphs: ["", ".'`", ":-~", "+=*o", "#@%&8"],
      mutation: 0.006,
      breathe: 0,
      darkInk: true, // on light backgrounds, ink = how much darker than the bg (lettering, outlines)
      contrast: (v) => Math.max(0, Math.min(1, (v - 0.12) / 0.6)),
    },
  };
  const ALPHA = [0, 0.16, 0.34, 0.6, 0.95];
  const LEVELS = ALPHA.length - 1;

  const covers = [];

  function sampleImage(img, preset, cols, rows, boxW, boxH) {
    // Background estimate from the corners decides how "ink" is measured
    const probe = document.createElement("canvas");
    probe.width = probe.height = 16;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    pctx.drawImage(img, 0, 0, 16, 16);
    const p = pctx.getImageData(0, 0, 16, 16).data; // throws on tainted canvas (file://)
    const corner = [0, 15, 240, 255].map((i) => p.slice(i * 4, i * 4 + 4));
    const bg = [0, 1, 2, 3].map((k) => corner.reduce((s, c) => s + c[k], 0) / 4 / 255);
    const transparentBg = bg[3] < 0.5;

    // Fit (contain) the image inside the cover box, then map to the cell grid
    const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight) * 0.94;
    const dw = (img.naturalWidth * scale) / preset.cellW;
    const dh = (img.naturalHeight * scale) / preset.cellH;
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.imageSmoothingQuality = "high";
    octx.drawImage(img, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
    const data = octx.getImageData(0, 0, cols, rows).data;

    const ink = new Float32Array(cols * rows);
    for (let i = 0; i < ink.length; i++) {
      const r = data[i * 4] / 255;
      const g = data[i * 4 + 1] / 255;
      const b = data[i * 4 + 2] / 255;
      const a = data[i * 4 + 3] / 255;
      let v;
      if (transparentBg) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        v = a * (0.3 + 0.7 * lum);
      } else {
        const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]) / Math.sqrt(3);
        if (preset.darkInk) {
          const bgLum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          v = a * Math.min(1, Math.max(0, bgLum - lum) * 1.5 + dist * 0.6);
        } else {
          v = a * Math.min(1, dist * 2.6);
        }
      }
      ink[i] = Math.pow(v, 0.8);
    }

    // Stretch contrast so the brightest area always reaches the densest glyphs
    let max = 0;
    for (let i = 0; i < ink.length; i++) max = Math.max(max, ink[i]);
    if (max > 0) for (let i = 0; i < ink.length; i++) ink[i] = preset.contrast(ink[i] / max);

    // Reinforce silhouettes: cells on a shape edge get brighter
    const out = Float32Array.from(ink);
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        const edge = Math.max(
          Math.abs(ink[i] - ink[i - 1]), Math.abs(ink[i] - ink[i + 1]),
          Math.abs(ink[i] - ink[i - cols]), Math.abs(ink[i] - ink[i + cols])
        );
        if (ink[i] > 0.05) out[i] = Math.min(1, ink[i] + edge * 0.45);
      }
    }
    return out;
  }

  function buildCover(cover) {
    const img = cover.img;
    const rect = cover.el.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (!w || !h || !img.naturalWidth) return;

    const { cellW, cellH } = cover.preset;
    const cols = Math.floor(w / cellW);
    const rows = Math.floor(h / cellH);
    let ink;
    try {
      ink = sampleImage(img, cover.preset, cols, rows, cols * cellW, rows * cellH);
    } catch (e) {
      // Cross-origin / file:// canvas: keep the plain <img> fallback
      cover.failed = true;
      cover.el.classList.remove("is-ascii");
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    cover.canvas.width = w * dpr;
    cover.canvas.height = h * dpr;
    cover.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cover.cols = cols;
    cover.rows = rows;
    cover.ox = (w - cols * cellW) / 2;
    cover.oy = (h - rows * cellH) / 2;
    cover.ink = ink;
    cover.seed = Float32Array.from({ length: cols * rows }, Math.random);
    cover.el.classList.add("is-ascii");
    drawCover(cover, performance.now());
  }

  function drawCover(c, t) {
    if (!c.ink) return;
    const { ctx, cols, rows, ink, seed } = c;
    const { cellW, cellH, font, glyphs, breathe } = c.preset;
    const rgb = cssTriplet("--dither-ink", "200,220,220");
    const accent = cssTriplet("--dither-accent", rgb);
    ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
    ctx.font = font;
    ctx.textBaseline = "top";

    // intro scan: rows are revealed top -> bottom, the leading edge glitches
    const revealRow = c.revealStart == null ? rows + 4 : ((t - c.revealStart) / 900) * (rows + 4);
    const buckets = [[], [], [], [], []];
    const lit = [[], [], [], [], []]; // cells tinted with the page colour

    for (let y = 0; y < rows; y++) {
      if (y > revealRow) break;
      const edge = revealRow - y < 2;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let v = ink[i];
        let tinted = edge;

        // slow breathing so the dither boundary shimmers like the gif
        if (!reduceMotion && breathe && v > 0.03) v += breathe * Math.sin(t * 0.0016 + x * 0.31 + y * 0.53);

        // cursor torch
        if (c.mx != null) {
          const dx = c.ox + x * cellW - c.mx;
          const dy = c.oy + y * cellH - c.my;
          const fall = 1 - Math.hypot(dx, dy) / 95;
          if (fall > 0) {
            v += fall * (ink[i] > 0.03 ? 0.4 : 0.22);
            // dithered colour falloff around the cursor
            tinted = fall * 1.6 > BAYER[y & 3][x & 3];
          }
        }

        let level = Math.floor(v * LEVELS + BAYER[y & 3][x & 3]);
        if (edge && ink[i] > 0.03) level = LEVELS;
        level = Math.max(0, Math.min(LEVELS, level));
        if (level) (tinted ? lit : buckets)[level].push(x, y, i);
      }
    }

    for (let l = 1; l <= LEVELS; l++) {
      const set = glyphs[l];
      [[buckets[l], rgb], [lit[l], accent]].forEach(([b, color]) => {
        if (!b.length) return;
        ctx.fillStyle = `rgba(${color}, ${ALPHA[l]})`;
        for (let k = 0; k < b.length; k += 3) {
          const ch = set[Math.floor(seed[b[k + 2]] * set.length)];
          ctx.fillText(ch, c.ox + b[k] * cellW, c.oy + b[k + 1] * cellH);
        }
      });
    }
  }

  function mutate(c) {
    if (!c.seed) return;
    const rate = c.mx != null ? 0.12 : c.preset.mutation;
    for (let i = 0; i < c.seed.length; i++) {
      if (Math.random() < rate) c.seed[i] = Math.random();
    }
  }

  document.querySelectorAll(".dither-cover[data-ascii]").forEach((el) => {
    const img = el.querySelector("img");
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
    const preset = PRESETS[el.dataset.ascii] || PRESETS.default;
    const cover = { el, img, canvas, ctx: canvas.getContext("2d"), preset, visible: false, mx: null, my: null };
    covers.push(cover);

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      cover.mx = e.clientX - r.left;
      cover.my = e.clientY - r.top;
    });
    el.addEventListener("pointerleave", () => {
      cover.mx = cover.my = null;
    });

    const ready = () => document.fonts.ready.then(() => buildCover(cover));
    if (img.complete && img.naturalWidth) ready();
    else img.addEventListener("load", ready, { once: true });
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const c = covers.find((cv) => cv.el === entry.target);
        if (!c) return;
        c.visible = entry.isIntersecting;
        if (c.visible && c.revealStart == null && !reduceMotion) c.revealStart = performance.now();
      });
    },
    { threshold: 0.15 }
  );
  covers.forEach((c) => io.observe(c.el));

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeBars();
      bars.forEach((b) => drawBar(b, performance.now()));
      covers.forEach((c) => !c.failed && buildCover(c));
    }, 150);
  });

  // ------------------------------------------------------------------
  // Main loop (~15 fps, only for what is on screen)
  // ------------------------------------------------------------------
  document.fonts.ready.then(() => {
    sizeBars();
    bars.forEach((b) => drawBar(b, 0));
    if (reduceMotion) return;

    let last = 0;
    function tick(t) {
      requestAnimationFrame(tick);
      if (t - last < 66 || document.hidden) return;
      last = t;
      bars.forEach((b) => b.animated && drawBar(b, t));
      covers.forEach((c) => {
        if (!c.visible || !c.ink) return;
        mutate(c);
        drawCover(c, t);
      });
    }
    requestAnimationFrame(tick);
  });
})();
