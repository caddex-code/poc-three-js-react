# Design Doc: Organic Cactus System Refactor

## 1. Problem Statement
The current cactus implementation uses perfect primitives (`cylinderGeometry`), which contrasts harshly with the organic, low-poly distorted style of the rocks. Additionally, the arm generation is too frequent and predictable, leading to visual repetition and a "robotic" look in the desert environment.

## 2. Proposed Solution
Transform the `Cactus` component into a multi-species procedural generator that shares the same "distorted geometry" DNA as the `Rock` component.

### 2.1 Geometric DNA (The Jitter Effect)
*   Implement a vertex-distortion function similar to `Rock.tsx`.
*   Every cactus primitive (cylinders, spheres) will have its vertices slightly repositioned based on the `seed`.
*   This removes perfect lines and adds a natural, "grown" appearance.

### 2.2 Species Variety (The Three Types)
Based on the `seed`, a cactus will now be classified into one of three species:

1.  **Organic Saguaro (Tall):**
    *   **Main Stem:** Distorted cylinder.
    *   **New Arm Logic:** 
        *   0 arms (50% probability).
        *   1 arm (35% probability).
        *   2 arms (15% probability).
    *   **Arm Structure:** Uneven heights, slightly thinner than the trunk, and non-perfect exit angles (diagonal/wild growth).

2.  **Barrel Cactus (Round):**
    *   **Geometry:** Dodecahedron or Icosahedron flattened into a squat sphere.
    *   **Deformation:** Stronger jitter to look like a fleshy desert plant.

3.  **Cluster / Fingers (Group):**
    *   **Geometry:** 3 to 5 slender, short distorted cylinders.
    *   **Growth:** Radiating outwards from a central point at varying angles and heights.

### 2.3 Visual Polish (Color & Material)
*   **Dynamic Palette:** Instead of a single hex color, use a range of desert greens:
    *   `#2E8B57` (Sea Green - Standard)
    *   `#556B2F` (Dark Olive Green - Dry/Old)
    *   `#6B8E23` (Olive Drab - Young/Lush)
*   **Roughness:** Maintain high roughness (~0.9) and flat shading to emphasize the low-poly facets.

## 3. Success Criteria
*   Cacti no longer look like perfect cylinders.
*   Increased variety in the game world with three distinct silhouettes.
*   The frequency of arms is significantly reduced, making multis-armed cacti feel "special".
*   Visual consistency with the existing `Rock` component.
