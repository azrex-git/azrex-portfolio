import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type PropResources = {
  geometry: <T extends THREE.BufferGeometry>(value: T) => T;
  material: <T extends THREE.Material>(value: T) => T;
  canvasTexture: (canvas: HTMLCanvasElement) => THREE.CanvasTexture;
  instances: Set<THREE.InstancedMesh>;
};

export type DeskProps = {
  notebook: THREE.Group;
  mug: THREE.Group;
  setNotebookPose: (amount: number, time: number) => void;
  setMugPose: (amount: number, time: number) => void;
};

/** Original, physically scaled desk objects; all geometry and textures stay local. */
export function createDeskProps(parent: THREE.Group, resources: PropResources): DeskProps {
  const { geometry, material, canvasTexture } = resources;
  const mesh = (group: THREE.Object3D, shape: THREE.BufferGeometry, surface: THREE.Material,
    x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry(shape), surface);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  };
  const box = (group: THREE.Object3D, w: number, h: number, d: number,
    surface: THREE.Material, x = 0, y = 0, z = 0, radius = .015) =>
    mesh(group, new RoundedBoxGeometry(w, h, d, 3, radius), surface, x, y, z);
  const standard = (parameters: THREE.MeshStandardMaterialParameters) =>
    material(new THREE.MeshStandardMaterial(parameters));
  const physical = (parameters: THREE.MeshPhysicalMaterialParameters) =>
    material(new THREE.MeshPhysicalMaterial(parameters));
  const surfaceTexture = (kind: 'leather' | 'rubber' | 'paper') => {
    const canvas = makeCanvas(512, 512);
    const ctx = canvas.getContext('2d')!;
    let seed = kind === 'leather' ? 51 : kind === 'rubber' ? 109 : 211;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
    const pixels = ctx.createImageData(512, 512);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const shade = Math.round(134 + (random() - .5) * (kind === 'rubber' ? 30 : 65));
      pixels.data[index] = shade;
      pixels.data[index + 1] = shade;
      pixels.data[index + 2] = shade;
      pixels.data[index + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    if (kind === 'leather') {
      ctx.strokeStyle = 'rgba(230,230,230,.14)';
      ctx.lineWidth = .7;
      for (let row = 0; row < 512; row += 4) {
        ctx.beginPath(); ctx.moveTo(0, row); ctx.lineTo(512, row + .7); ctx.stroke();
      }
    }
    const texture = canvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(kind === 'leather' ? 3 : 2, kind === 'leather' ? 4 : 2);
    return texture;
  };

  const darkPlastic = standard({ color: 0x101215, roughness: .63 });
  const brushedMetal = standard({ color: 0x9b9da0, metalness: 1, roughness: .28 });
  const graphiteMetal = standard({ color: 0x454950, metalness: .95, roughness: .28 });

  // A thin, rolled ceramic lip and recessed foot keep the silhouette believable.
  // The liquid is a single reflective surface with a curved edge at the cup wall.
  const mug = new THREE.Group();
  mug.name = 'Glazed stoneware and black coffee';
  mug.position.set(-3.25, -.175, -1.49);
  mug.rotation.y = -.30;
  parent.add(mug);
  const rubberGrain = surfaceTexture('rubber');
  const ceramic = physical({ color: 0xd1cec5, roughness: .21, metalness: 0,
    clearcoat: .45, clearcoatRoughness: .12, ior: 1.48,
    bumpMap: rubberGrain, bumpScale: .00025 });
  const profile = [
    [0, .033], [.29, .033], [.322, .038], [.345, .052], [.366, .079],
    [.381, .12], [.397, .24], [.417, .43], [.437, .65], [.449, .80],
    [.454, .93], [.454, .958], [.452, .968], [.446, .975], [.439, .978],
    [.432, .975], [.426, .968], [.424, .958], [.425, .93], [.420, .80],
    [.408, .65], [.388, .43], [.368, .24], [.351, .16], [.333, .132],
    [.307, .116], [.275, .111], [0, .111],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(mug, new THREE.LatheGeometry(profile, 96), ceramic);
  const foot = standard({ color: 0xb7ac96, roughness: .88 });
  mesh(mug, new THREE.LatheGeometry([
    new THREE.Vector2(.292, .034), new THREE.Vector2(.292, .008),
    new THREE.Vector2(.299, .003), new THREE.Vector2(.326, .003),
    new THREE.Vector2(.334, .012), new THREE.Vector2(.334, .042),
  ], 64), foot);
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.426, .807, 0), new THREE.Vector3(-.596, .833, 0),
    new THREE.Vector3(-.738, .750, 0), new THREE.Vector3(-.780, .580, 0),
    new THREE.Vector3(-.739, .405, 0), new THREE.Vector3(-.599, .291, 0),
    new THREE.Vector3(-.392, .271, 0),
  ]);
  const handle = mesh(mug, new THREE.TubeGeometry(handleCurve, 48, .049, 12, false), ceramic);
  handle.scale.z = .92;
  // Rounded attachment pads intersect both surfaces so the handle joins the cup.
  for (const [x, y] of [[-.426, .807], [-.392, .271]]) {
    const join = mesh(mug, new THREE.SphereGeometry(.059, 16, 12), ceramic, x, y);
    join.scale.set(.7, 1.1, .94);
  }
  const coffeeMat = physical({ color: 0x090502, roughness: .12, metalness: 0,
    ior: 1.33, envMapIntensity: .42, specularIntensity: 1 });
  const coffeeProfile = [
    [.423, .873], [.421, .867], [.417, .863], [.410, .860],
    [.398, .8585], [.370, .858], [0, .858],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const coffeeLevel = new THREE.Group();
  coffeeLevel.position.y = .858;
  mug.add(coffeeLevel);
  const coffeeShape = new THREE.LatheGeometry(coffeeProfile, 96);
  coffeeShape.translate(0, -.858, 0);
  const coffee = mesh(coffeeLevel, coffeeShape, coffeeMat);
  coffee.castShadow = false;

  // A closed pocket notebook: overhanging cloth covers, individual ivory page
  // edges, a rounded spine, woven elastic and a ribbon resting on the table.
  const notebook = new THREE.Group();
  notebook.name = 'Cloth notebook, paper and machined pen';
  notebook.position.set(-3.22, -.175, .72);
  notebook.rotation.y = .12;
  parent.add(notebook);
  const cloth = surfaceTexture('leather');
  const bookCover = standard({ color: 0x313b3a, roughness: .91, bumpMap: cloth, bumpScale: .004 });
  const bookEdge = standard({ color: 0x25302e, roughness: .86 });
  mesh(notebook, roundedSlab(1.69, 2.28, .033, .075), bookCover, 0, .023, 0);
  // The hinge sits on the spine, so the cover moves as a solid object.
  const coverHinge = new THREE.Group();
  coverHinge.name = 'Notebook cover hinge';
  coverHinge.position.set(-.794, .227, 0);
  notebook.add(coverHinge);
  const topCover = new THREE.Group();
  topCover.position.set(.794, -.227, 0);
  coverHinge.add(topCover);
  mesh(topCover, roundedSlab(1.69, 2.28, .043, .075), bookCover, 0, .227, 0);
  const pageCanvas = makeCanvas(512, 256);
  const pageCtx = pageCanvas.getContext('2d')!;
  pageCtx.fillStyle = '#d5ceb9'; pageCtx.fillRect(0, 0, 512, 256);
  for (let index = 0; index < 61; index++) {
    pageCtx.fillStyle = index % 3 ? 'rgba(112,103,79,.25)' : 'rgba(255,249,227,.48)';
    pageCtx.fillRect(0, index * 4.2, 512, index % 4 ? 1 : 1.8);
  }
  const pageTexture = canvasTexture(pageCanvas);
  const pages = standard({ color: 0xe0dac9, roughness: .94, map: pageTexture });
  mesh(notebook, roundedSlab(1.60, 2.17, .172, .052), pages, .018, .126, 0);
  const writingCanvas = makeCanvas(512, 768);
  const writingCtx = writingCanvas.getContext('2d')!;
  writingCtx.fillStyle = '#e8e1cf';
  writingCtx.fillRect(0, 0, 512, 768);
  writingCtx.fillStyle = '#817c6c';
  writingCtx.font = '500 17px Arial, sans-serif';
  writingCtx.fillText('SMALL IDEAS, BIG POSSIBILITIES.', 59, 91);
  writingCtx.strokeStyle = 'rgba(127,135,130,.22)';
  writingCtx.lineWidth = 1;
  for (let row = 180; row < 710; row += 61) {
    writingCtx.beginPath();
    writingCtx.moveTo(53, row); writingCtx.lineTo(465, row); writingCtx.stroke();
  }
  const writingPage = mesh(notebook, new THREE.PlaneGeometry(1.53, 2.07),
    standard({ color: 0xffffff, map: canvasTexture(writingCanvas), roughness: .96 }), .018, .214, 0);
  writingPage.rotation.x = -Math.PI / 2;
  writingPage.castShadow = false;
  // Explicit vertical edge planes keep the horizontal paper grain correctly scaled.
  const foreEdge = mesh(notebook, new THREE.PlaneGeometry(2.105, .166), pages, .821, .126, 0);
  foreEdge.rotation.y = Math.PI / 2;
  const lowerEdge = mesh(notebook, new THREE.PlaneGeometry(1.52, .166), pages, .026, .126, 1.09);
  const upperEdge = mesh(notebook, new THREE.PlaneGeometry(1.52, .166), pages, .026, .126, -1.09);
  upperEdge.rotation.y = Math.PI;
  lowerEdge.castShadow = upperEdge.castShadow = foreEdge.castShadow = false;
  box(notebook, .09, .205, 2.18, bookEdge, -.794, .125, 0, .043);
  const elastic = standard({ color: 0x141d1a, roughness: .98, bumpMap: cloth, bumpScale: .003 });
  box(topCover, .069, .008, 2.225, elastic, .57, .254, 0, .003);
  const frontElastic = box(topCover, .069, .226, .01, elastic, .57, .135, 1.123, .004);
  const backElastic = box(topCover, .069, .226, .01, elastic, .57, .135, -1.123, .004);
  const elasticEdges = [frontElastic, backElastic];
  const ribbon = standard({ color: 0x9d7955, roughness: .93 });
  const ribbonMesh = box(notebook, .047, .005, .33, ribbon, -.25, .004, 1.20, .002);
  ribbonMesh.rotation.y = -.22;
  const imprintCanvas = makeCanvas(512, 256);
  const imprint = imprintCanvas.getContext('2d')!;
  imprint.textAlign = 'center'; imprint.textBaseline = 'middle';
  imprint.fillStyle = '#adb0a1'; imprint.font = '400 28px Arial, sans-serif';
  imprint.fillText('N O T E S', 256, 104);
  imprint.fillStyle = '#717e75'; imprint.font = '400 12px Arial, sans-serif';
  imprint.fillText('IDEAS / OBSERVATIONS / POSSIBILITIES', 256, 151);
  const imprintPlane = mesh(topCover, new THREE.PlaneGeometry(1.12, .56),
    standard({ map: canvasTexture(imprintCanvas), transparent: true, depthWrite: false, roughness: .86 }), -.08, .252, -.40);
  imprintPlane.rotation.x = -Math.PI / 2; imprintPlane.castShadow = false;
  const pen = new THREE.Group();
  pen.position.set(-.02, .304, .18);
  pen.rotation.set(Math.PI / 2, 0, -.24);
  notebook.add(pen);
  mesh(pen, new THREE.CylinderGeometry(.036, .036, 1.47, 16), graphiteMetal);
  mesh(pen, new THREE.CylinderGeometry(.035, .035, .115, 16), brushedMetal, 0, .70, 0);
  mesh(pen, new THREE.CylinderGeometry(.019, .034, .16, 16), brushedMetal, 0, -.805, 0);
  mesh(pen, new THREE.ConeGeometry(.018, .05, 12), darkPlastic, 0, -.908, 0).rotation.z = Math.PI;
  box(pen, .022, .32, .017, brushedMetal, .041, .48, 0, .007);

  // Sample the nib paths once. The same samples drive both pen and ink, without
  // allocating geometry, textures or vectors during the animation.
  const inkMaterial = standard({ color: 0x30494d, roughness: .98 });
  const inkSegments = 240;
  const inkSteps = 3;
  const inkLines: THREE.Mesh[] = [];
  const nibPaths: Float32Array[] = [];
  for (let line = 0; line < inkSteps; line++) {
    const points: THREE.Vector3[] = [];
    for (let point = 0; point <= 72; point++) {
      const u = point / 72;
      const envelope = Math.sin(Math.PI * u) ** .35;
      points.push(new THREE.Vector3(-.49 + .94 * u, .218,
        -.51 + line * .33 + envelope * (.025 * Math.sin(u * Math.PI * 18)
          + .015 * Math.sin(u * Math.PI * 29 + line))));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const samples = new Float32Array((inkSegments + 1) * 3);
    const point = new THREE.Vector3();
    for (let index = 0; index <= inkSegments; index++) {
      curve.getPointAt(index / inkSegments, point).toArray(samples, index * 3);
    }
    nibPaths.push(samples);
    const shape = new THREE.TubeGeometry(curve, inkSegments, .0038, 4, false);
    const ink = mesh(notebook, shape, inkMaterial);
    ink.name = `Notebook ink stroke ${line + 1}`;
    ink.castShadow = false;
    ink.visible = false;
    shape.setDrawRange(0, 0);
    inkLines.push(ink);
  }
  const notebookHome = notebook.position.clone();
  const notebookYaw = notebook.rotation.y;
  const mugHome = mug.position.clone();
  const mugYaw = mug.rotation.y;
  const penHome = pen.position.clone();
  const penRestRotation = pen.quaternion.clone();
  const penAxis = new THREE.Vector3(.42, .85, .30).normalize();
  const penWritingRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), penAxis);
  const penRestAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(penRestRotation);
  const nibHome = penHome.clone().addScaledVector(penRestAxis, -.933);
  const currentPenAxis = new THREE.Vector3();
  const nib = new THREE.Vector3();
  const nextNib = new THREE.Vector3();
  const movingNib = new THREE.Vector3();
  const strokeDuration = 3.2;
  const lineTravelDuration = 1.1;
  const returnTravelDuration = 1.8;
  const lineDuration = strokeDuration + lineTravelDuration;
  const writingCycleDuration = lineDuration * (inkSteps - 1) + strokeDuration + returnTravelDuration;
  const ease = (value: number, start = 0, end = 1) => {
    const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const sampleNib = (line: number, progress: number, target: THREE.Vector3) => {
    const position = THREE.MathUtils.clamp(progress, 0, 1) * inkSegments;
    const index = Math.min(Math.floor(position), inkSegments - 1);
    const fraction = position - index;
    const path = nibPaths[line];
    const offset = index * 3;
    target.set(
      THREE.MathUtils.lerp(path[offset], path[offset + 3], fraction),
      THREE.MathUtils.lerp(path[offset + 1], path[offset + 4], fraction),
      THREE.MathUtils.lerp(path[offset + 2], path[offset + 5], fraction),
    );
  };

  return {
    notebook,
    mug,
    setNotebookPose(amount, time) {
      const engagement = THREE.MathUtils.clamp(amount, 0, 1);
      const lift = ease(engagement, 0, .72);
      notebook.position.copy(notebookHome);
      notebook.position.y += .18 * lift;
      notebook.rotation.set(-.025 * lift, notebookYaw + .018 * lift, -.012 * lift);
      coverHinge.rotation.z = 2.15 * ease(engagement, .20, .98);

      // The elastic slips back over the cover edge before the hinge opens.
      const elasticRelease = ease(engagement, 0, .20);
      for (const edge of elasticEdges) {
        edge.scale.y = 1 - .81 * elasticRelease;
        edge.position.y = .135 + .092 * elasticRelease;
      }

      // The shared controller starts this clock once the pickup has settled.
      const elapsed = Math.max(0, time - .15);
      const cycle = elapsed % writingCycleDuration;
      const line = Math.min(Math.floor(cycle / lineDuration), inkSteps - 1);
      const lineTime = cycle - line * lineDuration;
      sampleNib(line, ease(lineTime / strokeDuration), nib);
      if (lineTime > strokeDuration) {
        const travelDuration = line === inkSteps - 1 ? returnTravelDuration : lineTravelDuration;
        const travel = ease((lineTime - strokeDuration) / travelDuration);
        sampleNib((line + 1) % inkSteps, 0, nextNib);
        nib.lerp(nextNib, travel);
        nib.y += .13 * Math.sin(Math.PI * travel) ** 2;
      }

      // One broad pickup arc keeps the nib above and to the right of the cover
      // sweep. Rotation spans the same motion, so reversal cannot snap the pen.
      const pickup = ease(engagement);
      const pickupArc = Math.sin(Math.PI * pickup) ** 2;
      pen.quaternion.slerpQuaternions(penRestRotation, penWritingRotation, pickup);
      currentPenAxis.set(0, 1, 0).applyQuaternion(pen.quaternion);
      movingNib.lerpVectors(nibHome, nib, pickup);
      movingNib.x += pickupArc;
      movingNib.y += .85 * pickupArc;
      pen.position.copy(movingNib).addScaledVector(currentPenAxis, .933);
      for (let index = 0; index < inkSteps; index++) {
        const written = ease((elapsed - index * lineDuration) / strokeDuration);
        const ink = inkLines[index];
        ink.visible = engagement > .24 && written > 0;
        ink.geometry.setDrawRange(0, Math.floor(written * inkSegments) * 24);
      }
    },
    setMugPose(amount, _time) {
      const engagement = THREE.MathUtils.clamp(amount, 0, 1);
      const lift = ease(engagement, 0, .78);
      const reach = ease(engagement, .16, .90);
      const tilt = ease(engagement, .34, .98);
      const arc = Math.sin(Math.PI * engagement) ** 2;
      mug.position.copy(mugHome);
      mug.position.x += .055 * reach + .018 * arc;
      mug.position.y += .34 * lift + .02 * arc;
      mug.position.z += .09 * reach;
      // On the way back this same sequence restores upright orientation before
      // the cup descends through its final few centimetres onto the desk.
      mug.rotation.set(.09 * tilt, mugYaw + .045 * reach, -.045 * tilt);
      // Counter-rotate around the liquid's own centre, preserving a level surface.
      coffeeLevel.quaternion.copy(mug.quaternion).invert();
    },
  };
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function roundedOutline(width: number, height: number, radius: number): THREE.Shape {
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function roundedSlab(width: number, depth: number, height: number, radius: number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(roundedOutline(width, depth, radius), {
    depth: height, steps: 1, bevelEnabled: false, curveSegments: 12,
  });
  geometry.translate(0, 0, -height / 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
