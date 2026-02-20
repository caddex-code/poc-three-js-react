# Design Doc: Artillery Shooting System with Mouse Aiming

## Overview

This document outlines the design for transforming the tank's shooting mechanic from a flat, straight-line bullet into a **mouse-aimed artillery system** with parabolic projectile trajectories. This change is motivated by the introduction of irregular dune terrain, which renders the previous line-of-sight shooting ineffective. The new system draws inspiration from **Gunbound** (vertical cannon inclination, parabolic arcs) and **League of Legends** (mouse-driven aiming with ground indicators).

## Objectives

- Implement **mouse-driven aiming** where the cursor position on the terrain determines the target point.
- Split the tank into **chassis** (terrain-following) and **turret** (mouse-following, terrain-stabilized).
- Fire projectiles along **parabolic arcs** that travel over obstacles and dunes.
- Display **visual aiming indicators**: range circle, landing reticle, and trajectory curve.
- Build an **extensible architecture** so the shooting behavior can be swapped (e.g., direct shot, mortar, guided) without changing the rest of the game.

## Technical Design

### 1. Extensible Shooting Strategy

An interface-based system decouples trajectory computation from the rest of the game. Each strategy encapsulates how a projectile travels.

```typescript
interface ShootingStrategy {
  calculateTrajectory(origin, target, config) → TrajectoryData
  getPosition(trajectory, t: 0→1) → Vector3
}
```

- **`ParabolicStrategy`** (initial): uses classical projectile motion $y = v_0 t - \frac{1}{2} g t^2$ plus a parabolic bump term $4h \cdot t \cdot (1-t)$ for configurable arc height. The bump ensures the trajectory always lands exactly at the target ($bump=0$ at $t=0$ and $t=1$, peaks at $arcHeight$ at $t=0.5$).
- **Future options**: `DirectStrategy` (straight line), `MortarStrategy` (high arc, short range), `GuidedStrategy` (homing).

Swapping strategies requires changing only the singleton export — no consumer code changes.

### 2. Independent Turret with Terrain Stabilization

The tank's visual hierarchy is split into two logical groups:

| Part | Behavior |
|------|----------|
| **Chassis** (body + tracks) | Tilts with terrain normal, steered with keyboard A/D |
| **Turret** (turret block + barrel) | Follows mouse horizontally (Y-axis rotation), auto-inclines vertically based on target distance. **Counter-rotates** the terrain tilt to stay perfectly level |

The stabilization works by computing the inverse of the terrain tilt quaternion and applying it to the turret before its own yaw rotation. Turret yaw uses a single-pass world-space smoothing with angle wrapping to avoid spinning artifacts.

### 3. Mouse → Terrain Raycasting

A `Raycaster` projects from the camera through the mouse position to find the terrain intersection:

1. Cast ray against a horizontal `Plane` at the tank's Y height (fast).
2. Refine $y$ using `getHeight(x, z)` from the Simplex noise heightmap.
3. Clamp to `MAX_RANGE` radius in XZ plane if the cursor is beyond range.

This runs imperatively in `useFrame` (not React state) to avoid re-render overhead.

### 4. Visual Aiming Indicators

Three elements rendered as a single `<AimingSystem>` component, all updated imperatively each frame:

| Element | Geometry | Material | Behavior |
|---------|----------|----------|----------|
| **Range circle** | `BufferGeometry` ring (64 segments), vertex Y sampled from `getHeight()` | `LineDashedMaterial`, white, 35% opacity, `depthTest: false` | Hugs terrain surface per-vertex each frame. Follows tank position |
| **Landing reticle** | `RingGeometry` + `CircleGeometry` | `MeshBasicMaterial`, red, 60% opacity, `depthTest: false` | Follows clamped cursor, aligned to terrain normal via quaternion. Subtle pulse animation |
| **Trajectory curve** | `BufferGeometry` line (30 sample points), last point pinned to reticle | `LineDashedMaterial`, white, 50% opacity | Gunbound-style high parabolic arc from barrel tip to landing point, recomputed every frame |

### 5. Parabolic Bullet Physics

The bullet follows the pre-calculated `TrajectoryData`:

- **Progress** advances via normalized time $t \in [0, 1]$ based on `trajectory.duration`.
- **Position** is computed by the active strategy's `getPosition(t)`.
- **Collision** is checked at $t \geq 1$ against targets within a configurable splash radius around the landing point.
- **Flight duration** is derived from horizontal distance / projectile speed, guaranteeing consistent travel feel across distances.

### 6. Out-of-Range Behavior

When the mouse is beyond `MAX_RANGE`, the landing reticle **clamps** to the edge of the range circle in the direction of the mouse. The trajectory renders to that clamped point. The player can always fire.

## File Map

| File | Action |
|------|--------|
| `src/systems/ShootingStrategy.ts` | **New** — Strategy interface + `ParabolicStrategy` |
| `src/hooks/useMouseAim.ts` | **New** — Raycaster hook |
| `src/components/AimingSystem.tsx` | **New** — Visual indicators |
| `src/components/Tank.tsx` | **Modify** — Chassis/turret split, stabilization |
| `src/components/Bullet.tsx` | **Modify** — Trajectory-based movement |
| `src/components/GameScene.tsx` | **Modify** — Integration |
| `src/config/constants.ts` | **Modify** — `ARTILLERY_CONFIG` |

## Success Criteria

- [ ] Turret rotates independently toward the mouse cursor without affecting chassis movement.
- [ ] Turret stays perfectly level when the tank is on a sloped dune.
- [ ] Range circle, landing reticle, and trajectory curve are visible and follow the mouse in real-time.
- [ ] Projectile follows the visible parabolic arc and impacts at the reticle position.
- [ ] Targets within splash radius of the landing point are destroyed and score is added.
- [ ] Out-of-range cursor clamps the reticle to the range circle edge.
- [ ] Performance remains stable (60fps) with all indicators rendering.
