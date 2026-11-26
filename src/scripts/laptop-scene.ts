import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createDeskProps } from './desk-props';
import { createDeskLamp } from './desk-lamp';
import { createIPhone, createImportedMacBook, createMXMaster } from './imported-devices';
import { createSceneDiagnostics } from './scene-diagnostics';

type SceneOptions = {
  name: string;
  signal?: AbortSignal;
  onReady?: () => void;
  onError?: (error: unknown) => void;
};

export type LaptopScene = {
  setProgress: (progress: number) => void;
  setPointer: (x: number, y: number) => void;
  clearPointer: () => void;
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
  let diagnostics: ReturnType<typeof createSceneDiagnostics>;
  let frame = 0;
  let disposed = false;
  let active = true;
  let contextLost = false;
  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let pointerInside = false;
  let pointerDirty = false;
  let lastCameraFrame = 0;
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
    diagnostics?.dispose();
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Reuse shadows during camera moves; refresh only while a desk prop moves.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', loseContext, false);
    container.appendChild(renderer.domElement);
    diagnostics = createSceneDiagnostics(renderer);

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
        // Photograph-like softboxes are baked once into the environment. Their
        // broad reflections cost no extra lights or post-processing per frame.
        const studio = createStudioEnvironment(hdr);
        try { environmentTarget = pmrem.fromScene(studio.scene, .025); }
        finally { studio.dispose(); }
      } else {
        const room = new RoomEnvironment();
        try { environmentTarget = pmrem.fromScene(room, .04); } finally { room.dispose(); }
      }
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = .8;
      scene.environmentRotation.y = .12;
    } finally { hdr?.dispose(); pmrem.dispose(); }
    scene.add(new THREE.HemisphereLight(0xe7eeff, 0x15121b, .2));
    const key = new THREE.DirectionalLight(0xfff1df, 1.7);
    key.position.set(-3.5, 7, 4.5);
    key.castShadow = true;
    keyShadow = key.shadow;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6.8; key.shadow.camera.right = 6.8;
    key.shadow.camera.top = 5.2; key.shadow.camera.bottom = -5.2;
    key.shadow.camera.near = .5; key.shadow.camera.far = 18;
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias = .006; key.shadow.bias = -.0001; key.shadow.radius = 5.5;
    key.shadow.intensity = .88;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xc5d6ff, .28);
    fill.position.set(5, 3.5, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc7d9ff, .8);
    rim.position.set(-3, 3.5, -5); scene.add(rim);

    const resources = { geometry, material, canvasTexture, instances };
    const { laptop, lid, displayWidth, displayHeight, displayCenter, screenReflection } = await createImportedMacBook({ geometry, material, textures }, canvasTexture(makeWallpaper(options.name)), options.signal);
    scene.add(laptop, lid);
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
      color: 0x77716b, map: wood, bumpMap: woodBump, bumpScale: .004, roughness: .62, metalness: 0,
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
    const deskProps = createDeskProps(desk, resources);
    desk.add(await createIPhone({ geometry, material, textures }, options.signal));
    const deskMouse = await createMXMaster({ geometry, material, textures }, options.signal);
    desk.add(deskMouse);
    const mouseHome = deskMouse.position.clone();
    const mouseAngle = deskMouse.rotation.y;
    const interactiveProps = [
      { id: 'mouse', object: deskMouse },
      { id: 'notebook', object: deskProps.notebook },
      { id: 'mug', object: deskProps.mug },
    ] as const;
    type PropId = typeof interactiveProps[number]['id'];
    // Keep the resting footprint clickable even after an object lifts away.
    const hitBoxes = interactiveProps.map(({ id, object }) => ({
      id, object, rest: new THREE.Box3().setFromObject(object).expandByScalar(.08),
    }));
    const liveHitBox = new THREE.Box3();
    const hoverIntersections: THREE.Intersection[] = [];
    const raycaster = new THREE.Raycaster();
    const hitPoint = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    let hoveredProp: PropId | null = null;
    let mouseTime = 0;
    const notebookMotion = { amount: 0, velocity: 0, time: 0 };
    const mugMotion = { amount: 0, velocity: 0, time: 0 };
    let lastMotionFrame = 0;
    let lastShadowFrame = 0;
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
    // Three uses scene.environmentIntensity for implicit maps. Bind the map on
    // surfaces with a deliberate reflection level so their own intensity applies.
    for (const surface of materials) {
      if (surface instanceof THREE.MeshStandardMaterial && !surface.envMap && surface.envMapIntensity !== 1) {
        surface.envMap = scene.environment;
        surface.envMapIntensity *= scene.environmentIntensity;
        surface.envMapRotation.copy(scene.environmentRotation);
      }
    }
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
    let projectedProgress = -1;

    const updateCamera = () => {
      // Zero acceleration at both ends gives the dolly a softer takeoff/arrival.
      const t = THREE.MathUtils.smootherstep(progress, 0, 1);
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
      if (projectedProgress !== t) {
        camera.setViewOffset(width, height, 0, -height * 0.105 * (1 - t), width, height);
        projectedProgress = t;
      }
      screenReflection.opacity = .10 * (1 - t);
      desk.visible = progress < 0.98;
    };
    const animateMouse = (dt: number) => {
      const hovering = hoveredProp === 'mouse' && progress < .25;
      if (hovering) mouseTime += dt;
      // A wider, unhurried browsing sweep, bounded clear of the phone and mat edge.
      const x = hovering ? -.02 + .13 * Math.sin(mouseTime * 1.55) : 0;
      const z = hovering ? -.005 + .185 * Math.cos(mouseTime * 1.1) : 0;
      const yaw = hovering ? .04 + .20 * Math.sin(mouseTime * 1.55) : 0;
      const blend = 1 - Math.exp(-6 * dt);
      deskMouse.position.x = THREE.MathUtils.lerp(deskMouse.position.x, mouseHome.x + x, blend);
      deskMouse.position.z = THREE.MathUtils.lerp(deskMouse.position.z, mouseHome.z + z, blend);
      deskMouse.rotation.y = THREE.MathUtils.lerp(deskMouse.rotation.y, mouseAngle + yaw, blend);
      const settling = deskMouse.position.distanceToSquared(mouseHome) > .0000005
        || Math.abs(deskMouse.rotation.y - mouseAngle) > .0005;
      if (!hovering && !settling) {
        deskMouse.position.copy(mouseHome);
        deskMouse.rotation.y = mouseAngle;
        mouseTime = 0;
      }
      deskMouse.updateMatrix();
      deskMouse.updateMatrixWorld(true);
      return hovering || settling;
    };
    const animateProp = (
      id: PropId, motion: { amount: number; velocity: number; time: number },
      pose: (amount: number, time: number) => void, dt: number,
    ) => {
      const hovering = hoveredProp === id && progress < .25;
      const target = hovering ? 1 : 0;
      // Exact critically damped motion starts gently and keeps its velocity on
      // hover reversal. A fast exponential lerp rushed the pen's pickup stage.
      const frequency = id === 'notebook' ? 3 : 4;
      const offset = motion.amount - target;
      const coupling = motion.velocity + frequency * offset;
      const decay = Math.exp(-frequency * dt);
      motion.amount = THREE.MathUtils.clamp(target + (offset + coupling * dt) * decay, 0, 1);
      motion.velocity = (motion.velocity - frequency * coupling * dt) * decay;
      if ((motion.amount === 0 && motion.velocity < 0) || (motion.amount === 1 && motion.velocity > 0)) {
        motion.velocity = 0;
      }
      if (Math.abs(motion.amount - target) < .0005 && Math.abs(motion.velocity) < .003) {
        motion.amount = target;
        motion.velocity = 0;
      }
      // Pause the writing phase during closing, including rapid hover reversals.
      if (hovering && motion.amount > .985) motion.time += dt;
      if (motion.amount === 0) motion.time = 0;
      pose(motion.amount, motion.time);
      return (hovering && id === 'notebook') || motion.amount !== target || motion.velocity !== 0;
    };
    let propsMoving = false;
    const animateProps = (now: number) => {
      const dt = Math.min(.05, Math.max(0, (now - lastMotionFrame) / 1000));
      lastMotionFrame = now;
      const mouseMoving = animateMouse(dt);
      const notebookMoving = animateProp('notebook', notebookMotion, deskProps.setNotebookPose, dt);
      const mugMoving = animateProp('mug', mugMotion, deskProps.setMugPose, dt);
      deskProps.notebook.updateMatrixWorld(true);
      deskProps.mug.updateMatrixWorld(true);
      const moving = mouseMoving || notebookMoving || mugMoving;
      // Sub-pixel shadow movement needs fewer updates than the visible meshes.
      if (now - lastShadowFrame >= 1000 / 30 || !moving) {
        renderer!.shadowMap.needsUpdate = true;
        lastShadowFrame = now;
      }
      return moving;
    };
    const draw = () => {
      frame = 0;
      if (disposed || !active || contextLost) return;
      try {
        const started = performance.now();
        const dt = lastCameraFrame ? Math.min(.05, (started - lastCameraFrame) / 1000) : 1 / 60;
        lastCameraFrame = started;
        const blend = 1 - Math.exp(-7 * dt);
        pointerX = THREE.MathUtils.lerp(pointerX, targetPointerX, blend);
        pointerY = THREE.MathUtils.lerp(pointerY, targetPointerY, blend);
        const cameraMoving = Math.abs(pointerX - targetPointerX) + Math.abs(pointerY - targetPointerY) > .001;
        if (!cameraMoving) { pointerX = targetPointerX; pointerY = targetPointerY; }
        updateCamera();
        if (pointerDirty || cameraMoving) {
          updateHover();
          pointerDirty = false;
        }
        if (propsMoving) propsMoving = animateProps(performance.now());
        renderer!.render(scene, camera);
        diagnostics?.record(started, performance.now() - started, propsMoving || cameraMoving);
        if (propsMoving || cameraMoving) invalidate();
      } catch (error) {
        active = false;
        notifyError(error);
      }
    };
    const invalidate = () => {
      if (!frame && active && !disposed && !contextLost) frame = requestAnimationFrame(draw);
    };
    const setHoveredProp = (value: PropId | null) => {
      if (value === hoveredProp) return;
      hoveredProp = value;
      if (!propsMoving) lastMotionFrame = performance.now();
      propsMoving = true;
      invalidate();
    };
    const updateHover = () => {
      if (!pointerInside || !active || progress >= .25) { setHoveredProp(null); return; }
      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      let hovered: PropId | null = null;
      let nearest = Infinity;
      for (const { id, object, rest } of hitBoxes) {
        let distance = Infinity;
        if (raycaster.ray.intersectBox(rest, hitPoint)) {
          distance = raycaster.ray.origin.distanceToSquared(hitPoint);
        } else if (id === hoveredProp
          && raycaster.ray.intersectBox(liveHitBox.setFromObject(object), hitPoint)) {
          // Follow a raised surface without letting the empty space around the
          // notebook's pen/cover steal a neighbouring prop's hover target.
          hoverIntersections.length = 0;
          raycaster.intersectObject(object, true, hoverIntersections);
          const hit = hoverIntersections.find(intersection => intersection.object.visible);
          if (hit) distance = hit.distance * hit.distance;
        }
        if (distance < nearest) { nearest = distance; hovered = id; }
      }
      setHoveredProp(hovered);
    };
    const clearPointer = () => {
      pointerInside = false;
      pointerDirty = false;
      targetPointerX = targetPointerY = 0;
      setHoveredProp(null);
      if (Math.abs(pointerX) + Math.abs(pointerY) > .001) invalidate();
    };
    const resize = () => {
      if (disposed) return;
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      // Preserve Retina detail on phones and computers alike. A total pixel
      // budget bounds large displays without penalizing small, dense screens.
      // Resize only: resolution must not jump during a scroll or hover gesture.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3,
        Math.sqrt(8_000_000 / (width * height)));
      renderer!.setPixelRatio(pixelRatio);
      renderer!.setSize(width, height, false);
      projectedProgress = -1;
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
    // Hinges, pen, and coffee need changing world matrices as well as their parents.
    const animatedObjects = new Set<THREE.Object3D>();
    for (const { object } of interactiveProps) object.traverse(child => animatedObjects.add(child));
    scene.updateMatrixWorld(true);
    scene.traverse(object => {
      object.matrixAutoUpdate = animatedObjects.has(object);
      object.matrixWorldAutoUpdate = animatedObjects.has(object);
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
        if (progress >= .25) setHoveredProp(null);
        // GSAP already calls this on its animation frame. Rendering now avoids
        // a second requestAnimationFrame and the resulting one-frame camera lag.
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        draw();
      },
      setPointer(x, y) {
        if (disposed || !active || progress >= .9 || !Number.isFinite(x) || !Number.isFinite(y)) return;
        // Consume only the latest sample on the next frame, even with a 1000 Hz
        // mouse. Camera damping and hit tests now share the displayed pose.
        pointer.set(x, y);
        pointerInside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
        targetPointerX = pointerInside ? x : 0;
        targetPointerY = pointerInside ? y : 0;
        pointerDirty = true;
        invalidate();
      },
      clearPointer,
      resize,
      setActive(value) {
        if (disposed || contextLost) return;
        active = value;
        diagnostics?.pause();
        if (!value) clearPointer();
        lastCameraFrame = 0;
        lastMotionFrame = performance.now();
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

function createStudioEnvironment(hdr: THREE.DataTexture) {
  const studio = new THREE.Scene();
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  studio.background = hdr;
  studio.backgroundIntensity = .5;
  const panelShape = new THREE.PlaneGeometry(1, 1);
  const surfaces: THREE.MeshBasicMaterial[] = [];
  const panel = (w: number, h: number, x: number, y: number, z: number, tint: number, strength: number) => {
    const surface = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(strength), toneMapped: false });
    surfaces.push(surface);
    const light = new THREE.Mesh(panelShape, surface);
    light.position.set(x, y, z);
    light.scale.set(w, h, 1);
    light.lookAt(0, 0, 0);
    studio.add(light);
  };
  panel(2.5, 5, -5, 6, 4, 0xfff4e8, 3);
  panel(.8, 5, 5, 3, 1, 0xc7dcff, 2);
  panel(3.5, .9, 0, 4, -6, 0xf3f6ff, 1.8);
  return { scene: studio, dispose() { panelShape.dispose(); surfaces.forEach(surface => surface.dispose()); } };
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
    // The interactive mouse uses its moving light shadows instead of a baked stamp.
  } else {
    // Notebook and mug use moving light shadows, so no contact ghosts remain on lift.
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
  base.addColorStop(0, '#0b0d12');
  base.addColorStop(0.47, '#20262e');
  base.addColorStop(1, '#101419');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1920, 1200);

  const glows: [number, number, number, string][] = [
    [330, 850, 930, 'rgba(169,199,255,0.20)'],
    [1410, 170, 950, 'rgba(205,213,225,0.12)'],
    [1400, 1020, 760, 'rgba(169,199,255,0.10)'],
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
    ctx.strokeStyle = `rgba(${Math.round(64 + u * 80)},${Math.round(117 + u * 35)},225,${0.010 + Math.sin(u * Math.PI) * 0.014})`;
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
  ctx.fillStyle = '#f3f0e9';
  ctx.fillText(displayName, 960, 618);
  ctx.fillStyle = 'rgba(229,236,255,0.75)';
  ctx.font = '30px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Building thoughtful software. Learning in public.', 960, 689);
  ctx.fillStyle = 'rgba(224,235,255,0.52)';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('SCROLL TO EXPLORE', 960, 1060);
  ctx.strokeStyle = 'rgba(224,235,255,0.45)';
  ctx.beginPath(); ctx.moveTo(960, 1084); ctx.lineTo(960, 1121); ctx.stroke();
  return canvas;
}
