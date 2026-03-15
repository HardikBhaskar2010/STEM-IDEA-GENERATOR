# Three.js Scene — GLB Asset Guide

## File Naming Conventions

All GLB models for the STEM landing live in `public/models/` (Vite serves
this directory as the static root).

| File                    | Description                          | Target size  |
|-------------------------|--------------------------------------|--------------|
| `planet.glb`            | Main hero planet (required)          | < 3 MB       |
| `planet_lo.glb`         | LOD-1 low-poly version               | < 500 KB     |
| `debris_*.glb`          | Floating object variants (optional)  | < 200 KB ea. |

## LOD Strategy

`ThreeHero.tsx` uses a **single GLB**. For production:

1. Create `planet_lo.glb` (< 1 k polys) for mobile / mid-range devices.
2. Detect GPU tier early (e.g. `detect-gpu` package) and pass the LOD path:

```tsx
const path = gpuTier.tier < 2 ? '/models/planet_lo.glb' : '/models/planet.glb';
```

## Recommended Export Settings (Blender → glTF)

- **Format**: glTF Binary (.glb)
- **Include**: Selected Objects only
- **Geometry**: Apply Modifiers ✓, UVs ✓, Normals ✓
- **Compression**: Draco (use `@google/draco3d` decoder in R3F)
- **Textures**: WebP, max 1024×1024 for mobile LOD / 2048×2048 for hi-res

## Draco Decoder Setup

```tsx
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/'); // copy node_modules/three/examples/js/libs/draco/ to public/draco/

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

drei's `useGLTF` auto-detects Draco when you call:
```tsx
useGLTF.setDecoderPath('/draco/');
```

## Placeholder GLB

Until the real asset is ready, `ThreeHero.tsx` renders a **procedural planet**:
a `SphereGeometry` + glowing torus ring + subtle atmosphere shell.
No GLB file is needed for development.

## Performance Notes

- `ThreeHero` is **lazy-loaded** in `Welcome.tsx` via `React.lazy` +
  `Suspense`, so it doesn't affect the first paint.
- DPR is capped at 1.5 (`dpr={[1, 1.5]}` on `<Canvas>`).
- Shadows use a 1024×1024 shadow map — reduce to 512 on mobile LOD.
- All floating debris use instanced-friendly primitives (`octahedron`,
  `torus`). Replace with `<InstancedMesh>` if count grows > 20.
