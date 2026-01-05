export class HapticManager {
    /**
     * Trigger a sharp, mechanical snap sensation.
     * Used when parts connect.
     */
    public static triggerSnap() {
        if (navigator.vibrate) {
            navigator.vibrate(50); // 50ms @ 1.0 intensity
        }
    }

    /**
     * Trigger a rhythmic strain sensation.
     * Used when structure is under load.
     */
    public static triggerStrain() {
        if (navigator.vibrate) {
            navigator.vibrate([10, 30, 10, 30]); // Micro-pulses
        }
    }

    /**
     * Trigger a jagged failure sensation.
     * Used during structural collapse.
     */
    public static triggerFailure() {
        if (navigator.vibrate) {
            // Randomized pattern
            navigator.vibrate([50, 20, 100, 30, 50, 10, 200]); 
        }
    }
}
