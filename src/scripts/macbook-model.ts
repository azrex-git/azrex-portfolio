import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Resources = {
  geometry: <T extends THREE.BufferGeometry>(value: T) => T;
  material: <T extends THREE.Material>(value: T) => T;
  canvasTexture: (canvas: HTMLCanvasElement) => THREE.CanvasTexture;
  instances: Set<THREE.InstancedMesh>;
};

/** Original model, proportioned to Apple's 312.6 × 221.2 mm 14-inch enclosure.
 *  One scene unit is 74.78 mm. No third-party model or proprietary CAD is used.
 */
export function createMacBook(resources: Resources, wallpaper: HTMLCanvasElement) {
  const { geometry, material, canvasTexture, instances } = resources;
  const laptop = new THREE.Group();
  laptop.name = 'MacBook Pro 14 — space black';
  const grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  const ctx = grain.getContext('2d')!;
  const pixels = ctx.createImageData(256, 256);
  let seed = 39;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = 116 + (seed >>> 27);
    pixels.data.set([n, n, n, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  const micro = canvasTexture(grain);
  micro.colorSpace = THREE.NoColorSpace;
  micro.wrapS = micro.wrapT = THREE.RepeatWrapping;
  micro.repeat.set(8, 8);
  const aluminum = material(new THREE.MeshStandardMaterial({
    color: 0x393b40, metalness: .92, roughness: .36, bumpMap: micro, bumpScale: .00065,
  }));
  const edge = material(new THREE.MeshStandardMaterial({ color: 0x565960, metalness: .98, roughness: .27 }));
  const seam = material(new THREE.MeshStandardMaterial({ color: 0x151619, metalness: .55, roughness: .45 }));
  const rubber = material(new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: .85 }));
  const black = material(new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: .44, metalness: .12 }));
  const keysMaterial = material(new THREE.MeshStandardMaterial({ color: 0x111215, roughness: .48, metalness: .03 }));
  const glass = material(new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: .16, metalness: .12, clearcoat: 1, clearcoatRoughness: .12 }));
  const trackpad = material(new THREE.MeshStandardMaterial({ color: 0x33353a, metalness: .65, roughness: .43 }));

  const mesh = (parent: THREE.Object3D, shape: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry(shape), surface);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, surface: THREE.Material, r = .01) =>
    mesh(parent, new RoundedBoxGeometry(w, h, d, 3, r), surface, x, y, z);
  // Extruded rounded outlines retain the wide corner radius on thin enclosures.
  const plate = (parent: THREE.Object3D, w: number, d: number, h: number, r: number, bevel: number, x: number, y: number, z: number, surface: THREE.Material) => {
    const shape = roundRect(w - 2 * bevel, d - 2 * bevel, r);
    const shapeGeometry = new THREE.ExtrudeGeometry(shape, { depth: h - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 10, steps: 1 });
    shapeGeometry.translate(0, 0, -(h - 2 * bevel) / 2);
    const object = mesh(parent, shapeGeometry, surface, x, y, z);
    object.rotation.x = -Math.PI / 2;
    return object;
  };

  plate(laptop, 4.18, 2.958, .145, .15, .028, 0, -.018, 0, aluminum);
  plate(laptop, 4.135, 2.914, .015, .145, .004, 0, -.091, 0, seam);
  plate(laptop, 4.125, 2.902, .021, .145, .008, 0, -.105, 0, aluminum);
  for (const x of [-1.65, 1.65]) for (const z of [-1.12, 1.12]) {
    mesh(laptop, new THREE.CylinderGeometry(.13, .115, .029, 32), rubber, x, -.13, z);
  }
  plate(laptop, 3.47, 1.55, .008, .075, .002, 0, .057, -.43, black);
  plate(laptop, 1.81, 1.035, .008, .065, .001, 0, .057, .887, seam);
  plate(laptop, 1.787, 1.012, .009, .06, .002, 0, .061, .887, trackpad);
  // Shallow finger scoop at the front edge and machined channel beneath it.
  box(laptop, .58, .025, .025, 0, .032, 1.476, edge, .01);
  box(laptop, .56, .03, .027, 0, .043, 1.478, seam, .01);

  // USB-C, MagSafe, headphone, HDMI and SD apertures, placed on real side rails.
  for (const z of [-.69, -.38]) {
    box(laptop, .009, .052, .141, -2.087, -.005, z, edge);
    box(laptop, .012, .034, .115, -2.091, -.005, z, black);
  }
  box(laptop, .012, .035, .245, -2.091, -.005, -1.1, black);
  box(laptop, .014, .019, .213, -2.096, -.005, -1.1, edge);
  const jack = mesh(laptop, new THREE.CircleGeometry(.024, 20), black, -2.092, -.004, .025);
  jack.rotation.y = -Math.PI / 2;
  box(laptop, .012, .061, .195, 2.091, -.005, -1.03, black);
  box(laptop, .012, .034, .115, 2.091, -.005, -.62, black);
  box(laptop, .012, .025, .35, 2.091, -.005, -.11, black);

  const rows: { label: string; units: number }[][] = [];
  const row = (labels: string[], units: Record<number, number> = {}) => rows.push(labels.map((label, index) => ({ label, units: units[index] ?? 1 })));
  row(['esc', '☀', '☀', '▤', '⌕', '♩', '☾', '◀', '▶', '▶', '◁', '◖', '◕', '']);
  row(['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '−', '=', 'delete'], { 13: 1.5 });
  row(['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'], { 0: 1.5 });
  row(['caps lock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', '′', 'return'], { 0: 1.8, 12: 1.7 });
  row(['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'], { 0: 2.2, 11: 2.2 });
  row(['fn', 'control', 'option', '⌘', '', '⌘', 'option', '←', '↑ ↓', '→'], { 3: 1.2, 4: 5.1, 5: 1.2 });
  const keyCount = rows.reduce((sum, keys) => sum + keys.length, 0);
  const keys = new THREE.InstancedMesh(geometry(new RoundedBoxGeometry(1, .027, 1, 3, .012)), keysMaterial, keyCount);
  keys.castShadow = keys.receiveShadow = true;
  instances.add(keys); laptop.add(keys);
  const labels = document.createElement('canvas'); labels.width = 2048; labels.height = 960;
  const ink = labels.getContext('2d')!;
  ink.fillStyle = '#b8bbc5'; ink.textAlign = 'center'; ink.textBaseline = 'middle';
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3(); const scale = new THREE.Vector3();
  let index = 0;
  rows.forEach((keyRow, rowIndex) => {
    const gap = .029;
    const unit = (3.34 - gap * (keyRow.length - 1)) / keyRow.reduce((n, key) => n + key.units, 0);
    let x = -1.67;
    const z = -1.069 + rowIndex * .246;
    keyRow.forEach(key => {
      const w = key.units * unit; const cx = x + w / 2;
      p.set(cx, .081, z); scale.set(w, 1, rowIndex === 0 ? .186 : .201);
      keys.setMatrixAt(index++, matrix.compose(p, q, scale));
      ink.font = `${key.label.length > 2 ? 16 : 24}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ink.fillText(key.label, (cx / 3.47 + .5) * 2048, ((z + .43) / 1.55 + .5) * 960);
      x += w + gap;
    });
  });
  const legends = mesh(laptop, new THREE.PlaneGeometry(3.47, 1.55), material(new THREE.MeshBasicMaterial({ map: canvasTexture(labels), transparent: true, depthWrite: false, toneMapped: false })), 0, .096, -.43);
  legends.rotation.x = -Math.PI / 2; legends.castShadow = legends.receiveShadow = false;
  const touchID = mesh(laptop, new THREE.CylinderGeometry(.069, .069, .004, 32), black, 1.565, .097, -1.069);
  touchID.castShadow = false;
  const touchRing = mesh(laptop, new THREE.TorusGeometry(.069, .0025, 6, 32), edge, 1.565, .100, -1.069);
  touchRing.rotation.x = -Math.PI / 2; touchRing.castShadow = false;

  // True perforation scale; both grilles share one draw call.
  const holes = new THREE.InstancedMesh(geometry(new THREE.CircleGeometry(.0052, 5)), black, 2 * 8 * 62);
  instances.add(holes); laptop.add(holes);
  q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); scale.set(1, 1, 1);
  index = 0;
  for (const side of [-1, 1]) for (let col = 0; col < 8; col++) for (let line = 0; line < 62; line++) {
    p.set(side * (1.812 + col * .018), .0554, -1.137 + line * .023);
    holes.setMatrixAt(index++, matrix.compose(p, q, scale));
  }
  const hinge = mesh(laptop, new THREE.CylinderGeometry(.071, .071, 3.61, 32), black, 0, .052, -1.337);
  hinge.rotation.z = Math.PI / 2;
  const lid = new THREE.Group(); lid.position.set(0, .06, -1.373); lid.rotation.x = -.19; laptop.add(lid);
  const back = plate(lid, 4.18, 2.752, .068, .125, .013, 0, 1.376, 0, aluminum);
  back.rotation.x = 0;
  const seal = plate(lid, 4.137, 2.708, .009, .115, .002, 0, 1.376, .038, rubber);
  seal.rotation.x = 0;
  const bezel = plate(lid, 4.111, 2.682, .009, .108, .002, 0, 1.376, .044, glass);
  bezel.rotation.x = 0;
  const displayWidth = 4.016; const displayHeight = 2.608;
  const displayCenter = new THREE.Vector3(0, 1.402, .052);
  const displayGeometry = new THREE.ShapeGeometry(roundRect(displayWidth, displayHeight, .078), 12);
  const uv = displayGeometry.attributes.uv;
  const positions = displayGeometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, positions.getX(i) / displayWidth + .5, positions.getY(i) / displayHeight + .5);
  const display = mesh(lid, displayGeometry, material(new THREE.MeshBasicMaterial({ map: canvasTexture(wallpaper), toneMapped: false })), displayCenter.x, displayCenter.y, displayCenter.z);
  display.castShadow = display.receiveShadow = false;
  // The camera island overlaps only the very top strip of the display.
  const notch = plate(lid, .47, .115, .008, .035, .001, 0, 2.657, .059, black);
  notch.rotation.x = 0; notch.castShadow = false;
  const cameraLens = mesh(lid, new THREE.CircleGeometry(.015, 24), material(new THREE.MeshPhysicalMaterial({ color: 0x0a1422, metalness: .55, roughness: .08, clearcoat: 1 })), 0, 2.668, .064);
  cameraLens.castShadow = false;
  mesh(lid, new THREE.CircleGeometry(.005, 12), material(new THREE.MeshBasicMaterial({ color: 0x224466 })), -.004, 2.672, .065).castShadow = false;
  // Subtle light sweep catches the display glass at the opening camera angle.
  const reflectionCanvas = document.createElement('canvas'); reflectionCanvas.width = 256; reflectionCanvas.height = 256;
  const refl = reflectionCanvas.getContext('2d')!;
  const gradient = refl.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, 'rgba(214,226,255,.16)'); gradient.addColorStop(.36, 'rgba(214,226,255,.015)'); gradient.addColorStop(.58, 'rgba(214,226,255,0)');
  refl.fillStyle = gradient; refl.fillRect(0, 0, 256, 256);
  const screenReflection = material(new THREE.MeshBasicMaterial({ map: canvasTexture(reflectionCanvas), transparent: true, depthWrite: false, toneMapped: false }));
  const reflection = new THREE.Mesh(display.geometry, screenReflection); reflection.position.copy(displayCenter); reflection.position.z += .0005; lid.add(reflection);
  return { laptop, lid, displayWidth, displayHeight, displayCenter, screenReflection };
}

function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(); const x = -w / 2; const y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
