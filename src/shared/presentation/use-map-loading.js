import { ref, onBeforeUnmount } from 'vue';

/**
 * Tracks Leaflet map initialization and tile loading state with a safe timeout fallback.
 * @param {number} [fallbackMs=2500] - Maximum time to show the loading overlay after map mount.
 */
export function useMapLoading(fallbackMs = 2500) {
    const isMapLoading = ref(true);
    let fallbackTimer = null;

    function clearFallbackTimer() {
        if (fallbackTimer !== null) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    }

    function markLoaded() {
        clearFallbackTimer();
        isMapLoading.value = false;
    }

    function startFallbackTimer() {
        clearFallbackTimer();
        fallbackTimer = setTimeout(() => {
            isMapLoading.value = false;
            fallbackTimer = null;
        }, fallbackMs);
    }

    function resetMapLoading() {
        isMapLoading.value = true;
        startFallbackTimer();
    }

    startFallbackTimer();
    onBeforeUnmount(clearFallbackTimer);

    return {
        isMapLoading,
        markLoaded,
        startFallbackTimer,
        resetMapLoading
    };
}
