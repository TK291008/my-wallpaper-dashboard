const trail = document.getElementById("trail");

const segmentCount = 18;
const segments = [];
const positions = [];

const mouse = {
  x: 0,
  y: 0,
  initialized: false
};

let currentSpeed = 0;
let lastMouse = { x: 0, y: 0 };
let lastTime = performance.now();

let isPaused = document.hidden;
let rafId = null;

for (let i = 0; i < segmentCount; i++) {
  const segment = document.createElement("div");

  segment.className = "segment";
  segment.dataset.index = i;

  // Completely invisible until first mouse event
  segment.style.opacity = "0";

  trail.appendChild(segment);
  segments.push(segment);

  positions.push({
    x: 0,
    y: 0
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function revealTrail() {
  segments.forEach(segment => {
    segment.style.opacity = "";
  });
}

function initializeTrail(x, y) {
  mouse.x = x;
  mouse.y = y;

  lastMouse.x = x;
  lastMouse.y = y;
  lastTime = performance.now();

  // Teleport EVERY segment directly onto cursor
  for (const pos of positions) {
    pos.x = x;
    pos.y = y;
  }

  segments.forEach(segment => {
    segment.style.left = `${x}px`;
    segment.style.top = `${y}px`;
  });

  mouse.initialized = true;

  revealTrail();

  if (!isPaused && rafId === null) {
    rafId = requestAnimationFrame(animate);
  }
}

function updateMouse(event) {
  console.log("initialized =", mouse.initialized);

  if (!mouse.initialized) {
    initializeTrail(event.clientX, event.clientY);
    return;
  }

  const now = performance.now();

  const dx = event.clientX - lastMouse.x;
  const dy = event.clientY - lastMouse.y;

  const distance = Math.hypot(dx, dy);
  const dt = Math.max(1, now - lastTime);

  currentSpeed = clamp(distance / dt * 16, 0, 60);

  mouse.x = event.clientX;
  mouse.y = event.clientY;

  lastMouse.x = mouse.x;
  lastMouse.y = mouse.y;
  lastTime = now;
}

function pauseAnimation() {

  if (isPaused) return;

  isPaused = true;
  document.body.classList.add("paused");

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function resumeAnimation() {

  if (!isPaused) return;

  isPaused = false;
  document.body.classList.remove("paused");

  lastTime = performance.now();

  // Don't animate until we've seen a real mouse position.
  if (mouse.initialized && rafId === null) {
    rafId = requestAnimationFrame(animate);
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    pauseAnimation();
  } else {
    resumeAnimation();
  }
}

window.addEventListener("pointermove", updateMouse);

window.addEventListener("resize", () => {

  if (!mouse.initialized) return;

  mouse.x = clamp(mouse.x, 0, window.innerWidth);
  mouse.y = clamp(mouse.y, 0, window.innerHeight);

  lastMouse.x = mouse.x;
  lastMouse.y = mouse.y;
});

window.addEventListener("blur", pauseAnimation);
window.addEventListener("focus", resumeAnimation);

document.addEventListener("visibilitychange", handleVisibilityChange);

function animate() {
  console.log("animate");
  rafId = null;

  if (isPaused || !mouse.initialized) return;

  let totalDistance = 0;
  let count = 0;

  positions[0].x += (mouse.x - positions[0].x) * 0.25;
  positions[0].y += (mouse.y - positions[0].y) * 0.25;

  for (let i = 1; i < segmentCount; i++) {

    const previous = positions[i - 1];
    const current = positions[i];

    const ease = 0.12 + i * 0.01;

    current.x += (previous.x - current.x) * ease;
    current.y += (previous.y - current.y) * ease;

    const distance = Math.hypot(
      previous.x - current.x,
      previous.y - current.y
    );

    totalDistance += distance;
    count++;
  }

  const averageDistance = count ? totalDistance / count : 0;
  const stretched = averageDistance > 25 || currentSpeed > 10;

  segments.forEach((segment, index) => {

    const { x, y } = positions[index];

    segment.style.left = `${x}px`;
    segment.style.top = `${y}px`;

    segment.classList.toggle("head", index === 0 || index === 1);
    segment.classList.toggle("fins", index === 8 || index === 14);

    if (
      index !== 0 &&
      index !== 1 &&
      index !== 8 &&
      index !== 14
    ) {
      segment.classList.toggle("stretched", stretched);
      segment.classList.toggle("collapsed", !stretched);
    }
  });

  rafId = requestAnimationFrame(animate);
}

// Never start rendering until the first real pointer event.
if (isPaused) {
  pauseAnimation();
}