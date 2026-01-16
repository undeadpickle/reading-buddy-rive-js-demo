// js/main.js
// Entry point - initialization and FPS counter

import { CONFIG, SCENES } from './config.js';
import { preloadAllBuddies } from './asset-loader.js';
import { initRive, handleResize, cleanup } from './rive-controller.js';
import { initControls, showLoading, showPlaceholder, updateCurrentBuddyDisplay, populateDialoguePresets, updateSceneSelectorDisplay } from './ui-controls.js';
import { initGamificationUI } from './gamification-ui.js';
import { initSceneController, onSceneChange } from './scene-controller.js';
import { initBottomSheet } from './bottom-sheet.js';
import { initHeader } from './header.js';
import { log } from './logger.js';
import { waitForRive, debounce } from './utils.js';
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
 * Main initialization
 */
async function init() {
    initHeader();
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
        initGamificationUI();
        initBottomSheet();

        // Initialize scene controller and register callbacks
        await initSceneController(CONFIG.DEFAULT_SCENE);
        onSceneChange((newSceneId, oldSceneId) => {
            log(`Scene changed: ${oldSceneId} -> ${newSceneId}`);
            updateSceneSelectorDisplay(newSceneId);
        });

        // Wait for preload to complete
        await preloadPromise;

        // Phase 3: Initialize Rive with default buddy and scene
        const canvas = document.getElementById('riveCanvas');
        if (!canvas) {
            log('Canvas element not found', 'error');
            showLoading(false);
            return;
        }

        // Get default scene config
        const defaultScene = SCENES[CONFIG.DEFAULT_SCENE];
        const riveSuccess = await initRive(CONFIG.DEFAULT_BUDDY, canvas);

        if (!riveSuccess) {
            log('.riv file not loaded - showing placeholder', 'warn');
            showPlaceholder(true);
        } else {
            showPlaceholder(false);
        }

        updateCurrentBuddyDisplay(CONFIG.DEFAULT_BUDDY);
        updateSceneSelectorDisplay(CONFIG.DEFAULT_SCENE);

        // Load buddy data from mock API and populate dialogue presets
        await dataAdapter.loadBuddyData();
        populateDialoguePresets();
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

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
