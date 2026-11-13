import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Resources = {
  geometry: <T extends THREE.BufferGeometry>(value: T) => T;
  material: <T extends THREE.Material>(value: T) => T;
};

/** A static task light: real illumination plus inexpensive, softly feathered haze. */
export function createDeskLamp(parent: THREE.Group, resources: Resources) {
  const { geometry, material } = resources;
  const metal = material(new THREE.MeshStandardMaterial({ color: 0x262a31, metalness: .85, roughness: .26 }));
  const edge = material(new THREE.MeshStandardMaterial({ color: 0x73777d, metalness: 1, roughness: .24 }));
  const mesh = (shape: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry(shape), surface);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  mesh(new RoundedBoxGeometry(.73, .085, .72, 4, .035), metal, 4.16, -.13, -2.02);
  mesh(new THREE.CylinderGeometry(.029, .039, 2.51, 24), metal, 4.16, 1.15, -2.02);
  mesh(new RoundedBoxGeometry(1.66, .074, .23, 4, .025), metal, 3.45, 2.42, -2.02);
  const diffuser = mesh(new RoundedBoxGeometry(1.49, .012, .16, 3, .005),
    material(new THREE.MeshBasicMaterial({ color: 0xffe6b6, toneMapped: false })), 3.45, 2.376, -2.02);
  diffuser.castShadow = false;
  const joint = mesh(new THREE.CylinderGeometry(.065, .065, .11, 24), edge, 4.16, 2.39, -2.02);
  joint.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.055, .055, .004, 24), edge, 4.16, -.085, -1.80);

  const effects = new THREE.Group();
  effects.name = 'Warm desk lamp illumination';
  const light = new THREE.SpotLight(0xffd7a0, 29, 8, .72, 1, 2);
  light.position.set(3.43, 2.35, -1.98);
  light.target.position.set(2.0, -.15, .4);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.normalBias = .006;
  light.shadow.bias = -.00015;
  light.shadow.camera.near = .15;
  light.shadow.camera.far = 8;
  light.shadow.radius = 3;
  effects.add(light, light.target);

  // No bloom pass or ray marcher: a single 48-sided shell gives a soft dust-in-air beam.
  const start = light.position.clone();
  const end = light.target.position.clone();
  const length = start.distanceTo(end);
  const haze = new THREE.Mesh(
    geometry(new THREE.CylinderGeometry(.12, 1.38, length, 48, 1, true)),
    material(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { glow: { value: new THREE.Color(0xffd9ab) } },
      vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
        void main() { vUv=uv; vec4 p=modelViewMatrix*vec4(position,1.0);
          vNormal=normalize(normalMatrix*normal); vView=normalize(-p.xyz);
          gl_Position=projectionMatrix*p; }`,
      fragmentShader: `uniform vec3 glow; varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
        void main() { float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),1.7);
          float ends=smoothstep(0.0,0.22,vUv.y)*(1.0-smoothstep(0.90,1.0,vUv.y));
          float density=mix(0.013,0.055,vUv.y)*edge*ends;
          gl_FragColor=vec4(glow,density); }`,
    })),
  );
  haze.position.copy(start).add(end).multiplyScalar(.5);
  haze.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), start.clone().sub(end).normalize());
  haze.renderOrder = 3;
  effects.add(haze);
  return { effects, dispose: () => light.shadow.dispose() };
}
