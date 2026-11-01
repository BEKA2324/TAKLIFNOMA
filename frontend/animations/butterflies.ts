import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { FlightState } from './flight.ts';
import { createFlightStates, stepFlights } from './flight.ts';

export interface ButterflyScene {
  setVisible(value: boolean): void;
  dispose(): void;
}
export function prepareButterflyMaterials(root: THREE.Object3D) {
  const materials = new Set<THREE.MeshStandardMaterial>();
  root.traverse((object) => {
    const node = object as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
    >;
    if (node.material)
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        materials.add(material);
  });
  for (const material of materials) {
    // The supplied atlas has opaque black padding, rather than an alpha channel.
    // Key only near-black texels before lighting so dark lighting cannot cut holes.
    material.transparent = false;
    material.alphaTest = 0.5;
    material.depthWrite = true;
    material.alphaToCoverage = true;
    material.forceSinglePass = true;
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = function (shader, renderer) {
      previous.call(this, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `
    float wingInk = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
    diffuseColor.a *= smoothstep(0.008, 0.05, wingInk);
    #include <alphatest_fragment>
   `,
      );
    };
    material.customProgramCacheKey = () => 'luma-butterfly-cutout-v2';
    material.needsUpdate = true;
  }
}

export async function createButterflies(host: HTMLElement): Promise<ButterflyScene> {
  const mobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 60);
  camera.position.z = 20;
  scene.add(new THREE.HemisphereLight(0xffe9fa, 0x6b4b89, 2.5));
  const light = new THREE.DirectionalLight(0xffd6ed, 2);
  light.position.set(1, 3, 8);
  scene.add(light);
  let model;
  try {
    model = await new GLTFLoader().loadAsync('/assets/butterfly.glb');
  } catch (error) {
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
  // Clones share geometry and textures, but each has its own skeleton and mixer.
  // Downsample GPU textures on small devices; the original GLB remains unchanged.
  if (mobile && typeof createImageBitmap === 'function') {
    const textures = new Set<THREE.Texture>();
    model.scene.traverse((object) => {
      const node = object as THREE.Mesh;
      if (node.material)
        for (const material of Array.isArray(node.material) ? node.material : [node.material])
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    });
    for (const texture of textures) {
      const image = texture.image as ImageBitmap | HTMLImageElement | undefined;
      if (image && Math.max(image.width, image.height) > 1536) {
        try {
          const ratio = 1536 / Math.max(image.width, image.height);
          texture.image = await createImageBitmap(image, {
            resizeWidth: Math.round(image.width * ratio),
            resizeHeight: Math.round(image.height * ratio),
            resizeQuality: 'high',
          });
          texture.needsUpdate = true;
        } catch {
          /* Keep the original texture when resizing is unsupported. */
        }
      }
    }
  }
  prepareButterflyMaterials(model.scene);
  model.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model.scene),
    size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  const normalize = 1 / Math.max(size.x, size.y, size.z),
    flock: {
      flight: THREE.Group;
      pose: THREE.Group;
      mixer: THREE.AnimationMixer;
      state: FlightState;
    }[] = [];
  const states = createFlightStates(mobile ? 4 : 8, (6 * innerWidth) / innerHeight, mobile);
  for (let i = 0; i < (mobile ? 4 : 8); i++) {
    const butterfly = clone(model.scene);
    butterfly.position.sub(center);
    const pose = new THREE.Group();
    pose.add(butterfly);
    pose.rotation.x = 1.22;
    const scale = normalize * (mobile ? 0.9 : 1.1) * (1 + (i % 3) * 0.18);
    pose.scale.setScalar(scale);
    const flight = new THREE.Group();
    flight.add(pose);
    scene.add(flight);
    const mixer = new THREE.AnimationMixer(butterfly);
    for (const clip of model.animations) mixer.clipAction(clip).play();
    mixer.timeScale = 2.6 + (i % 4) * 0.25;
    mixer.update(i * 0.24);
    flock.push({ flight, pose, mixer, state: states[i] });
  }
  let frame = 0,
    visible = false,
    disposed = false,
    lastFrame = 0,
    flightTime = 0,
    halfWidth = 8;
  function resize() {
    halfWidth = (6 * innerWidth) / innerHeight;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  function render(now: number) {
    if (!visible || document.hidden || disposed) return;
    frame = requestAnimationFrame(render);
    const elapsed = (now - lastFrame) / 1000;
    if (elapsed < 1 / (mobile ? 30 : 45)) return;
    const dt = Math.min(elapsed, 0.06);
    lastFrame = now;
    flightTime += dt;
    stepFlights(states, flightTime, dt, halfWidth);
    for (const bird of flock) {
      const b = bird.state,
        flutter = flightTime * 7 + b.phase;
      bird.flight.position.set(b.x, b.y, Math.sin(flightTime * 0.7 + b.phase) * 0.3);
      bird.flight.rotation.z = b.angle;
      bird.pose.rotation.y =
        Math.sin(flutter * 0.7) * 0.12 + THREE.MathUtils.clamp(b.turn, -0.65, 0.65) * 0.5;
      bird.pose.rotation.x = 1.15 + Math.sin(flutter) * 0.1;
      bird.pose.position.y = Math.sin(flutter * 1.2) * 0.045;
      bird.mixer.update(dt);
    }
    renderer.render(scene, camera);
  }
  function resume() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !disposed) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(render);
    }
  }
  function onContextLost(e: Event) {
    e.preventDefault();
    cancelAnimationFrame(frame);
  }
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', resume);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', resume);
  resize();
  return {
    setVisible(value: boolean) {
      visible = value;
      host.hidden = !value;
      resume();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', resume);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        const node = object as THREE.Mesh;
        if (node.geometry) geometries.add(node.geometry);
        if (node.material)
          for (const mat of Array.isArray(node.material) ? node.material : [node.material])
            materials.add(mat);
      });
      for (const mat of materials) {
        for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
        mat.dispose();
      }
      for (const texture of textures) texture.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const bird of flock) {
        bird.mixer.stopAllAction();
        bird.mixer.uncacheRoot(bird.mixer.getRoot());
      }
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
