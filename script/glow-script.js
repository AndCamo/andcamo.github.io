const GLOW_CHARS = "░▒▓█";
const glowCanvas = document.getElementById("ascii-glow");
const gctx = glowCanvas.getContext("2d");
const target = document.getElementById("header-container");

let gWidth, gHeight;
let hue = 0;

function resizeGlow() {
  gWidth = glowCanvas.width = window.innerWidth;
  gHeight = glowCanvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeGlow);
resizeGlow();

function drawGlow(timestamp) {
  gctx.clearRect(0, 0, gWidth, gHeight);

  if (!target) {
    requestAnimationFrame(drawGlow);
    return;
  }

  const rect = target.getBoundingClientRect();
  const time = timestamp * 0.001;
  
  // Breathing effect: oscillate glow radius/intensity
  const breath = (Math.sin(time * 1.5) + 1) / 2; // 0 to 1, slower pulse
  const maxPadding = 40;
  const currentPadding = 10 + breath * maxPadding;
  
  hue = (timestamp * 0.1) % 360; // Time-based hue shift

  gctx.font = "16px monospace";
  gctx.textAlign = "center";
  gctx.textBaseline = "middle";
  
  const stepX = 14; 
  const stepY = 18; 
  
  // Calculate grid bounds
  const startX = Math.floor((rect.left - maxPadding - 20) / stepX) * stepX;
  const endX = Math.ceil((rect.right + maxPadding + 20) / stepX) * stepX;
  const startY = Math.floor((rect.top - maxPadding - 20) / stepY) * stepY;
  const endY = Math.ceil((rect.bottom + maxPadding + 20) / stepY) * stepY;

  for (let x = startX; x <= endX; x += stepX) {
    for (let y = startY; y <= endY; y += stepY) {
      // Skip if clearly inside the container (with a small margin to be safe)
      if (x > rect.left + 5 && x < rect.right - 5 && y > rect.top + 5 && y < rect.bottom - 5) {
        continue;
      }

      // Calculate distance to the nearest edge of the rect
      const dx = Math.max(rect.left - x, 0, x - rect.right);
      const dy = Math.max(rect.top - y, 0, y - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < currentPadding) {
        // Use coordinates to seed randomness so characters are stable-ish
        const seed = Math.sin(x * 0.1) + Math.cos(y * 0.1) + time;
        const charIdx = Math.floor((Math.abs(Math.sin(x + y)) * 100)) % GLOW_CHARS.length;
        const char = GLOW_CHARS[charIdx];
        
        const alpha = (1 - dist / currentPadding) * (0.2 + breath * 0.3);
        
        // Rainbow effect: hue varies by position and time
        const posHue = (hue + dist * 3 + (x + y) * 0.1) % 360;
        gctx.fillStyle = `hsla(${posHue}, 80%, 60%, ${alpha})`;
        gctx.fillText(char, x, y);
      }
    }
  }

  requestAnimationFrame(drawGlow);
}

requestAnimationFrame(drawGlow);
