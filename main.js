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
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// ---------- GROUND ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x3cb371 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- PLAYER ----------
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff5533 })
);
player.position.y = 0.5;
player.castShadow = true;
scene.add(player);

// ---------- OBSTACLES ----------
for (let i = 0; i < 8; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
    })
  );
  box.position.set(
    (Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30
  );
  box.castShadow = true; box.receiveShadow = true;
  scene.add(box);
}

// ---------- PHYSICS STATE ----------
const velocity = new THREE.Vector3();
const GRAVITY = 25, JUMP_SPEED = 9, MOVE_SPEED = 6;
let onGround = true;

// ---------- INPUT: KEYBOARD ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- INPUT: TOUCH BUTTONS ----------
// Gán class "held" khi chạm giữ nút
function bindHold(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const setOn = (v) => el.dataset.on = v ? '1' : '0';
  el.addEventListener('touchstart', (e) => { e.preventDefault(); setOn(true); }, { passive: false });
  el.addEventListener('touchend',   (e) => { e.preventDefault(); setOn(false); }, { passive: false });
  el.addEventListener('touchcancel',(e) => { setOn(false); });
  el.addEventListener('mousedown',  (e) => { e.preventDefault(); setOn(true); });
  el.addEventListener('mouseup',    (e) => { setOn(false); });
  el.addEventListener('mouseleave', (e) => { setOn(false); });
}
['btn-up','btn-down','btn-left','btn-right','btn-jump'].forEach(bindHold);

const touchState = {
  up:    () => document.getElementById('btn-up')?.dataset.on === '1',
  down:  () => document.getElementById('btn-down')?.dataset.on === '1',
  left:  () => document.getElementById('btn-left')?.dataset.on === '1',
  right: () => document.getElementById('btn-right')?.dataset.on === '1',
  jump:  () => document.getElementById('btn-jump')?.dataset.on === '1',
};

// ---------- CAMERA ORBIT (chuột + chạm) ----------
let camYaw = 0, camPitch = 0.35;
let isDragging = false, lastX = 0, lastY = 0;

function startDrag(x, y) { isDragging = true; lastX = x; lastY = y; }
function moveDrag(x, y) {
  if (!isDragging) return;
  camYaw   -= (x - lastX) * 0.005;
  camPitch -= (y - lastY) * 0.005;
  camPitch = Math.max(-0.2, Math.min(1.2, camPitch));
  lastX = x; lastY = y;
}
function endDrag() { isDragging = false; }

// Chuột
renderer.domElement.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
window.addEventListener('mouseup', endDrag);
window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));

// Chạm (1 ngón = xoay camera)
renderer.domElement.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  startDrag(t.clientX, t.clientY);
}, { passive: true });
renderer.domElement.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  moveDrag(t.clientX, t.clientY);
}, { passive: true });
renderer.domElement.addEventListener('touchend', endDrag);

// ---------- LOOP ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Hướng theo camera
  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right   = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

  // Gộp input: bàn phím + nút cảm ứng
  const move = new THREE.Vector3();
  if (keys['KeyW'] || touchState.up())    move.add(forward);
  if (keys['KeyS'] || touchState.down())  move.sub(forward);
  if (keys['KeyD'] || touchState.right()) move.add(right);
  if (keys['KeyA'] || touchState.left())  move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(MOVE_SPEED * dt);
    player.position.add(move);
    player.rotation.y = Math.atan2(move.x, move.z);
  }

  // Trọng lực
  velocity.y -= GRAVITY * dt;
  player.position.y += velocity.y * dt;

  if (player.position.y <= 0.5) {
    player.position.y = 0.5;
    velocity.y = 0;
    onGround = true;
  }

  // Nhảy: bàn phím hoặc nút cảm ứng
  if ((keys['Space'] || touchState.jump()) && onGround) {
    velocity.y = JUMP_SPEED;
    onGround = false;
  }

  // Giới hạn map
  player.position.x = THREE.MathUtils.clamp(player.position.x, -45, 45);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -45, 45);

  // Camera third-person
  const camDist = 10, camHeight = 6;
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
