
# Design Doc: "Heavy Howitzer" Tank Model Update

## Overview

We will replace the current placeholder box-tank with a **"Heavy Howitzer"** style model. This design focuses on a grounded, military-industrial aesthetic with a massive, functional artillery cannon. The goal is to make the tank look powerful and "resaltante" (striking) while supporting the new artillery gameplay mechanics (high-angle shooting).

## Visual Style: "Industrial Juggernaut"

*   **Vibe:** Heavy, solid, powerful. Not sleek or fast. It looks like it fires shells that weigh as much as a person.
*   **Color Palette:**
    *   **Primary:** **Olive Drab (`#556B2F`)** (Classic Military).
    *   **Secondary:** Dark Gunmetal (`#2F4F4F`) for mechanical parts (tracks, vents, barrel base).
    *   **Accents:** Safety Orange (`#FF4500`) stripes on the turret and barrel tip to make it "pop" and look active.
    *   **Details:** Rusty bolts, darkened exhaust vents.

## Geometry Breakdown

We will build this using React Three Fiber primitives (Box, Cylinder) but combined in a more complex hierarchy to create detail without needing external assets yet.

### 1. Chassis (The Base)
*   **Shape:** Wide and low profile for stability.
*   **Tracks:**
    *   Instead of simple boxes, use multiple wheels (cylinders) inside a track frame.
    *   Add a "mudguard" armor plate over the top of the tracks.
*   **Details:**
    *   Rear engine block with exhaust pipes sticking up (for smoke effects later).
    *   Front headlights (mesh emissive material).

### 2. Turret (The Brain)
*   **Shape:** Asymmetric or hexagonal block, not just a cube.
*   **Rotation:** Rotates 360° on the Y-axis.
*   **Details:**
    *   Commander's hatch on top.
    *   Antenna wiring whipping around (physics-based or simple animation).
    *   "Recoil Spades" or stabilizers at the back (purely visual).

### 3. The Cannon (The Artillery)
*   **Barrel:** Long, thick cylinder.
*   **Muzzle Brake:** A wider, slotted cylinder at the tip (classic artillery look).
*   **Recoil Sleeve:** A thicker section at the base where the barrel slides into the turret.
*   **Aiming:** **Purely Analog** (Visual alignment based on barrel angle and HUD reticle, no laser sight).
*   **Elevation:**
    *   **Pivot Point:** Must be clearly visible. The whole barrel assembly pivots up to 45-60 degrees.
    *   **Hydraulics:** Visual pistons that expand/contract as the barrel aims up (optional polish).

## Animation & "Juice" Support

The model hierarchy will support:
1.  **Recoil:** The barrel (`barrelRef`) will have a child mesh that slides backward on local Z axis when firing.
2.  **Kickback:** The entire `chassisRef` can rock backward slightly on firing.
3.  **Loading:** The safety orange lights could pulse when "reloading".

## Implementation Plan

### `src/components/Tank.tsx`
Refactor the existing functional component to replace the visual mesh tree.

```tsx
<group ref={chassisRef}>
  <Tracks />
  <Hull />
  <group ref={turretRef}>
    <TurretBody />
    <group ref={barrelPivotRef}> {/* Rotates on X axis for elevation */}
       <BarrelAssembly /> {/* Slides on Z axis for recoil */}
    </group>
  </group>
</group>
```
