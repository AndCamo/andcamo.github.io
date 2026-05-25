const ASCII_CHARS = "░▒▓█<>/\\|?*!@#$%^&()_+-=[]{}";

function randomChar() {
  return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
}

const canvas = document.getElementById("ascii-glitch");
const ctx = canvas.getContext("2d");

let width, height;
let mouseX = -1000;
let mouseY = -1000;

let lastTime = 0;
const fps = 20;              
const frameDelay = 1000 / fps;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

resize();
window.addEventListener("resize", resize);

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

const bgChars = [];

function spawnBgChar() {
  bgChars.push({
    x: Math.random() * width,
    y: Math.random() * height,
    char: randomChar(),
    life: Math.random() * 40 + 10,
  });
}

function draw(timestamp) {
  if (timestamp - lastTime < frameDelay) {
    requestAnimationFrame(draw);
    return;
  }

  lastTime = timestamp;
  ctx.clearRect(0, 0, width, height);

  // ASCII sullo sfondo
  if (Math.random() < 0.8) spawnBgChar();

  const styles = getComputedStyle(document.body);
  const asciiColor = styles.getPropertyValue('--ascii-color').trim();
  const asciiOpacity = styles.getPropertyValue('--ascii-opacity').trim();

  ctx.font = "12px monospace";
  ctx.fillStyle = `rgba(${asciiColor}, ${asciiOpacity})`;

  for (let i = bgChars.length - 1; i >= 0; i--) {
    const c = bgChars[i];
    ctx.fillText(c.char, c.x, c.y);
    c.life -= 1;
    if (c.life <= 0) bgChars.splice(i, 1);
  }

  // Glitch attorno al cursore
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 32;
    const x = mouseX + Math.cos(angle) * radius;
    const y = mouseY + Math.sin(angle) * radius;

    ctx.fillStyle = `rgba(${asciiColor}, ${parseFloat(asciiOpacity) * 4.5})`;
    ctx.fillText(randomChar(), x, y);
  }

  requestAnimationFrame(draw);
}

draw();
