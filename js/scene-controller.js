// js/scene-controller.js
// Scene management - switching between artboards and handling overlay mode

import { CONFIG, SCENES } from './config.js';
import { initRiveWithScene, resetToScene, cleanup as cleanupRive, getCurrentBuddy } from './rive-controller.js';
import { log } from './logger.js';

// Module state
let currentSceneId = null;
let previousSceneId = null;  // For returning from overlay
let onSceneChangeCallbacks = [];

/**
 * Get current scene ID
 */
export function getCurrentScene() {
    return currentSceneId;
}

/**
 * Get scene configuration by ID
 */
export function getSceneConfig(sceneId) {
    return SCENES[sceneId] || null;
}

/**
 * Register callback for scene changes
 * @param {Function} callback - Called with (newSceneId, oldSceneId)
 */
export function onSceneChange(callback) {
    onSceneChangeCallbacks.push(callback);
}

/**
 * Switch to a different scene
 * @param {string} sceneId - Scene ID from SCENES config
 * @returns {Promise<boolean>} - true if successful
 */
export async function switchScene(sceneId) {
    if (sceneId === currentSceneId) {
        log(`Already on scene: ${sceneId}`);
        return true;
    }

    const sceneConfig = SCENES[sceneId];
    if (!sceneConfig) {
        log(`Unknown scene: ${sceneId}`, 'error');
        return false;
    }

    log(`Switching scene: ${currentSceneId || 'none'} -> ${sceneId}`);

    const oldSceneId = currentSceneId;

    // Handle overlay mode
    if (sceneConfig.displayMode === 'overlay') {
        // Store previous scene to return to
        previousSceneId = currentSceneId;
        showOverlay(true);
    } else {
        // If coming from overlay, hide it
        if (currentSceneId && SCENES[currentSceneId]?.displayMode === 'overlay') {
            showOverlay(false);
        }
    }

    // Update canvas dimensions for the new scene
    updateCanvasDimensions(sceneConfig);

    // Determine if we can use fast reset (same canvas, no overlay transition)
    const canUseReset =
        currentSceneId &&                                    // Not initial load
        sceneConfig.displayMode !== 'overlay' &&             // Not going TO overlay
        SCENES[currentSceneId]?.displayMode !== 'overlay';   // Not coming FROM overlay

    let success = false;

    if (canUseReset) {
        // Fast path: reset artboard without full reinit (avoids re-decoding OOB assets)
        log('Using fast reset (same canvas)');
        success = resetToScene(sceneConfig);
    } else {
        // Slow path: full reinit needed (different canvas or initial load)
        log('Using full reinit (canvas change or initial load)');

        // Get appropriate canvas based on display mode
        const canvas = sceneConfig.displayMode === 'overlay'
            ? document.getElementById('overlayRiveCanvas')
            : document.getElementById('riveCanvas');

        if (!canvas) {
            log(`Canvas not found for scene: ${sceneId}`, 'error');
            return false;
        }

        // Initialize Rive with the new scene's artboard
        const buddyId = getCurrentBuddy() || CONFIG.DEFAULT_BUDDY;
        success = await initRiveWithScene(buddyId, canvas, sceneConfig);
    }

    if (success) {
        currentSceneId = sceneId;

        // Update control visibility
        updateControlVisibility(sceneConfig.controls);

        // Notify listeners
        onSceneChangeCallbacks.forEach(cb => cb(sceneId, oldSceneId));

        log(`Scene switched to: ${sceneConfig.name}`);
    } else {
        log(`Failed to switch to scene: ${sceneId}`, 'error');
    }

    return success;
}

/**
 * Close overlay and return to previous scene
 */
export async function closeOverlay() {
    if (!currentSceneId || SCENES[currentSceneId]?.displayMode !== 'overlay') {
        return;
    }

    const returnTo = previousSceneId || CONFIG.DEFAULT_SCENE;
    log(`Closing overlay, returning to: ${returnTo}`);

    // Hide overlay first
    showOverlay(false);

    // Switch back to previous scene
    currentSceneId = null;  // Reset so switchScene doesn't short-circuit
    await switchScene(returnTo);
}

/**
 * Show or hide the overlay
 */
function showOverlay(show) {
    const overlay = document.getElementById('sceneOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
        log(`Overlay ${show ? 'shown' : 'hidden'}`);
    }
}

/**
 * Update canvas dimensions for a scene
 */
function updateCanvasDimensions(sceneConfig) {
    const canvasWrapper = document.getElementById('canvasWrapper');
    const canvas = document.getElementById('riveCanvas');
    const overlayCanvas = document.getElementById('overlayRiveCanvas');

    if (sceneConfig.displayMode === 'overlay') {
        // For overlay, set the overlay canvas dimensions
        if (overlayCanvas) {
            // Scale to fit while maintaining aspect ratio
            const maxWidth = window.innerWidth - 320 - 80;  // Subtract control panel + padding
            const maxHeight = window.innerHeight - 80;
            const scale = Math.min(maxWidth / sceneConfig.width, maxHeight / sceneConfig.height);

            overlayCanvas.width = sceneConfig.width;
            overlayCanvas.height = sceneConfig.height;
            overlayCanvas.style.width = `${sceneConfig.width * scale}px`;
            overlayCanvas.style.height = `${sceneConfig.height * scale}px`;
        }
    } else {
        // For normal canvas display
        if (canvasWrapper && canvas) {
            canvasWrapper.style.width = `${sceneConfig.width}px`;
            canvasWrapper.style.height = `${sceneConfig.height}px`;
            canvas.width = sceneConfig.width;
            canvas.height = sceneConfig.height;
        }
    }
}

/**
 * Update which control sections are visible based on scene
 */
function updateControlVisibility(enabledControls) {
    // Map control IDs to section element IDs
    const controlSectionMap = {
        'buddySelector': 'buddySelectorSection',
        'dialogue': 'dialogueSection',
        'animations': 'animationsSection',
        'states': 'statesSection',
        'events': 'eventsSection',
        'gamification': 'gamificationSection',
        'starRewards': 'starRewardsSection',
    };

    // Update visibility for each section
    Object.entries(controlSectionMap).forEach(([controlId, sectionId]) => {
        const section = document.getElementById(sectionId);
        if (section) {
            const isEnabled = enabledControls.includes(controlId);
            section.classList.toggle('scene-hidden', !isEnabled);
            section.classList.toggle('scene-visible', isEnabled);
        }
    });
}

/**
 * Initialize scene controller
 * @param {string} initialSceneId - Starting scene
 */
export async function initSceneController(initialSceneId = CONFIG.DEFAULT_SCENE) {
    log('Scene controller initializing...');

    // Set up overlay close handlers
    const overlay = document.getElementById('sceneOverlay');
    const closeBtn = document.getElementById('overlayCloseBtn');

    if (overlay) {
        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('overlay-backdrop')) {
                closeOverlay();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeOverlay);
    }

    // Initialize with starting scene
    currentSceneId = initialSceneId;

    return true;
}
