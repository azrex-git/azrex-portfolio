import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type AssetResources = {
  geometry: <T extends THREE.BufferGeometry>(value: T) => T;
  material: <T extends THREE.Material>(value: T) => T;
  textures: Set<THREE.Texture>;
};

/** Local, licensed GLB assets. Register decoded resources even after cancellation. */
export async function loadDevice(url: string, resources: AssetResources, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const buffer = await response.arrayBuffer();
  signal?.throwIfAborted();
  const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(1);
  let gltf;
  try { gltf = await new GLTFLoader().setDRACOLoader(decoder).parseAsync(buffer, '/models/'); }
  finally { decoder.dispose(); }
  const shapes = new Set<THREE.BufferGeometry>();
  const surfaces = new Set<THREE.Material>();
  const maps = new Set<THREE.Texture>();
  gltf.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    shapes.add(object.geometry);
    object.castShadow = object.receiveShadow = true;
    for (const surface of Array.isArray(object.material) ? object.material : [object.material]) {
      surfaces.add(surface);
      for (const value of Object.values(surface)) if (value instanceof THREE.Texture) maps.add(value);
    }
  });
  if (signal?.aborted) {
    shapes.forEach(value => value.dispose());
    surfaces.forEach(value => value.dispose());
    maps.forEach(value => { value.dispose(); if (value.source.data instanceof ImageBitmap) value.source.data.close(); });
    signal.throwIfAborted();
  }
  shapes.forEach(value => resources.geometry(value));
  surfaces.forEach(value => resources.material(value));
  maps.forEach(value => { value.anisotropy = 4; resources.textures.add(value); });
  return gltf.scene;
}

export async function createImportedMacBook(resources: AssetResources, wallpaper: THREE.CanvasTexture, signal?: AbortSignal) {
  const laptop = await loadDevice('/models/macbook-pro.glb', resources, signal);
  laptop.name = 'MacBook Pro — Jack Baeten (CC BY 4.0), silver finish';
  laptop.scale.setScalar(4.18 / 35.483);
  laptop.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(laptop);
  laptop.position.y = -.149 - bounds.min.y;
  // Preserve the artist's detailed keyboard, speaker perforations, ports and chassis.
  const silver = new Set(['lmWQsEjxpsebDlK', 'iyDJFXmHelnMTbD', 'CRQixVLpahJzhJc', 'YYwBgwvcyZVOOAA', 'LpqXZqhaGCeSzdu']);
  laptop.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const surface = object.material as THREE.MeshStandardMaterial;
    if (silver.has(surface.name)) {
      surface.color.set(0xd4d7dc);
      surface.metalness = .88;
      surface.roughness = .32;
    }
  });
  laptop.updateMatrixWorld(true);
  const screen = laptop.getObjectByName('Object_123') as THREE.Mesh;
  if (!screen) throw new Error('MacBook display mesh was not found.');
  const screenBounds = new THREE.Box3().setFromObject(screen);
  const center = screenBounds.getCenter(new THREE.Vector3());
  const size = screenBounds.getSize(new THREE.Vector3());
  const tilt = -Math.atan2(size.z, size.y);
  const screenUp = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const displayWidth = size.x;
  const displayHeight = Math.hypot(size.y, size.z);
  // Reproject the screen UVs so the portfolio fills the display without stretching.
  const shape = resources.geometry(screen.geometry.clone());
  const positions = shape.getAttribute('position');
  const uv = new Float32Array(positions.count * 2);
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(screen.matrixWorld).sub(center);
    uv[i * 2] = point.x / displayWidth + .5;
    uv[i * 2 + 1] = point.dot(screenUp) / displayHeight + .5;
  }
  shape.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  screen.geometry = shape;
  screen.material = resources.material(new THREE.MeshBasicMaterial({ map: wallpaper, toneMapped: false }));
  screen.castShadow = false;
  // World-space anchor keeps the existing scroll/camera interface intact.
  const lid = new THREE.Group();
  lid.position.copy(center);
  lid.rotation.x = tilt;
  lid.updateMatrixWorld(true);
  return { laptop, lid, displayWidth, displayHeight, displayCenter: new THREE.Vector3(), screenReflection: { opacity: 1 } };
}

