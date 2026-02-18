# Implementation Plan: Premium Low Poly Shadows

This plan details the steps to implement the "Toytown" shadow style as defined in the design document.

## Phase 1: Environment & Engine Setup

1.  **Canvas Configuration**:
    - Update `src/App.tsx` to ensure `shadows` prop is enabled on `<Canvas />`.
    - Ensure `OrthographicCamera` has sufficient `near` and `far` planes for shadow rendering.

2.  **Shadow Map Type**:
    - Set `gl.shadowMap.type` to `THREE.PCFSoftShadowMap` (usually done automatically by Drei's SoftShadows, but good to verify).

## Phase 2: Lighting & Soft Shadows Integration

3.  **SoftShadows Component**:
    - Import and add `<SoftShadows />` from `@react-three/drei` into `src/components/GameScene.tsx`.
    - Recommended props: `size={25}`, `samples={10}`, `focus={0.5}`.

4.  **HemisphereLight**:
    - Replace the `<ambientLight />` or add a `<hemisphereLight />` in `GameScene.tsx`.
    - Props: `intensity={0.5}`, `color="#ffffff"` (sky), `groundColor="#8b4513"` (ground).

## Phase 3: Directional Light Refinement

5.  **Shadow Camera Adjustment**:
    - Reduce `shadow-camera-left`, `right`, `top`, `bottom` from `100` to `50`.
    - Adjust `shadow-camera-far` and `near` for a tight fit.

6.  **Bias Tuning**:
    - Set `shadow-bias={-0.0001}`.
    - Set `shadow-normalBias={0.05}`.

7.  **Shadow Map Quality**:
    - Keep `shadow-mapSize-width={2048}` and `shadow-mapSize-height={2048}`.

## Phase 4: Verification

8.  **Test Shadow Contact**: Verify that the tank's treads and the cactus bases touch their shadows without gaps.
9.  **Test Shadow Diffusion**: Verify that shadows become softer as they move away from the objects.
10. **Test Follow Logic**: Ensure the shadow frustum moves smoothly with the tank without "shimmering".
