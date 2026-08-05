// PARTICLES
// Create a global gsap timeline that contains all motion
const tl = gsap.timeline({
  repeat: 1,
  yoyo: true
});

const path = document.querySelector("path");
const length = path.getTotalLength();
const vertices = [];

for (let i = 0; i < length; i += 10.1) {
  const point = path.getPointAtLength(i);
  const vector = new THREE.Vector3(point.x, point.y, 0);

  vector.x += (Math.random() - 0.5) * 30;
  vector.y += (Math.random() - 0.5) * 30;
  vector.z += (Math.random() - 0.5) * 70;

  vertices.push(vector);
}

// Create a tween for that vector
tl.from(vector, {
  x: 1500 / 2,
  y: -552 / 2,
  ease: "power2.inOut",
  duration: gsap.utils.random(2, 5)
});