// js/rive-controller.js
// Rive instance management, state machine control, and buddy switching

import { CONFIG } from './config.js';
import { createAssetLoader, preloadBuddyAssets } from './asset-loader.js';
import { log } from './logger.js';

// Module state
let riveInstance = null;
let stateMachineInputs = {};
let currentBuddyId = null;
let isRiveLoaded = false;
let viewModelInstance = null;
let onBubbleClickCallback = null;

// Current scene config (for state machine name reference)
let currentSceneConfig = null;

/**
 * Initialize Rive with a specific buddy (uses default CONFIG artboard/state machine)
 * @param {string} buddyId - e.g., 'catdog-orange'
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<boolean>} - true if successful
 */
export async function initRive(buddyId, canvas) {
    // Use default config
    return initRiveWithScene(buddyId, canvas, {
        artboard: CONFIG.ARTBOARD,
        stateMachine: CONFIG.STATE_MACHINE,
    });
}

/**
 * Initialize Rive with a specific buddy and scene configuration
 * @param {string} buddyId - e.g., 'catdog-orange'
 * @param {HTMLCanvasElement} canvas
 * @param {Object} sceneConfig - { artboard, stateMachine, width, height, ... }
 * @returns {Promise<boolean>} - true if successful
 */
export async function initRiveWithScene(buddyId, canvas, sceneConfig) {
    // Clean up existing instance
    if (riveInstance) {
        log('Cleaning up previous Rive instance');
        riveInstance.cleanup();
        riveInstance = null;
        stateMachineInputs = {};
        isRiveLoaded = false;
    }

    currentBuddyId = buddyId;
    currentSceneConfig = sceneConfig;

    // Ensure assets are preloaded
    await preloadBuddyAssets(buddyId);

    const artboardName = sceneConfig.artboard || CONFIG.ARTBOARD;
    const stateMachineName = sceneConfig.stateMachine || CONFIG.STATE_MACHINE;

    log(`Initializing Rive: buddy=${buddyId}, artboard=${artboardName}, stateMachine=${stateMachineName}`);

    return new Promise((resolve) => {
        try {
            // Access the global rive object from the CDN script
            const riveRuntime = window.rive;

            if (!riveRuntime) {
                log('Rive runtime not loaded', 'error');
                resolve(false);
                return;
            }

            // Build Rive options with cache busting
            const riveFileSrc = CONFIG.RIVE_FILE_VERSION
                ? `${CONFIG.RIVE_FILE}?v=${CONFIG.RIVE_FILE_VERSION}`
                : CONFIG.RIVE_FILE;

            const riveOptions = {
                src: riveFileSrc,
                canvas: canvas,
                autoplay: true,
                autoBind: true,  // Enable View Model data binding

                // OOB Asset Loader - the key to dynamic image swapping
                assetLoader: createAssetLoader(buddyId, riveRuntime),

                onLoad: () => {
                    log('Rive loaded successfully');
                    isRiveLoaded = true;

                    // Only cache inputs if a state machine is configured
                    if (stateMachineName) {
                        cacheStateMachineInputs(stateMachineName);
                    } else {
                        log('No state machine configured');
                    }

                    // Get View Model instance for data binding
                    cacheViewModelInstance();

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
                        // Filter out blink states to reduce console noise
                        const nonBlinkStates = event.data.filter(s => !s.toLowerCase().includes('blink'));
                        if (nonBlinkStates.length > 0) {
                            log(`State changed: ${nonBlinkStates.join(', ')}`);
                        }

                        // Detect bubble hide (triggered by Rive listener click)
                        if (event.data.includes('anime_bubble_hidden')) {
                            // Sync JS state when bubble hides
                            const input = stateMachineInputs['isBubbleVisible'];
                            if (input) input.value = false;
                            if (onBubbleClickCallback) onBubbleClickCallback();
                        }
                    }
                },
            };

            // Add artboard if specified
            if (artboardName) {
                riveOptions.artboard = artboardName;
            }
            // Add state machine if specified
            if (stateMachineName) {
                riveOptions.stateMachines = stateMachineName;
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
 * Preserves current scene/artboard
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

    // Reinitialize with new buddy, keeping current scene config
    if (currentSceneConfig) {
        return await initRiveWithScene(newBuddyId, canvas, currentSceneConfig);
    } else {
        return await initRive(newBuddyId, canvas);
    }
}

/**
 * Cache references to state machine inputs for quick access
 * @param {string} stateMachineName - Name of the state machine
 */
function cacheStateMachineInputs(stateMachineName) {
    if (!riveInstance) return;

    try {
        const inputs = riveInstance.stateMachineInputs(stateMachineName);
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
 * Cache View Model instance for data binding
 * Requires Rive runtime 2.33+ and autoBind: true
 */
function cacheViewModelInstance() {
    if (!riveInstance) return;

    try {
        // With autoBind: true, viewModelInstance should be available
        const vmInstance = riveInstance.viewModelInstance;

        if (vmInstance) {
            viewModelInstance = vmInstance;
            log('View Model instance cached (BuddyViewModel)');
        } else {
            // Fallback: manually get and bind
            const vm = riveInstance.viewModelByIndex?.(0);
            if (vm) {
                const inst = vm.defaultInstance?.();
                if (inst) {
                    viewModelInstance = inst;
                    riveInstance.bindViewModelInstance?.(inst);
                    log('View Model instance cached (manual bind)');
                    return;
                }
            }
            log('No View Model instance found - check Rive Editor setup', 'warn');
        }
    } catch (err) {
        log(`Error caching View Model: ${err.message}`, 'warn');
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
 * Get a boolean input value
 * @param {string} name
 * @returns {boolean|null} - current value or null if not found
 */
export function getBoolean(name) {
    if (!isRiveLoaded) return null;

    const input = stateMachineInputs[name];
    const riveRuntime = window.rive;

    if (input && riveRuntime && input.type === riveRuntime.StateMachineInputType.Boolean) {
        return input.value;
    }
    return null;
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
 * Set dialogue text via View Model data binding
 * @param {string} text - The text to display
 * @returns {boolean} - true if set successfully
 */
export function setDialogueText(text) {
    if (!isRiveLoaded) {
        log('Cannot set dialogue: Rive not loaded', 'warn');
        return false;
    }

    if (!viewModelInstance) {
        log('Cannot set dialogue: No View Model instance', 'warn');
        return false;
    }

    try {
        // Get the dialogueText property from the View Model
        const dialogueTextProp = viewModelInstance.string('dialogueText');
        if (dialogueTextProp) {
            dialogueTextProp.value = text;
            log(`Set dialogueText: "${text}"`);
            return true;
        } else {
            log('dialogueText property not found in View Model', 'warn');
            return false;
        }
    } catch (err) {
        log(`Error setting dialogue: ${err.message}`, 'error');
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
 * Set callback for bubble click Rive event
 * @param {Function} callback - called when bubble is clicked
 */
export function setOnBubbleClick(callback) {
    onBubbleClickCallback = callback;
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

/**
 * Cleanup Rive instance (call on page unload)
 */
export function cleanup() {
    if (riveInstance) {
        riveInstance.cleanup();
        riveInstance = null;
    }
    stateMachineInputs = {};
    viewModelInstance = null;
    isRiveLoaded = false;
    log('Rive controller cleaned up');
}
