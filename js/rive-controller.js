// js/rive-controller.js
// Rive instance management, state machine control, and buddy switching

import { CONFIG, SPEECH_BUBBLE } from './config.js';
import { createAssetLoader, preloadBuddyAssets } from './asset-loader.js';
import { log } from './main.js';

// Module state
let riveInstance = null;
let stateMachineInputs = {};
let currentBuddyId = null;
let isRiveLoaded = false;

/**
 * Initialize Rive with a specific buddy
 * @param {string} buddyId - e.g., 'catdog-orange'
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<boolean>} - true if successful
 */
export async function initRive(buddyId, canvas) {
    // Clean up existing instance
    if (riveInstance) {
        log('Cleaning up previous Rive instance');
        riveInstance.cleanup();
        riveInstance = null;
        stateMachineInputs = {};
        isRiveLoaded = false;
    }

    currentBuddyId = buddyId;

    // Ensure assets are preloaded
    await preloadBuddyAssets(buddyId);

    log(`Initializing Rive with ${buddyId}...`);

    return new Promise((resolve) => {
        try {
            // Access the global rive object from the CDN script
            const riveRuntime = window.rive;

            if (!riveRuntime) {
                log('Rive runtime not loaded', 'error');
                resolve(false);
                return;
            }

            // Build Rive options - only include artboard/stateMachines if specified
            const riveOptions = {
                src: CONFIG.RIVE_FILE,
                canvas: canvas,
                autoplay: true,

                // OOB Asset Loader - the key to dynamic image swapping
                assetLoader: createAssetLoader(buddyId, riveRuntime),

                onLoad: () => {
                    log('Rive loaded successfully');
                    isRiveLoaded = true;
                    // Only cache inputs if a state machine is configured
                    if (CONFIG.STATE_MACHINE) {
                        cacheStateMachineInputs();
                    } else {
                        log('No state machine configured (animations/states not yet added to .riv)');
                    }
                    // Fit to canvas properly
                    riveInstance.resizeDrawingSurfaceToCanvas();
                    resolve(true);
                },

                onLoadError: (err) => {
                    // Stringify error for better debugging
                    const errMsg = err instanceof Error
                        ? err.message
                        : (typeof err === 'object' ? JSON.stringify(err) : String(err));
                    log(`Rive load error: ${errMsg}`, 'error');
                    isRiveLoaded = false;
                    resolve(false);
                },

                onStateChange: (event) => {
                    if (event.data && event.data.length > 0) {
                        log(`State changed: ${event.data.join(', ')}`);
                    }
                },
            };

            // Only add artboard/stateMachines if configured
            if (CONFIG.ARTBOARD) {
                riveOptions.artboard = CONFIG.ARTBOARD;
            }
            if (CONFIG.STATE_MACHINE) {
                riveOptions.stateMachines = CONFIG.STATE_MACHINE;
            }

            riveInstance = new riveRuntime.Rive(riveOptions);
        } catch (err) {
            log(`Error creating Rive instance: ${err.message}`, 'error');
            resolve(false);
        }
    });
}

/**
 * Switch to a different buddy variant (hot-swap)
 * @param {string} newBuddyId
 * @returns {Promise<boolean>}
 */
export async function switchBuddy(newBuddyId) {
    if (newBuddyId === currentBuddyId) {
        log(`Already showing ${newBuddyId}`);
        return true;
    }

    log(`Switching buddy: ${currentBuddyId} -> ${newBuddyId}`);
    const canvas = riveInstance?.canvas;

    if (!canvas) {
        log('No canvas reference, cannot switch', 'error');
        return false;
    }

    // Reinitialize with new buddy
    return await initRive(newBuddyId, canvas);
}

/**
 * Cache references to state machine inputs for quick access
 */
function cacheStateMachineInputs() {
    if (!riveInstance) return;

    try {
        const inputs = riveInstance.stateMachineInputs(CONFIG.STATE_MACHINE);
        stateMachineInputs = {};

        if (inputs) {
            inputs.forEach(input => {
                stateMachineInputs[input.name] = input;
                log(`  Input found: ${input.name} (type: ${getInputTypeName(input)})`);
            });
        }

        log(`Cached ${Object.keys(stateMachineInputs).length} state machine inputs`);
    } catch (err) {
        log(`Error caching inputs: ${err.message}`, 'warn');
    }
}

/**
 * Get human-readable input type name
 */
function getInputTypeName(input) {
    const riveRuntime = window.rive;
    if (!riveRuntime) return 'unknown';

    if (input.type === riveRuntime.StateMachineInputType.Trigger) return 'trigger';
    if (input.type === riveRuntime.StateMachineInputType.Boolean) return 'boolean';
    if (input.type === riveRuntime.StateMachineInputType.Number) return 'number';
    return 'unknown';
}

