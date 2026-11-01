import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { AnimationMixer, Box3, Vector3, SkinnedMesh } from 'three';
import type {
  Object3D,
  BufferGeometry,
  MeshStandardMaterial,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from 'three';
import { prepareButterflyMaterials } from '../frontend/animations/butterflies.ts';
import { createFlightStates, stepFlights } from '../frontend/animations/flight.ts';
// Browser image decoding is replaced only for this Node model validation.
Object.defineProperty(globalThis, 'self', { value: globalThis });
Object.defineProperty(globalThis, 'createImageBitmap', {
  value: async (blob: Blob) => loadImage(Buffer.from(await blob.arrayBuffer())),
});
Object.defineProperty(globalThis, 'ProgressEvent', {
  value: class {
    constructor(type: string, data: ProgressEventInit) {
      Object.assign(this, data);
    }
  },
});
const bytes = await readFile(new URL('../public/assets/butterfly.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  '',
);
assert(gltf.animations.length > 0, 'Embedded wing animation exists');
prepareButterflyMaterials(gltf.scene);
const first = clone(gltf.scene),
  second = clone(gltf.scene);
const skinned = (root: Object3D) => {
  const meshes: SkinnedMesh<BufferGeometry, MeshStandardMaterial>[] = [];
  root.traverse((node) => {
    if (node instanceof SkinnedMesh)
      meshes.push(node as SkinnedMesh<BufferGeometry, MeshStandardMaterial>);
  });
  return meshes[0];
};
const a = skinned(first),
  b = skinned(second);
assert(a && b);
assert.notEqual(a.skeleton, b.skeleton);
assert.notEqual(a.skeleton.bones[0], b.skeleton.bones[0]);
assert.equal(a.geometry, b.geometry);
assert.equal(a.material, b.material);
assert.equal(a.material.transparent, false);
assert.equal(a.material.depthWrite, true);
assert.equal(a.material.alphaTest, 0.5);
assert.equal(a.material.alphaToCoverage, true);
const shader = {
  fragmentShader: '#include <alphatest_fragment>',
  vertexShader: '',
  uniforms: {},
} as WebGLProgramParametersWithUniforms;
a.material.onBeforeCompile(shader, {} as WebGLRenderer);
assert(shader.fragmentShader.includes('diffuseColor.a *= smoothstep'));
const mixer = new AnimationMixer(first);
mixer.clipAction(gltf.animations[0]).play();
mixer.update(0.05);
first.updateMatrixWorld(true);
const before = a.skeleton.bones.map((bone) => bone.matrix.toArray());
mixer.update(0.6);
first.updateMatrixWorld(true);
assert(
  a.skeleton.bones.some((bone, i) =>
    bone.matrix.toArray().some((n, j) => Math.abs(n - before[i][j]) > 1e-7),
  ),
  'Wing animation changes the cloned skeleton',
);
const size = new Box3().setFromObject(first).getSize(new Vector3());
assert(size.x > 0 && size.z > 0);
const metadata = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
assert(metadata.asset.extras.author.includes('lunequinox'));
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
for (const text of [
  'butterfly-toggle',
  '/build/effects.js',
  'beka_winnn',
  'BEKA_XX1',
  'beka2324',
  '+998976289911',
  'CC BY 4.0',
])
  assert(html.includes(text), text);
for (const [mobile, width] of [
  [true, 2.1],
  [true, 3],
  [false, 8],
  [false, 12],
] as [boolean, number][]) {
  const birds = createFlightStates(mobile ? 4 : 8, width, mobile);
  for (let frame = 0; frame < 3600; frame++) {
    stepFlights(birds, frame / 60, 1 / 60, width);
    for (let i = 0; i < birds.length; i++)
      for (let j = i + 1; j < birds.length; j++)
        assert(
          Math.hypot(birds[i].x - birds[j].x, birds[i].y - birds[j].y) >=
            birds[i].radius + birds[j].radius + 0.15,
          'Wing spacing during a minute of simulated flight',
        );
    for (const bird of birds)
      assert(Number.isFinite(bird.x) && Number.isFinite(bird.y) && Number.isFinite(bird.angle));
  }
}
assert(html.includes('<title>Luma'));
assert(html.includes('>luma<span>'));
console.log(
  'PASS: animated GLB clones, opaque wing cutout, one-minute flight spacing at four screen widths, Luma branding and BEKA links.',
);
