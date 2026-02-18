# Implementation Plan: Procedural Low-Poly Terrain Geography

## Phase 1: Noise Utility & Mathematics
- [ ] Install `simplex-noise` or implement a lightweight seeded noise utility.
- [ ] Create `src/utils/noise.ts` with a `getHeight(x, z)` function.
- [ ] Test the function to ensure consistency across chunk boundaries.

## Phase 2: Mesh & Geometry Update
- [ ] Modify `Chunk.tsx` to use `planeBufferGeometry` with multiple segments (e.g., 32x32).
- [ ] Update vertex positions in the geometry based on the `getHeight` function.
- [ ] Compute vertex normals to ensure correct lighting for low-poly facets.
- [ ] Set `flatShading: true` on the ground material.

## Phase 3: Object Grounding
- [ ] Update `generateChunkData` in `src/utils/chunkManager.ts` to include `y` coordinates for all obstacles and targets using `getHeight`.
- [ ] Adjust `Cactus`, `Rock`, and `Target` components to receive $y$ position.

## Phase 4: Tank Interaction
- [ ] Update `src/store/gameStore.ts` or the tank movement logic to sample `getHeight(x, z)` for the tank's position.
- [ ] Implement a smooth interpolation for the tank's $y$ coordinate.
- [ ] Calculate the surface normal at the tank's position to adjust its $rotation.x$ and $rotation.z$ (tilt).

## Phase 5: Polishing & Validation
- [ ] Fine-tune noise amplitude and scale for "fun" traversal.
- [ ] Check performance on chunk boundaries.
- [ ] Verify shadows are correctly cast and received on the new terrain surface.