/**
 * Fire a trigger input
 * @param {string} triggerName
 * @returns {boolean} - true if fired
 */
export function fireTrigger(triggerName) {
    if (!isRiveLoaded) {
        log(`Cannot fire trigger: Rive not loaded`, 'warn');
        return false;
    }

    const input = stateMachineInputs[triggerName];
    const riveRuntime = window.rive;

    if (input && riveRuntime && input.type === riveRuntime.StateMachineInputType.Trigger) {
        input.fire();
        log(`Fired trigger: ${triggerName}`);
        return true;
    } else {
        log(`Trigger not found: ${triggerName}`, 'warn');
        return false;
    }
}

/**
 * Set a boolean input
 * @param {string} name
 * @param {boolean} value
 * @returns {boolean} - true if set
 */
export function setBoolean(name, value) {
    if (!isRiveLoaded) {
        log(`Cannot set boolean: Rive not loaded`, 'warn');
        return false;
    }

    const input = stateMachineInputs[name];
    const riveRuntime = window.rive;

    if (input && riveRuntime && input.type === riveRuntime.StateMachineInputType.Boolean) {
        input.value = value;
        log(`Set boolean: ${name} = ${value}`);
        return true;
    } else {
        log(`Boolean not found: ${name}`, 'warn');
        return false;
    }
}

/**
 * Set a number input
 * @param {string} name
 * @param {number} value
 * @returns {boolean} - true if set
 */
export function setNumber(name, value) {
    if (!isRiveLoaded) {
        log(`Cannot set number: Rive not loaded`, 'warn');
        return false;
    }

    const input = stateMachineInputs[name];
    const riveRuntime = window.rive;

    if (input && riveRuntime && input.type === riveRuntime.StateMachineInputType.Number) {
        input.value = value;
        log(`Set number: ${name} = ${value}`);
        return true;
    } else {
        log(`Number not found: ${name}`, 'warn');
        return false;
    }
}

/**
 * Get current state machine inputs (for debugging)
 */
export function getInputs() {
    return stateMachineInputs;
}

/**
 * Get current buddy ID
 */
export function getCurrentBuddy() {
    return currentBuddyId;
}

/**
 * Check if Rive is loaded
 */
export function isLoaded() {
    return isRiveLoaded;
}

/**
 * Handle window resize
 */
export function handleResize() {
    if (riveInstance && isRiveLoaded) {
        riveInstance.resizeDrawingSurfaceToCanvas();
        log('Resized drawing surface');
    }
}

// ============================================
// Speech Bubble Functions
// ============================================

/**
 * Set speech bubble text using Rive's text run API
 * @param {string} text - Text to display in bubble
 * @returns {boolean} - true if successful
 */
export function setBubbleText(text) {
    if (!isRiveLoaded || !riveInstance) {
        log('Cannot set bubble text: Rive not loaded', 'warn');
        return false;
    }

    try {
        // Debug: Check if text run exists and get current value
        const currentValue = riveInstance.getTextRunValue(SPEECH_BUBBLE.textRun);
        log(`Text run "${SPEECH_BUBBLE.textRun}" current value: ${currentValue === undefined ? 'UNDEFINED (not found!)' : `"${currentValue}"`}`);

        riveInstance.setTextRunValue(SPEECH_BUBBLE.textRun, text);

        // Verify it was set
        const newValue = riveInstance.getTextRunValue(SPEECH_BUBBLE.textRun);
        const truncated = text.length > 30 ? text.substring(0, 30) + '...' : text;
        log(`Set bubble text: "${truncated}" -> verified: "${newValue}"`);
        return true;
    } catch (err) {
        log(`Error setting bubble text: ${err.message}`, 'error');
        return false;
    }
}

/**
 * Show speech bubble with optional text
 * @param {string} [text] - Optional text to show
 * @returns {boolean} - true if trigger fired
 */
export function showBubble(text) {
    if (text) {
        setBubbleText(text);
    }
    return fireTrigger(SPEECH_BUBBLE.showTrigger);
}

/**
 * Hide speech bubble
 * @returns {boolean} - true if trigger fired
 */
export function hideBubble() {
    return fireTrigger(SPEECH_BUBBLE.hideTrigger);
}

/**
 * Cleanup Rive instance (call on page unload)
 */
export function cleanup() {
    if (riveInstance) {
        riveInstance.cleanup();
        riveInstance = null;
    }
    stateMachineInputs = {};
    isRiveLoaded = false;
    log('Rive controller cleaned up');
}
