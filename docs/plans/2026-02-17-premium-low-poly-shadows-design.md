# Design: Premium Low Poly Shadows (Toytown Style)

This document outlines the design for upgrading the shadow system to a "premium toy-town" aesthetic, suitable for the game's low-poly art style. It addresses the issues of shadows appearing detached from objects and poor diffusion quality.

## Goals
- Elimination of "Peter Panning" (shadows detached from object bases).
- Smooth, high-quality shadow edges with a "miniature" feel.
- Improved color depth and atmosphere in shadowed areas.
- Optimized performance by concentrating shadow resolution where the action is.

## 1. Technical Architecture

### Shadow Algorithm
- **Type**: `THREE.PCFSoftShadowMap`.
- **Softening**: Integrate `<SoftShadows />` from `@react-three/drei` to provide physically-based shadow softening (penumbra) that increases with distance from the caster.

### Lighting Setup
- **DirectionalLight**: The primary shadow caster, following the tank.
- **HemisphereLight**: Replace generic `AmbientLight` with a sky-to-ground gradient to add color variety in shadows (e.g., Sky Blue to Sandy Brown).
- **Shadow Camera (Frustum)**: Reduced from 100 units to ~50 units to concentrate the 2048px map size, resulting in higher fidelity.

## 2. Visual Polish

### Anchoring (Bias Tuning)
- **Shadow Bias**: Set to a small negative value (`-0.0001`) to prevent self-shadowing artifacts (acne).
- **Normal Bias**: Set to a higher value (`~0.05`) to push shadows into the geometry, ensuring they start exactly where the model touches the ground.

### Shadow Coloration
- Shadows will not be pure black/grey. By using a `HemisphereLight`, the shadowed areas will inherit logic from the "sky" color, creating a more organic, outdoor feel.

## 3. Implementation Details

- **File**: `src/components/GameScene.tsx` & `src/App.tsx`.
- **Primary Components**:
    - `<SoftShadows />` in `App.tsx` or `GameScene.tsx`.
    - Updated `<directionalLight />` properties.
    - Updated `<Canvas />` configuration.

## 4. Success Criteria
- Shadows appear "pinned" to the base of tanks and cactus models.
- Shadow edges are smooth and diffuse without noticeable pixelation.
- Moving shadows remain stable (no flickering) due to optimized frustum and soft filtering.
