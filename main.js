import * as THREE from 'three';

// ==========================================
// 1. KHỞI TẠO CẢNH (SCENE), CAMERA, RENDERER
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. ÁNH SÁNG & MẶT ĐẤT
// ==========================================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x3cb371 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Vài vật cản (khối hộp) để nhìn cho vui
for (let i = 0; i < 12; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) })
  );
  box.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
  box.castShadow = true; box.receiveShadow = true;
  scene.add(box);
}

// ==========================================
// 3. TẠO NHÂN VẬT NGƯỜI QUE (STICKMAN)
// ==========================================
const player = new THREE.Group();
const mat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4 });

// Đầu
const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat);
head.position.y = 2.2;
head.castShadow = true;
player.add(head);

// Thân
const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), mat);
body.position.y = 1.4;
body.castShadow = true;
player.add(body);

// Tay
const armGeo = new THREE.BoxGeometry(0.15, 0.9, 0.15);
const leftArm = new THREE.Mesh(armGeo, mat);
leftArm.position.set(-0.35, 1.5, 0);
leftArm.rotation.z = 0.2;
leftArm.castShadow = true;
player.add(leftArm);

const rightArm = new THREE.Mesh(armGeo, mat);
rightArm.position.set(0.35, 1.5, 0);
rightArm.rotation.z = -0.2;
rightArm.castShadow = true;
player.add(rightArm);

// Chân
const legGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
const leftLeg = new THREE.Mesh(legGeo, mat);
leftLeg.position.set(-0.15, 0.4, 0);
leftLeg.castShadow = true;
player.add(leftLeg);

const rightLeg = new THREE.Mesh(legGeo, mat);
rightLeg.position.set(0.15, 0.4, 0);
rightLeg.castShadow = true;
player.add(rightLeg);

// Lưu các bộ phận để làm animation
player.userData = { leftArm, rightArm, leftLeg, rightLeg };
scene.add(player);

// ==========================================
// 4. VẬT LÝ & ĐIỀU KHIỂN
// ==========================================
const velocity = new THREE.Vector3();
const GRAVITY = 25, JUMP_SPEED = 10, MOVE_SPEED = 7;
let onGround = true;
let isMoving = false;

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Nút cảm ứng (Sửa lỗi dùng Pointer Events cho mượt)
const touchState = { up: false, down: false, left: false, right: false, jump: false };
function bindButton(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;
  const handleDown = (e) => { e.preventDefault(); touchState[prop] = true; el.style.transform = 'scale(0.9)'; };
  const handleUp = (e) => { e.preventDefault(); touchState[prop] = false; el.style.transform = 'scale(1)'; };
  el.addEventListener('pointerdown', handleDown);
  el.addEventListener('pointerup', handleUp);
  el.addEventListener('pointerleave', handleUp);
  el.addEventListener('pointercancel', handleUp);
}
['up', 'down', 'left', 'right', 'jump'].forEach(p => bindButton(`btn-${p}`, p));

// Xoay Camera bằng cách kéo màn hình
let camYaw = 0, camPitch = 0.35;
let isDragging = false, lastX = 0, lastY = 0;

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.target === renderer.domElement) {
    isDragging = true; lastX = e.clientX; lastY = e.clientY;
  }
});
window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  camYaw -= (e.clientX - lastX) * 0.005;
  camPitch -= (e.clientY - lastY) * 0.005;
  camPitch = Math.max(-0.2, Math.min(1.2, camPitch));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('pointerup', () => { isDragging = false; });
window.addEventListener('pointercancel', () => { isDragging = false; });

// ==========================================
// 5. VÒNG LẶP GAME (GAME LOOP)
// ==========================================
const clock = new THREE.Clock();
let walkTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

  const move = new THREE.Vector3();
  if (keys['KeyW'] || touchState.up) move.add(forward);
  if (keys['KeyS'] || touchState.down) move.sub(forward);
  if (keys['KeyD'] || touchState.right) move.add(right);
  if (keys['KeyA'] || touchState.left) move.sub(right);

  isMoving = move.lengthSq() > 0;

  if (isMoving) {
    move.normalize().multiplyScalar(MOVE_SPEED * dt);
    player.position.add(move);
    player.rotation.y = Math.atan2(move.x, move.z);
  }

  velocity.y -= GRAVITY * dt;
  player.position.y += velocity.y * dt;

  if (player.position.y <= 0) {
    player.position.y = 0;
    velocity.y = 0;
    onGround = true;
  }

  if ((keys['Space'] || touchState.jump) && onGround) {
    velocity.y = JUMP_SPEED;
    onGround = false;
    touchState.jump = false;
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -45, 45);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -45, 45);

  // Animation Người Que
  const parts = player.userData;
  if (isMoving && onGround) {
    walkTime += dt * 10;
    const swing = Math.sin(walkTime) * 0.5;
    parts.leftArm.rotation.x = swing;
    parts.rightArm.rotation.x = -swing;
    parts.leftLeg.rotation.x = -swing;
    parts.rightLeg.rotation.x = swing;
  } else if (!onGround) {
    parts.leftArm.rotation.x = -2;
    parts.rightArm.rotation.x = -2;
    parts.leftLeg.rotation.x = 0.5;
    parts.rightLeg.rotation.x = 0.5;
  } else {
    parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, 0, 0.1);
    parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, 0, 0.1);
    parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, 0, 0.1);
    parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, 0, 0.1);
  }

  // Camera theo nhân vật
  const camDist = 8, camHeight = 5;
  camera.position.x = player.position.x - Math.sin(camYaw) * camDist * Math.cos(camPitch);
  camera.position.z = player.position.z - Math.cos(camYaw) * camDist * Math.cos(camPitch);
  camera.position.y = player.position.y + camHeight * Math.sin(camPitch) + 2;
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
