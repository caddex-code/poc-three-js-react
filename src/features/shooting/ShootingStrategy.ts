import { Vector3 } from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrajectoryData {
    origin: Vector3;
    target: Vector3;
    duration: number;
    /** Pre-computed sample points for visual trajectory line */
    points: Vector3[];
    /** Launch velocity vector (base, without arc bump) */
    launchVelocity: Vector3;
    /** Gravity value used */
    gravity: number;
    /** Extra arc height added via parabolic bump */
    arcHeight: number;
}

export interface ArtilleryConfig {
    maxRange: number;
    projectileSpeed: number;
    gravity: number;
    arcHeightFactor: number;
    trajectoryPoints: number;
}

// ─── Strategy Interface ──────────────────────────────────────────────────────

export interface ShootingStrategy {
    /**
     * Calculate full trajectory data from origin to target.
     */
    calculateTrajectory(
        origin: Vector3,
        target: Vector3,
        config: ArtilleryConfig
    ): TrajectoryData;

    /**
     * Get the projectile position at normalized time t (0 → 1).
     */
    getPosition(trajectory: TrajectoryData, t: number): Vector3;
}

// ─── Parabolic (Artillery) Strategy ──────────────────────────────────────────

export class ParabolicStrategy implements ShootingStrategy {
    calculateTrajectory(
        origin: Vector3,
        target: Vector3,
        config: ArtilleryConfig
    ): TrajectoryData {
        const horizontalDelta = new Vector3(
            target.x - origin.x,
            0,
            target.z - origin.z
        );
        const horizontalDistance = horizontalDelta.length();

        // Flight duration based on horizontal distance and projectile speed
        const duration = Math.max(horizontalDistance / config.projectileSpeed, 0.3);

        // Vertical displacement
        const dy = target.y - origin.y;

        // Horizontal velocity: constant speed over duration
        const vHorizontal = horizontalDelta.clone().divideScalar(duration);

        // Base vertical velocity that lands EXACTLY at target.y:
        // y(d) = origin.y + vy*d - 0.5*g*d² = target.y
        // → vy = (dy + 0.5*g*d²) / d
        const vy = (dy + 0.5 * config.gravity * duration * duration) / duration;

        const launchVelocity = new Vector3(vHorizontal.x, vy, vHorizontal.z);

        // Arc height: added as a separate parabolic bump 4h·t·(1-t)
        // This peaks at `arcHeight` when t=0.5 and is 0 at t=0 and t=1
        const arcHeight = horizontalDistance * config.arcHeightFactor;

        // Pre-compute trajectory sample points for the visual curve
        const points: Vector3[] = [];
        const numPoints = config.trajectoryPoints;
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            points.push(this.getPositionInternal(origin, launchVelocity, config.gravity, t, duration, arcHeight));
        }

        return {
            origin: origin.clone(),
            target: target.clone(),
            duration,
            points,
            launchVelocity: launchVelocity.clone(),
            gravity: config.gravity,
            arcHeight,
        };
    }

    getPosition(trajectory: TrajectoryData, t: number): Vector3 {
        return this.getPositionInternal(
            trajectory.origin,
            trajectory.launchVelocity,
            trajectory.gravity,
            t,
            trajectory.duration,
            trajectory.arcHeight
        );
    }

    private getPositionInternal(
        origin: Vector3,
        launchVelocity: Vector3,
        gravity: number,
        t: number,
        duration: number,
        arcHeight: number
    ): Vector3 {
        const elapsed = t * duration;

        // Parabolic bump: peaks at arcHeight when t=0.5, zero at t=0 and t=1
        const arcBump = arcHeight * 4 * t * (1 - t);

        return new Vector3(
            origin.x + launchVelocity.x * elapsed,
            origin.y + launchVelocity.y * elapsed - 0.5 * gravity * elapsed * elapsed + arcBump,
            origin.z + launchVelocity.z * elapsed
        );
    }
}

// Default singleton instance
export const parabolicStrategy = new ParabolicStrategy();

