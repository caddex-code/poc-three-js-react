# Design Doc: Procedural Low-Poly Terrain Geography

## Overview
This document outlines the design for transforming the current flat floor into a procedural, low-poly terrain with dunes, valleys, and varied elevations. This will enhance the visual depth and strategic gameplay of the tank game.

## Objectives
- Replace the flat `planeGeometry` with a subdivided mesh.
- Implement a deterministic Perlin/Simplex noise-based heightmap.
- Ensure seamless transitions between chunks.
- Implement "Flat Shading" for a low-poly aesthetic.
- Adapt all game objects (tank, cacti, rocks, targets) to the new terrain height.
- Enable the tank to tilt and navigate based on terrain slopes.

## Technical Design

### 1. Geometry & Noise Generation
- **Subdivision:** Each chunk's ground mesh will use `planeGeometry` with at least 32x32 segments (1024 triangles) to allow for smooth-looking but sharp-edged terrain.
- **Noise Engine:** Use a deterministic noise function (e.g., world-space Simplex Noise) that takes `(x, z)` coordinates.
  - `height = noise(x * scale, z * scale) * amplitude`
  - High-frequency noise for small bumps, low-frequency for major dunes.
- **Visuals:** Use `meshStandardMaterial` with `flatShading: true` to emphasize the triangular facets.

### 2. Chunk Sychronization
- To avoid gaps between chunks, heights will be calculated using global world coordinates rather than local chunk coordinates.
- Ensure the vertices at the edges of chunk $(X, Z)$ exactly match the vertices at the edges of neighbors $(X+1, Z)$, etc.

### 3. Gameplay Mechanics & Interaction
- **Object Placement:** The `generateChunkData` function will calculate the $y$ position of every obstacle and target based on the noise function at that specific coordinate.
- **Tank Physics:**
  - The tank will use the noise function to determine its $y$ position in real-time.
  - **Tilt/Auto-Leveling:** Sample 3 points around the tank's center to calculate the terrain normal. Update the tank's rotation to align with this normal.
- **Slope Constraints:** Slopes above a certain angle (e.g., 40 degrees) will be treated as non-traversable or cause the tank to slide.

### 4. Performance & Optimization
- **Caching:** Calculated heights for a chunk will be stored in a `HeightMap` data structure within the `ChunkData`.
- **Pre-calculation:** High-density height data is calculated once per chunk generation, not every frame.
- **LOD (Optional):** Distant chunks can render with fewer subdivisions if necessary.

## Success Criteria
- [ ] No visible gaps between chunks.
- [ ] Terrain clearly shows "Low-Poly" facets with shadows.
- [ ] Tank follows the curves of the dunes smoothly.
- [ ] All obstacles (cacti, rocks, targets) are correctly grounded on the terrain.
- [ ] Performance remains stable (60fps) during traversal.
