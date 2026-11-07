import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type SceneOptions = {
  name: string;
  signal?: AbortSignal;
  onReady?: () => void;
  onError?: (error: unknown) => void;
};

export type LaptopScene = {
  setProgress: (progress: number) => void;
  setPointer: (x: number, y: number) => void;
  resize: () => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
};

/** All artwork and geometry are generated locally. No model or image requests. */
export async function createLaptopScene(
  container: HTMLElement,
  options: SceneOptions,
): Promise<LaptopScene> {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const instances = new Set<THREE.InstancedMesh>();
  let renderer: THREE.WebGLRenderer | undefined;
  let environmentTarget: THREE.WebGLRenderTarget | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let frame = 0;
  let disposed = false;
  let active = true;
  let contextLost = false;
  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let width = 1;
  let height = 1;

  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value);
    return value;
  };
  const canvasTexture = (canvas: HTMLCanvasElement): THREE.CanvasTexture => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() ?? 1);
    textures.add(texture);
    return texture;
  };
  const notifyError = (error: unknown) => {
    try { options.onError?.(error); } catch { /* Preserve renderer cleanup. */ }
  };
  const loseContext = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    active = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    notifyError(new Error('The 3D context was interrupted. The HTML portfolio remains available.'));
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    options.signal?.removeEventListener('abort', dispose);
    if (frame) cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    renderer?.domElement.removeEventListener('webglcontextlost', loseContext);
    for (const value of instances) value.dispose();
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    for (const value of textures) value.dispose();
    environmentTarget?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  };

  options.signal?.throwIfAborted();
  options.signal?.addEventListener('abort', dispose, { once: true });
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 600 ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', loseContext, false);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
    const laptop = new THREE.Group();
    scene.add(laptop);

    // A small prefiltered studio gives metal believable reflections without an HDRI download.
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environmentTarget = pmrem.fromScene(room, 0.045, 0.1, 100);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0.82;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    scene.add(new THREE.HemisphereLight(0xd9e5ff, 0x11121b, 1.15));
    const light = (color: number, intensity: number, x: number, y: number, z: number) => {
      const source = new THREE.DirectionalLight(color, intensity);
      source.position.set(x, y, z);
      scene.add(source);
    };
    light(0xffffff, 3.4, -4, 6, 6);
    light(0x8daaff, 1.9, 6, 3, 0);
    light(0xbba5ff, 2.1, -5, 4, -5);

    const aluminum = material(new THREE.MeshStandardMaterial({
      color: 0x727987, metalness: 0.94, roughness: 0.28,
    }));
    const edgeMetal = material(new THREE.MeshStandardMaterial({
      color: 0x969eac, metalness: 0.96, roughness: 0.21,
    }));
    const underside = material(new THREE.MeshStandardMaterial({
      color: 0x323740, metalness: 0.85, roughness: 0.37,
    }));
    const black = material(new THREE.MeshStandardMaterial({
      color: 0x080a0f, metalness: 0.18, roughness: 0.43,
    }));
    const keyMaterial = material(new THREE.MeshStandardMaterial({
      color: 0x12151c, metalness: 0.1, roughness: 0.47,
    }));
    const trackpadMaterial = material(new THREE.MeshStandardMaterial({
      color: 0x686f7c, metalness: 0.78, roughness: 0.34,
    }));
    const rounded = (
      parent: THREE.Object3D, w: number, h: number, d: number,
      x: number, y: number, z: number, surface: THREE.Material, radius = 0.04,
    ) => {
      const mesh = new THREE.Mesh(geometry(new RoundedBoxGeometry(w, h, d, 3, radius)), surface);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // Three fine layers read as a machined edge, seam, and keyboard deck.
    rounded(laptop, 4.18, 0.16, 2.72, 0, 0, 0, aluminum, 0.075);
    rounded(laptop, 4.13, 0.055, 2.67, 0, -0.069, 0, underside, 0.026);
    rounded(laptop, 4.12, 0.025, 2.66, 0, 0.083, 0, edgeMetal, 0.012);
    rounded(laptop, 3.46, 0.018, 1.40, 0, 0.105, -0.40, black, 0.008);

    // Trackpad is inset into a fine dark channel, with a small front opening detail.
    rounded(laptop, 1.61, 0.011, 0.69, 0, 0.102, 0.817, underside, 0.005);
    rounded(laptop, 1.58, 0.013, 0.66, 0, 0.109, 0.817, trackpadMaterial, 0.006);
    rounded(laptop, 0.60, 0.025, 0.037, 0, 0.062, 1.356, underside, 0.012);
    for (const side of [-1, 1]) {
      for (let port = 0; port < 2; port++) {
        rounded(laptop, 0.014, 0.046, 0.19, side * 2.089, 0, -0.73 + port * 0.29, black, 0.006);
      }
    }

    type Key = { label: string; units: number };
    const row = (labels: string[], units: Record<number, number> = {}): Key[] =>
      labels.map((label, index) => ({ label, units: units[index] ?? 1 }));
    const rows: Key[][] = [
      row(['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', '○']),
      row(['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '−', '=', 'delete'], { 13: 1.55 }),
      row(['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'], { 0: 1.4 }),
      row(['caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', '′', 'return'], { 0: 1.65, 12: 1.8 }),
      row(['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'], { 0: 2.1, 11: 2.2 }),
      row(['fn', 'ctrl', 'alt', 'super', '', 'super', 'alt', '←', '↑ ↓', '→'], { 3: 1.2, 4: 5.2, 5: 1.2 }),
    ];
    const keyCount = rows.reduce((sum, keys) => sum + keys.length, 0);
    const keys = new THREE.InstancedMesh(
      geometry(new RoundedBoxGeometry(1, 0.045, 1, 2, 0.018)), keyMaterial, keyCount,
    );
    instances.add(keys);
    laptop.add(keys);
    const labelCanvas = makeCanvas(2048, 896);
    const labels = labelCanvas.getContext('2d')!;
    labels.fillStyle = '#dce4ef';
    labels.textAlign = 'center';
    labels.textBaseline = 'middle';
    const labelWidth = 3.46;
    const labelDepth = 1.40;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    let keyIndex = 0;
    rows.forEach((keyRow, rowIndex) => {
      const gap = 0.031;
      const usable = 3.32 - gap * (keyRow.length - 1);
      const unit = usable / keyRow.reduce((sum, key) => sum + key.units, 0);
      let x = -1.66;
      const z = -0.987 + rowIndex * 0.224;
      keyRow.forEach((key) => {
        const keyWidth = key.units * unit;
        const centerX = x + keyWidth / 2;
        position.set(centerX, 0.148, z);
        scale.set(keyWidth, 1, rowIndex === 0 ? 0.132 : 0.184);
        matrix.compose(position, rotation, scale);
        keys.setMatrixAt(keyIndex++, matrix);
        labels.font = `${key.label.length > 2 ? 17 : 23}px -apple-system, BlinkMacSystemFont, sans-serif`;
        labels.fillText(
          key.label,
          (centerX / labelWidth + 0.5) * labelCanvas.width,
          ((z + 0.40) / labelDepth + 0.5) * labelCanvas.height,
        );
        x += keyWidth + gap;
      });
    });
    keys.instanceMatrix.needsUpdate = true;
    const labelPlane = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(labelWidth, labelDepth)),
      material(new THREE.MeshBasicMaterial({ map: canvasTexture(labelCanvas), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 })),
    );
    labelPlane.rotation.x = -Math.PI / 2;
    labelPlane.position.set(0, 0.172, -0.40);
    laptop.add(labelPlane);

    // One instanced draw call for both speaker grilles.
    const holes = new THREE.InstancedMesh(geometry(new THREE.CircleGeometry(0.009, 5)), black, 2 * 4 * 43);
    instances.add(holes);
    rotation.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    scale.set(1, 1, 1);
    let hole = 0;
    for (const side of [-1, 1]) {
      for (let column = 0; column < 4; column++) {
        for (let line = 0; line < 43; line++) {
          position.set(side * (1.835 + column * 0.035), 0.1005, -1.025 + line * 0.030);
          holes.setMatrixAt(hole++, matrix.compose(position, rotation, scale));
        }
      }
    }
    holes.instanceMatrix.needsUpdate = true;
    laptop.add(holes);

    const hinge = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.10, 0.10, 3.50, 16)), underside);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, 0.10, -1.19);
    laptop.add(hinge);

    const lid = new THREE.Group();
    lid.position.set(0, 0.135, -1.20);
    lid.rotation.x = -0.18;
    laptop.add(lid);
    rounded(lid, 4.10, 2.65, 0.105, 0, 1.325, 0, aluminum, 0.051);
    rounded(lid, 4.04, 2.59, 0.018, 0, 1.325, 0.055, edgeMetal, 0.008);
    rounded(lid, 3.98, 2.54, 0.018, 0, 1.325, 0.068, black, 0.008);

    const displayWidth = 3.84;
    const displayHeight = 2.40;
    const displayCenter = new THREE.Vector3(0, 1.345, 0.080);
    const display = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(displayWidth, displayHeight)),
      material(new THREE.MeshBasicMaterial({ map: canvasTexture(makeWallpaper(options.name)), toneMapped: false })),
    );
    display.position.copy(displayCenter);
    lid.add(display);
    const cameraGlass = new THREE.Mesh(
      geometry(new THREE.CircleGeometry(0.016, 16)),
      material(new THREE.MeshStandardMaterial({ color: 0x152234, metalness: 0.8, roughness: 0.12 })),
    );
    cameraGlass.position.set(0, 2.594, 0.079);
    lid.add(cameraGlass);

    // A translucent contact shadow avoids a costly real-time shadow map.
    const shadowCanvas = makeCanvas(256, 256);
    const shadowContext = shadowCanvas.getContext('2d')!;
    const shadowGradient = shadowContext.createRadialGradient(128, 128, 10, 128, 128, 120);
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0.65)');
    shadowGradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowContext.fillStyle = shadowGradient;
    shadowContext.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(6.5, 4.2)),
      material(new THREE.MeshBasicMaterial({ map: canvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false })),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.13, 0.04);
    scene.add(shadow);

    // Original developer desk and accessories, all procedural and locally rendered.
    const desk = new THREE.Group();
    scene.add(desk);
    const deskSurface = material(new THREE.MeshStandardMaterial({ color: 0x141821, roughness: .65, metalness: .25 }));
    const fabric = material(new THREE.MeshStandardMaterial({ color: 0x242a37, roughness: .93 }));
    const ceramic = material(new THREE.MeshStandardMaterial({ color: 0x778296, roughness: .25, metalness: .12 }));
    const paper = material(new THREE.MeshStandardMaterial({ color: 0x9da7b9, roughness: .95 }));
    rounded(desk, 9.7, .23, 5.7, 0, -.29, -.12, deskSurface, .10);
    rounded(desk, 6.7, .025, 3.45, .25, -.16, .12, fabric, .012);
    // Book, pencil, and a ceramic mug to the left.
    rounded(desk, 1.35, .11, 1.75, -3.45, -.11, .25, black, .04).rotation.y = -.16;
    rounded(desk, 1.28, .085, 1.65, -3.45, -.05, .25, paper, .025).rotation.y = -.16;
    rounded(desk, 1.37, .025, 1.77, -3.45, .006, .25, underside, .012).rotation.y = -.16;
    const pencil = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.025, .025, 1.35, 8)), edgeMetal);
    pencil.position.set(-3.48, .065, .25); pencil.rotation.set(Math.PI / 2, 0, -.3); desk.add(pencil);
    const mug = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.32, .27, .65, 32)), ceramic);
    mug.position.set(-3.2, .19, -1.65); desk.add(mug);
    const coffee = new THREE.Mesh(geometry(new THREE.CircleGeometry(.292, 32)), material(new THREE.MeshStandardMaterial({ color: 0x160e0b, roughness: .18 })));
    coffee.rotation.x = -Math.PI / 2; coffee.position.set(-3.2, .518, -1.65); desk.add(coffee);
    const handle = new THREE.Mesh(geometry(new THREE.TorusGeometry(.22, .055, 10, 24)), ceramic);
    handle.position.set(-3.56, .22, -1.65); desk.add(handle);
    // Wireless mouse and a phone resting on the desk.
    const mouse = new THREE.Mesh(geometry(new THREE.SphereGeometry(1, 24, 16)), aluminum);
    mouse.scale.set(.30, .15, .48); mouse.position.set(3.04, -.035, .50); desk.add(mouse);
    rounded(desk, .026, .016, .12, 3.04, .115, .34, black, .007);
    rounded(desk, .68, .07, 1.32, 3.2, -.12, -1.30, edgeMetal, .034).rotation.y = -.12;
    rounded(desk, .62, .009, 1.23, 3.2, -.078, -1.30, black, .004).rotation.y = -.12;
    // Restrained monitor light bar above the screen, on an articulated desk lamp.
    rounded(desk, .65, .08, .65, 3.9, -.12, -2.05, underside, .035);
    const stem = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.036, .036, 2.8, 10)), edgeMetal);
    stem.position.set(3.9, 1.3, -2.05); desk.add(stem);
    rounded(desk, 1.65, .09, .25, 3.15, 2.72, -2.05, aluminum, .04);
    rounded(desk, 1.42, .012, .17, 3.15, 2.667, -2.05, material(new THREE.MeshBasicMaterial({color:0xd5e3ff})), .005);

    laptop.updateMatrixWorld(true);
    const screenCenter = lid.localToWorld(displayCenter.clone());
    const screenNormal = new THREE.Vector3(0, 0, 1).transformDirection(lid.matrixWorld);
    const screenUp = new THREE.Vector3(0, 1, 0).transformDirection(lid.matrixWorld);
    const bounds = new THREE.Box3().setFromObject(laptop).union(new THREE.Box3().setFromObject(desk));
    const startTarget = bounds.getCenter(new THREE.Vector3());
    const startDirection = new THREE.Vector3(0.32, 0.58, 0.89).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), startDirection).normalize();
    const up = new THREE.Vector3().crossVectors(startDirection, right).normalize();
    const corners: THREE.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z).sub(startTarget));
      }
    }
    const startPosition = new THREE.Vector3();
    const endPosition = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    let startDistance = 10;
    let endDistance = 3;

    const updateCamera = () => {
      const t = progress * progress * (3 - 2 * progress);
      const pointerWeight = (1 - t) * (1 - t);
      startPosition.copy(startDirection).multiplyScalar(startDistance).add(startTarget);
      startPosition.x += pointerX * 0.28 * pointerWeight;
      startPosition.y += pointerY * 0.14 * pointerWeight;
      endPosition.copy(screenNormal).multiplyScalar(endDistance).add(screenCenter);
      camera.position.lerpVectors(startPosition, endPosition, t);
      lookTarget.lerpVectors(startTarget, screenCenter, t);
      camera.up.set(0, 1, 0).lerp(screenUp, t).normalize();
      camera.lookAt(lookTarget);
      // Negative offset aims above the object, placing the laptop below the hero headline.
      camera.setViewOffset(width, height, 0, -height * 0.105 * (1 - t), width, height);
      camera.updateProjectionMatrix();
      shadow.visible = progress < 0.8;
      desk.visible = progress < 0.98;
    };
    const draw = () => {
      frame = 0;
      if (disposed || !active || contextLost) return;
      try {
        updateCamera();
        renderer!.render(scene, camera);
      } catch (error) {
        active = false;
        notifyError(error);
      }
    };
    const invalidate = () => {
      if (!frame && active && !disposed && !contextLost) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      if (disposed) return;
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      renderer!.setSize(width, height, false);
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tanH = tanV * camera.aspect;
      startDistance = 0;
      for (const corner of corners) {
        const depth = corner.dot(startDirection);
        startDistance = Math.max(startDistance,
          Math.abs(corner.dot(right)) / (tanH * 0.88) + depth,
          Math.abs(corner.dot(up)) / (tanV * 0.66) + depth,
        );
      }
      // Cover rather than contain at the end so HTML can replace the screen seamlessly.
      endDistance = Math.min(displayHeight / (2 * tanV), displayWidth / (2 * tanH)) * 0.97;
      invalidate();
    };
    // Geometry is static: avoid recomputing every object's world matrix each frame.
    scene.updateMatrixWorld(true);
    scene.traverse(object => {
      object.matrixAutoUpdate = false;
      object.matrixWorldAutoUpdate = false;
    });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    // Readiness means an actual frame exists; parent can then start its reveal.
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    updateCamera();
    await renderer.compileAsync(scene, camera);
    options.signal?.throwIfAborted();
    if (disposed) throw new Error('The 3D scene was cancelled.');
    if (contextLost) throw new Error('The 3D context could not be initialized.');
    renderer.render(scene, camera);
    options.onReady?.();

    return {
      setProgress(value) {
        if (!Number.isFinite(value) || disposed) return;
        const next = THREE.MathUtils.clamp(value, 0, 1);
        if (Math.abs(next - progress) < 0.00001) return;
        progress = next;
        // GSAP already calls this on its animation frame. Rendering now avoids
        // a second requestAnimationFrame and the resulting one-frame camera lag.
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        draw();
      },
      setPointer(x, y) {
        if (disposed || !Number.isFinite(x) || !Number.isFinite(y)) return;
        const nextX = THREE.MathUtils.clamp(x, -1, 1);
        const nextY = THREE.MathUtils.clamp(y, -1, 1);
        if (Math.abs(nextX - pointerX) + Math.abs(nextY - pointerY) < 0.002) return;
        pointerX = nextX;
        pointerY = nextY;
        if (progress < 0.9) invalidate();
      },
      resize,
      setActive(value) {
        if (disposed || contextLost) return;
        active = value;
        if (value) invalidate();
        else if (frame) { cancelAnimationFrame(frame); frame = 0; }
      },
      dispose,
    };
  } catch (error) {
    dispose();
    notifyError(error);
    throw error;
  }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  if (!canvas.getContext('2d')) throw new Error('Canvas artwork is unavailable.');
  return canvas;
}

