// js/snowfall-main.js
// Entry point for Snowfall particles demo

import { initHeader } from './header.js';
import { initSnowfall, cleanup, handleResize } from './snowfall-controller.js';
import { log } from './logger.js';

/**
 * Check if Rive runtime is available
 */
function isRiveAvailable() {
    return typeof window.rive !== 'undefined';
}

/**
 * Wait for Rive runtime to load (with timeout)
 */
async function waitForRive(timeout = 5000) {
    const start = Date.now();

    return new Promise((resolve) => {
        function check() {
            if (isRiveAvailable()) {
                resolve(true);
            } else if (Date.now() - start > timeout) {
                resolve(false);
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    });
}

/**
 * Main initialization
 */
async function init() {
    initHeader();
    log('Snowfall Demo initializing...');

    const loadingOverlay = document.getElementById('loadingOverlay');

    try {
        // Wait for Rive runtime
        const riveAvailable = await waitForRive();
        if (!riveAvailable) {
            log('Rive runtime not loaded', 'error');
            return;
        }

        log('Rive runtime available');

        // Initialize Rive with snowfall animation
        const canvas = document.getElementById('snowfallCanvas');
        if (!canvas) {
            log('Canvas element not found', 'error');
            return;
        }

        const success = await initSnowfall(canvas);

        if (success) {
            log('Snowfall initialized');
        } else {
            log('Failed to initialize snowfall', 'error');
        }
    } catch (err) {
        log(`Initialization failed: ${err.message}`, 'error');
        console.error(err);
    } finally {
        loadingOverlay?.classList.add('hidden');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Handle window resize
window.addEventListener('resize', debounce(handleResize, 250));

// Handle devicePixelRatio changes (e.g., moving window between displays)
window
    .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    .addEventListener('change', handleResize);

/**
 * Simple debounce utility
 */
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
