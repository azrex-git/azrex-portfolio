import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createDeskProps } from './desk-props';
import { createDeskLamp } from './desk-lamp';
import { createIPhone, createImportedMacBook, createMXMaster } from './imported-devices';

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

/** Licensed local device models and studio HDRI; no third-party runtime requests. */
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
  let keyShadow: THREE.LightShadow | undefined;
  let disposeLamp: (() => void) | undefined;
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
    for (const value of textures) { value.dispose(); if (value.source.data instanceof ImageBitmap) value.source.data.close(); }
    keyShadow?.dispose();
    disposeLamp?.();
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
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The props and lighting never move: render the shadow map once, not every scroll frame.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', loseContext, false);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
    // Use a real, locally stored studio capture. Cancellation still owns all GPU resources.
    let hdr: THREE.DataTexture | undefined;
    try {
      const signals = [AbortSignal.timeout(4500)];
      if (options.signal) signals.push(options.signal);
      const response = await fetch('/environments/studio_small_08_1k.hdr', { signal: AbortSignal.any(signals) });
      if (!response.ok) throw new Error('Studio environment could not be loaded.');
      const buffer = await response.arrayBuffer();
      options.signal?.throwIfAborted();
      const data = new HDRLoader().parse(buffer);
      hdr = new THREE.DataTexture(data.data, data.width, data.height, THREE.RGBAFormat, data.type);
      hdr.colorSpace = THREE.LinearSRGBColorSpace;
      hdr.minFilter = hdr.magFilter = THREE.LinearFilter;
      hdr.flipY = true;
      hdr.needsUpdate = true;
    } catch {
      options.signal?.throwIfAborted();
      // Offline/missing-asset fallback is still a fully working procedural studio.
    }
    if (disposed) { hdr?.dispose(); throw new Error('The 3D scene was cancelled.'); }
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      if (hdr) {
        environmentTarget = pmrem.fromEquirectangular(hdr);
      } else {
        const room = new RoomEnvironment();
        try { environmentTarget = pmrem.fromScene(room, .04); } finally { room.dispose(); }
      }
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = .78;
      scene.environmentRotation.y = .35;
    } finally { hdr?.dispose(); pmrem.dispose(); }
    scene.add(new THREE.HemisphereLight(0xe7eeff, 0x11131b, .32));
    const key = new THREE.DirectionalLight(0xfff3e5, 2.2);
    key.position.set(-3.5, 7, 4.5);
    key.castShadow = true;
    keyShadow = key.shadow;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6.8; key.shadow.camera.right = 6.8;
    key.shadow.camera.top = 5.2; key.shadow.camera.bottom = -5.2;
    key.shadow.camera.near = .5; key.shadow.camera.far = 18;
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias = .008; key.shadow.bias = -.0001; key.shadow.radius = 4;
    key.shadow.intensity = 1;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xc5d6ff, .45);
    fill.position.set(5, 3.5, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc7c5ef, .55);
    rim.position.set(-3, 3.5, -5); scene.add(rim);

    const resources = { geometry, material, canvasTexture, instances };
    const { laptop, lid, displayWidth, displayHeight, displayCenter, screenReflection } = await createImportedMacBook({ geometry, material, textures }, canvasTexture(makeWallpaper(options.name)), options.signal);
    scene.add(laptop);
    const rounded = (
      parent: THREE.Object3D, w: number, h: number, d: number,
      x: number, y: number, z: number, surface: THREE.Material, radius = .04,
    ) => {
      const object = new THREE.Mesh(geometry(new RoundedBoxGeometry(w, h, d, 4, radius)), surface);
      object.position.set(x, y, z);
      object.castShadow = object.receiveShadow = true;
      parent.add(object);
      return object;
    };
    const desk = new THREE.Group();
    scene.add(desk);
    const wood = canvasTexture(makeDeskGrain());
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(2, 1);
    const woodBump = wood.clone(); woodBump.colorSpace = THREE.NoColorSpace; textures.add(woodBump);
    const deskMaterial = material(new THREE.MeshStandardMaterial({
      color: 0x4d515b, map: wood, bumpMap: woodBump, bumpScale: .008, roughness: .56, metalness: .08,
    }));
    const fabric = canvasTexture(makeFabric());
    fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping; fabric.repeat.set(12, 8);
    fabric.colorSpace = THREE.NoColorSpace;
    const matMaterial = material(new THREE.MeshStandardMaterial({
      color: 0x1b202c, roughness: .94, bumpMap: fabric, bumpScale: .0025,
    }));
    const charcoal = material(new THREE.MeshStandardMaterial({ color: 0x20242a, metalness: .72, roughness: .36 }));
    const top = rounded(desk, 10.2, .26, 5.95, 0, -.305, -.05, deskMaterial, .09);
    top.castShadow = false;
    rounded(desk, 10.12, .025, 5.87, 0, -.442, -.05, charcoal, .012);
    rounded(desk, 6.50, .024, 3.65, .55, -.163, .15, matMaterial, .012);
    // Fine stitched border catches just enough light to read as a separate material.
    const stitchPoints: THREE.Vector3[] = [];
    const stitchX = 3.20, stitchZ = 1.78;
    for (let x = -stitchX; x < stitchX; x += .05) for (const z of [-stitchZ, stitchZ]) {
      stitchPoints.push(new THREE.Vector3(x + .55, -.149, z + .15), new THREE.Vector3(x + .57, -.149, z + .15));
    }
    for (let z = -stitchZ; z < stitchZ; z += .05) for (const x of [-stitchX, stitchX]) {
      stitchPoints.push(new THREE.Vector3(x + .55, -.149, z + .15), new THREE.Vector3(x + .55, -.149, z + .17));
    }
    const stitching = new THREE.LineSegments(geometry(new THREE.BufferGeometry().setFromPoints(stitchPoints)), material(new THREE.LineBasicMaterial({ color: 0x464d5c, transparent: true, opacity: .5 })));
    desk.add(stitching);
    createDeskProps(desk, resources);
    desk.add(await createIPhone({ geometry, material, textures }, options.signal));
    desk.add(await createMXMaster({ geometry, material, textures }, options.signal));
    options.signal?.throwIfAborted();

    // Baked ambient contact complements the directional shadow under small props.
    // Two shared quads are sufficient; nothing is recomputed while scrolling.
    for (const [level, isMat] of [[-.174, false], [-.148, true]] as const) {
      const contact = new THREE.Mesh(
        geometry(new THREE.PlaneGeometry(10.2, 5.95)),
        material(new THREE.MeshBasicMaterial({ map: canvasTexture(makeContactShadow(isMat)), transparent: true, depthWrite: false, toneMapped: false })),
      );
      contact.rotation.x = -Math.PI / 2;
      contact.position.set(0, level, -.05);
      contact.renderOrder = 1;
      desk.add(contact);
    }

    const lamp = createDeskLamp(desk, resources);
    disposeLamp = lamp.dispose;

    laptop.updateMatrixWorld(true);
    const screenCenter = lid.localToWorld(displayCenter.clone());
    const screenNormal = new THREE.Vector3(0, 0, 1).transformDirection(lid.matrixWorld);
    const screenUp = new THREE.Vector3(0, 1, 0).transformDirection(lid.matrixWorld);
    const bounds = new THREE.Box3().setFromObject(laptop).union(new THREE.Box3().setFromObject(desk));
    scene.add(lamp.effects);
    const startTarget = bounds.getCenter(new THREE.Vector3());
    const startDirection = new THREE.Vector3(0.28, 0.66, 0.92).normalize();
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
      screenReflection.opacity = 1 - t;
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
          Math.abs(corner.dot(right)) / (tanH * 0.91) + depth,
          Math.abs(corner.dot(up)) / (tanV * 0.69) + depth,
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
    renderer.shadowMap.needsUpdate = true;
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

