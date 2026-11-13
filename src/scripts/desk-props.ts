import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type PropResources = {
  geometry: <T extends THREE.BufferGeometry>(value: T) => T;
  material: <T extends THREE.Material>(value: T) => T;
  canvasTexture: (canvas: HTMLCanvasElement) => THREE.CanvasTexture;
  instances: Set<THREE.InstancedMesh>;
};

/** Original, physically scaled desk objects; all geometry and textures stay local. */
export function createDeskProps(parent: THREE.Group, resources: PropResources): void {
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
  const coffeeMat = physical({ color: 0x130903, roughness: .075, metalness: 0,
    ior: 1.33, envMapIntensity: 1, specularIntensity: 1 });
  const coffeeProfile = [
    [.423, .873], [.421, .867], [.417, .863], [.410, .860],
    [.398, .8585], [.370, .858], [0, .858],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const coffee = mesh(mug, new THREE.LatheGeometry(coffeeProfile, 96), coffeeMat);
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
  mesh(notebook, roundedSlab(1.69, 2.28, .043, .075), bookCover, 0, .227, 0);
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
  // Explicit vertical edge planes keep the horizontal paper grain correctly scaled.
  const foreEdge = mesh(notebook, new THREE.PlaneGeometry(2.105, .166), pages, .821, .126, 0);
  foreEdge.rotation.y = Math.PI / 2;
  const lowerEdge = mesh(notebook, new THREE.PlaneGeometry(1.52, .166), pages, .026, .126, 1.09);
  const upperEdge = mesh(notebook, new THREE.PlaneGeometry(1.52, .166), pages, .026, .126, -1.09);
  upperEdge.rotation.y = Math.PI;
  lowerEdge.castShadow = upperEdge.castShadow = foreEdge.castShadow = false;
  box(notebook, .09, .205, 2.18, bookEdge, -.794, .125, 0, .043);
  const elastic = standard({ color: 0x141d1a, roughness: .98, bumpMap: cloth, bumpScale: .003 });
  box(notebook, .069, .008, 2.225, elastic, .57, .254, 0, .003);
  box(notebook, .069, .226, .01, elastic, .57, .135, 1.123, .004);
  box(notebook, .069, .226, .01, elastic, .57, .135, -1.123, .004);
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
  const imprintPlane = mesh(notebook, new THREE.PlaneGeometry(1.12, .56),
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