/** Original aurora artwork, drawn once; no animation, assets, or third-party logos. */
function makeWallpaper(name: string): HTMLCanvasElement {
  const canvas = makeCanvas(1920, 1200);
  const ctx = canvas.getContext('2d')!;
  const base = ctx.createLinearGradient(0, 0, 1920, 1200);
  base.addColorStop(0, '#060d26');
  base.addColorStop(0.47, '#10194c');
  base.addColorStop(1, '#060b20');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1920, 1200);

  const glows: [number, number, number, string][] = [
    [330, 850, 930, 'rgba(40,101,255,0.80)'],
    [1410, 170, 950, 'rgba(98,49,230,0.64)'],
    [1400, 1020, 760, 'rgba(17,151,225,0.46)'],
  ];
  for (const [x, y, radius, color] of glows) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1920, 1200);
  }
  // Layered curved ribbons have a deliberate, asymmetrical flow.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 40; i++) {
    const u = i / 39;
    ctx.beginPath();
    ctx.moveTo(-300, 1130 - u * 260);
    ctx.bezierCurveTo(250, 100 - u * 100, 760, 1390 - u * 540, 1250, 485 - u * 270);
    ctx.bezierCurveTo(1560, -140 - u * 160, 1700, 300, 2220, -250 + u * 110);
    ctx.strokeStyle = `rgba(${Math.round(64 + u * 80)},${Math.round(117 + u * 35)},255,${0.024 + Math.sin(u * Math.PI) * 0.035})`;
    ctx.lineWidth = 8 + u * 12;
    ctx.stroke();
  }
  ctx.restore();
  const vignette = ctx.createRadialGradient(960, 560, 120, 960, 560, 1200);
  vignette.addColorStop(0, 'rgba(2,7,22,0.08)');
  vignette.addColorStop(1, 'rgba(2,7,22,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1920, 1200);

  // A few quiet interface details, deliberately not an imitation operating system.
  ctx.strokeStyle = 'rgba(228,235,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(66, 88); ctx.lineTo(1854, 88); ctx.stroke();
  ctx.fillStyle = 'rgba(238,244,255,0.72)';
  ctx.font = '19px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERSONAL SPACE', 70, 57);
  ctx.textAlign = 'right';
  ctx.fillText('BUILD · LEARN · REPEAT', 1850, 57);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(221,231,255,0.68)';
  ctx.font = '21px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('HELLO, I’M', 960, 480);
  let fontSize = 108;
  const displayName = name.trim() || 'Your name';
  do {
    ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    if (ctx.measureText(displayName).width <= 1570) break;
    fontSize -= 3;
  } while (fontSize > 45);
  ctx.fillStyle = '#f5f7ff';
  ctx.fillText(displayName, 960, 618);
  ctx.fillStyle = 'rgba(229,236,255,0.75)';
  ctx.font = '30px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('A space for things I build.', 960, 689);
  ctx.fillStyle = 'rgba(224,235,255,0.52)';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('SCROLL TO EXPLORE', 960, 1060);
  ctx.strokeStyle = 'rgba(224,235,255,0.45)';
  ctx.beginPath(); ctx.moveTo(960, 1084); ctx.lineTo(960, 1121); ctx.stroke();
  return canvas;
}
