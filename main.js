import * as THREE from 'three';

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 6, 10);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- LIGHT ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// ---------- GROUND ----------
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3cb371 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- PLAYER ----------
const playerGeo = new THREE.BoxGeometry(1, 1, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff5533 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 0.5;
player.castShadow = true;
scene.add(player);

// ---------- OBSTACLES (vài khối để nhìn cho vui) ----------
for (let i = 0; i < 8; i++) {
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(
    (Math.random() - 0.5) * 30,
    0.5,
    (Math.random() - 0.5) * 30
  );
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
}

// ---------- PHYSICS STATE ----------
const velocity = new THREE.Vector3();
const GRAVITY = 25;
const JUMP_SPEED = 9;
const MOVE_SPEED = 6;
let onGround = true;

// ---------- INPUT ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- CAMERA ORBIT (chuột) ----------
let camYaw = 0;
let camPitch = 0.35;
let isDragging = false;
let lastX = 0, lastY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  camYaw -= (e.clientX - lastX) * 0.005;
  camPitch -= (e.clientY - lastY) * 0.005;
  camPitch = Math.max(-0.2, Math.min(1.2, camPitch));
  lastX = e.clientX; lastY = e.clientY;
});

// ---------- LOOP ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Hướng di chuyển theo camera
  const forward = new THREE.Vector3(
    Math.sin(camYaw), 0, Math.cos(camYaw)
  );
  const right = new THREE.Vector3(
    Math.cos(camYaw), 0, -Math.sin(camYaw)
  );

  const move = new THREE.Vector3();
  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyA']) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(MOVE_SPEED * dt);
    player.position.add(move);
    // xoay nhân vật theo hướng đi
    player.rotation.y = Math.atan2(move.x, move.z);
  }

  // Trọng lực & nhảy
  velocity.y -= GRAVITY * dt;
  player.position.y += velocity.y * dt;

  if (player.position.y <= 0.5) {
    player.position.y = 0.5;
    velocity.y = 0;
    onGround = true;
  }

  if (keys['Space'] && onGround) {
    velocity.y = JUMP_SPEED;
    onGround = false;
  }

  // Giới hạn map
  player.position.x = THREE.MathUtils.clamp(player.position.x, -45, 45);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -45, 45);

  // Camera theo player (third-person)
  const camDist = 10;
  const camHeight = 6;
  camera.position.x = player.position.x - Math.sin(camYaw) * camDist * Math.cos(camPitch);
  camera.position.z = player.position.z - Math.cos(camYaw) * camDist * Math.cos(camPitch);
  camera.position.y = player.position.y + camHeight * Math.sin(camPitch) + 2;
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

  renderer.render(scene, camera);
}

animate();

// ---------- RESIZE ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