export async function createIPhone(resources: AssetResources, signal?: AbortSignal) {
  const model = await loadDevice('/models/iphone-17-pro-max.glb', resources, signal);
  const orientation = new THREE.Group();
  // The author's phone is upright with the screen facing -X. Place it face up.
  orientation.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
    0, 0, 1, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1,
  ));
  orientation.add(model);
  orientation.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(orientation);
  orientation.scale.setScalar(2.06 / bounds.getSize(new THREE.Vector3()).z);
  orientation.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(orientation);
  const center = bounds.getCenter(new THREE.Vector3());
  orientation.position.set(-center.x, -bounds.min.y, -center.z);
  const phone = new THREE.Group();
  phone.name = 'iPhone 17 Pro Max — MajdyModels (CC BY 4.0)';
  phone.add(orientation);
  phone.position.set(3.13, -.149, -1.36);
  phone.rotation.y = -.17;
  const lockScreen = makePhoneScreen(resources);
  const bodySurfaces = new Set(['basecolor.001', 'metalframe.002', 'backpanel.001', 'Material.005', 'logo_face']);
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const surface of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(surface instanceof THREE.MeshStandardMaterial)) continue;
      if (bodySurfaces.has(surface.name)) {
        surface.color.set(0x424b57);
        surface.metalness = .8;
        surface.roughness = .31;
      }
      if (surface.name === 'glass.002') {
        surface.roughness = .13;
        surface.opacity = .055;
        surface.depthWrite = false;
        surface.envMapIntensity = .55;
      }
      if (surface.name === 'screen.001') {
        // Source UVs extend beyond 0–1; reproject the display to fit the new artwork.
        const display = resources.geometry(object.geometry.clone());
        display.computeBoundingBox();
        const rect = display.boundingBox!;
        const size = rect.getSize(new THREE.Vector3());
        const position = display.getAttribute('position');
        const uv = new Float32Array(position.count * 2);
        for (let i = 0; i < position.count; i++) {
          uv[i * 2] = (rect.max.y - position.getY(i)) / size.y;
          uv[i * 2 + 1] = (rect.max.z - position.getZ(i)) / size.z;
        }
        display.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        object.geometry = display;
        object.material = resources.material(new THREE.MeshPhysicalMaterial({
          map: lockScreen, emissiveMap: lockScreen, emissive: 0xffffff,
          emissiveIntensity: .38, roughness: .18, metalness: 0,
          clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .35, side: THREE.DoubleSide,
        }));
        object.castShadow = false;
      }
    }
  });
  return phone;
}

/** Original lock-screen art, with readable details instead of the source's bright display pattern. */
function makePhoneScreen(resources: AssetResources) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const base = ctx.createLinearGradient(0, 0, 380, 1024);
  base.addColorStop(0, '#070d19'); base.addColorStop(.45, '#172e4b'); base.addColorStop(1, '#060911');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 1024);
  const glow = ctx.createRadialGradient(480, 650, 20, 480, 650, 600);
  glow.addColorStop(0, 'rgba(82,98,158,.85)'); glow.addColorStop(.5, 'rgba(38,52,89,.5)'); glow.addColorStop(1, 'rgba(11,20,36,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 1024);
  ctx.fillStyle = '#020307'; ctx.beginPath(); ctx.roundRect(174, 25, 164, 43, 22); ctx.fill();
  ctx.fillStyle = '#dce6f7'; ctx.textAlign = 'center';
  ctx.font = '500 25px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Thursday, 12 November', 256, 134);
  ctx.font = '300 108px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('9:41', 256, 242);
  ctx.fillStyle = '#cdd8e9'; ctx.beginPath(); ctx.roundRect(178, 995, 156, 6, 3); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  resources.textures.add(texture);
  return texture;
}

export async function createMXMaster(resources: AssetResources, signal?: AbortSignal) {
  // Clean object-only scan: the previous photogrammetry asset included its table.
  const response = await fetch('/models/mx-master-3-scan.stl', { signal });
  if (!response.ok) throw new Error('Could not load the MX Master 3 scan.');
  const buffer = await response.arrayBuffer();
  signal?.throwIfAborted();
  const raw = new STLLoader().parse(buffer);
  // Align the scan's diagonal millimetre coordinates, with the wheel facing the laptop.
  raw.rotateZ(THREE.MathUtils.degToRad(53.5));
  raw.rotateX(-Math.PI / 2);
  raw.rotateY(Math.PI);
  raw.computeBoundingBox();
  const bounds = raw.boundingBox!;
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.67 / bounds.getSize(new THREE.Vector3()).z;
  raw.translate(-center.x, -bounds.min.y, -center.z);
  raw.scale(scale, scale, scale);
  raw.deleteAttribute('normal');
  const shape = resources.geometry(mergeVertices(raw, .0001));
  raw.dispose();
  shape.computeVertexNormals();
  // Keep the captured shape; isolate the metal wheel from the soft-touch shell.
  const positions = shape.getAttribute('position');
  const indices = shape.getIndex()!;
  const parts: number[][] = [[], []];
  for (let i = 0; i < indices.count; i += 3) {
    const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
    const x = ids.reduce((sum, id) => sum + positions.getX(id), 0) / 3;
    const y = ids.reduce((sum, id) => sum + positions.getY(id), 0) / 3;
    const z = ids.reduce((sum, id) => sum + positions.getZ(id), 0) / 3;
    const wheel = x > -.046 && x < .072 && z > -.63 && z < -.405 && y > .355;
    parts[wheel ? 1 : 0].push(...ids);
  }
  shape.setIndex(parts.flat());
  let offset = 0;
  parts.forEach((part, index) => { shape.addGroup(offset, part.length, index); offset += part.length; });
  const mouse = new THREE.Mesh(shape, [
    resources.material(new THREE.MeshStandardMaterial({ color: 0x292c31, roughness: .55, metalness: .04 })),
    resources.material(new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: .38, metalness: .9 })),
  ]);
  mouse.name = 'Logitech MX Master 3 — robomo, CC BY 4.0';
  mouse.castShadow = mouse.receiveShadow = true;
  mouse.position.set(3.0, -.149, .88);
  mouse.rotation.y = -.12;
  return mouse;
}
