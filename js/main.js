// js/main.js
// Entry point - initialization and FPS counter

import { CONFIG } from './config.js';
import { preloadAllBuddies } from './asset-loader.js';
import { initRive, handleResize, cleanup } from './rive-controller.js';
import { initControls, showLoading, showPlaceholder, updateCurrentBuddyDisplay } from './ui-controls.js';
import { log } from './logger.js';
import * as dataAdapter from './data-adapter.js';

// Re-export for backwards compatibility
export { log };

/**
 * FPS counter
 */
function initFPSCounter() {
    let frameCount = 0;
    let lastTime = performance.now();
    const fpsDisplay = document.getElementById('fpsCounter');

    function updateFPS() {
        frameCount++;
        const now = performance.now();

        if (now - lastTime >= 1000) {
            if (fpsDisplay) {
                fpsDisplay.textContent = `${frameCount} FPS`;
            }
            frameCount = 0;
            lastTime = now;
        }

        requestAnimationFrame(updateFPS);
    }

    requestAnimationFrame(updateFPS);
}

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
    log('Reading Buddy Demo initializing...');
    showLoading(true);

    try {
        // Wait for Rive runtime to be available
        const riveAvailable = await waitForRive();
        if (!riveAvailable) {
            log('Rive runtime not loaded - check script tag', 'error');
            showLoading(false);
            showPlaceholder(true);
            return;
        }

        log('Rive runtime available');

        // Phase 1: Preload assets (runs in background)
        const preloadPromise = preloadAllBuddies().catch(err => {
            log(`Asset preload error: ${err.message}`, 'warn');
        });

        // Phase 2: Initialize UI controls
        initControls();

        // Wait for preload to complete
        await preloadPromise;

        // Phase 3: Initialize Rive with default buddy
        const canvas = document.getElementById('riveCanvas');
        if (!canvas) {
            log('Canvas element not found', 'error');
            showLoading(false);
            return;
        }

        const riveSuccess = await initRive(CONFIG.DEFAULT_BUDDY, canvas);

        if (!riveSuccess) {
            log('.riv file not loaded - showing placeholder', 'warn');
            showPlaceholder(true);
        } else {
            showPlaceholder(false);
        }

        updateCurrentBuddyDisplay(CONFIG.DEFAULT_BUDDY);

        // Load buddy data from mock API and test dialogue
        await dataAdapter.loadBuddyData();
        log(`Test dialogue: "${dataAdapter.getDialogue('adventure')}"`);

        // Phase 4: Start FPS counter
        initFPSCounter();

        // Phase 5: Set up window resize handler
        window.addEventListener('resize', debounce(handleResize, 250));

        // Cleanup on page unload
        window.addEventListener('beforeunload', cleanup);

        log('Initialization complete');
    } catch (err) {
        log(`Initialization failed: ${err.message}`, 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

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