/** Restrained black-stained grain, with deterministic fine pores rather than flat color. */
function makeDeskGrain() {
  const canvas = makeCanvas(1024, 512);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#55545a'; ctx.fillRect(0, 0, 1024, 512);
  let seed = 812;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 2400; i++) {
    const y = random() * 512;
    ctx.beginPath(); ctx.moveTo(0, y);
    ctx.bezierCurveTo(280, y + Math.sin(y * .035) * 4, 720, y + Math.cos(y * .024) * 3, 1024, y);
    ctx.lineWidth = .2 + random() * .9;
    ctx.strokeStyle = random() > .5 ? `rgba(12,13,18,${random() * .16})` : `rgba(177,176,184,${random() * .09})`;
    ctx.stroke();
  }
  return canvas;
}

function makeFabric() {
  const canvas = makeCanvas(128, 128);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#707070'; ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) {
    ctx.fillStyle = ((x + y) % 8) ? '#999999' : '#555555';
    ctx.fillRect(x, y, 2, 3);
  }
  return canvas;
}

function makeContactShadow(isMat: boolean) {
  const canvas = makeCanvas(1536, 896);
  const ctx = canvas.getContext('2d')!;
  const sx = canvas.width / 10.2, sy = canvas.height / 5.95;
  const stamp = (x: number, z: number, w: number, d: number, angle: number, round: number) => {
    ctx.save();
    ctx.translate((x / 10.2 + .5) * canvas.width, ((z + .05) / 5.95 + .5) * canvas.height);
    ctx.rotate(angle);
    for (const [blur, alpha, expand] of [[14, .28, .12], [5, .38, .04], [1.5, .48, 0]]) {
      ctx.filter = `blur(${blur}px)`;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(-(w + expand) * sx / 2, -(d + expand) * sy / 2, (w + expand) * sx, (d + expand) * sy, round * sx);
      ctx.fill();
    }
    ctx.restore();
  };
  if (isMat) {
    stamp(0, 0, 4.04, 2.81, 0, .14);
    stamp(3.13, -1.36, .95, 1.97, .17, .15);
    stamp(2.94, .84, .98, 1.42, .16, .4);
  } else {
    stamp(-3.22, .72, 1.65, 2.23, -.12, .07);
    stamp(-3.25, -1.49, .72, .72, 0, .35);
    stamp(.55, .15, 6.48, 3.63, 0, .04);
    stamp(4.16, -2.02, .64, .66, 0, .05);
  }
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
