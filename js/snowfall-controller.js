// js/snowfall-controller.js
// Rive controller for Snowfall particles (simpler than buddy controller - no OOB assets)

import { log } from './logger.js';

const SNOWFALL_CONFIG = {
    riveFile: './public/rive/snow-fall-particles.riv',
    fileVersion: 1,
};

let riveInstance = null;
let stateMachineInputs = {};
let canvasElement = null;

/**
 * Initialize the snowfall Rive animation
 */
export async function initSnowfall(canvas) {
    if (!canvas) {
        log('Canvas not provided', 'error');
        return false;
    }

    // Store canvas reference for resize handling
    canvasElement = canvas;

    // Resize canvas to fill container
    resizeCanvas();

    const riveRuntime = window.rive;

    return new Promise((resolve) => {
        try {
            riveInstance = new riveRuntime.Rive({
                src: `${SNOWFALL_CONFIG.riveFile}?v=${SNOWFALL_CONFIG.fileVersion}`,
                canvas: canvas,
                autoplay: true,
                stateMachines: 'SnowfallStateMachine',
                fit: riveRuntime.Fit.Cover,
                alignment: riveRuntime.Alignment.Center,

                onLoad: () => {
                    log('Snowfall Rive file loaded');

                    // Try to find and cache state machine inputs
                    discoverStateMachine();

                    riveInstance.resizeDrawingSurfaceToCanvas();
                    buildControls();
                    resolve(true);
                },

                onLoadError: (err) => {
                    log(`Snowfall load error: ${err}`, 'error');
                    resolve(false);
                }
            });
        } catch (err) {
            log(`Error creating Rive instance: ${err.message}`, 'error');
            resolve(false);
        }
    });
}

/**
 * Discover state machine and cache inputs
 */
function discoverStateMachine() {
    if (!riveInstance) return;

    // State machine names to try (specific first, then common fallbacks)
    const smNames = ['SnowfallStateMachine', 'State Machine 1', 'StateMachine', 'Main', 'Default'];

    for (const name of smNames) {
        try {
            const inputs = riveInstance.stateMachineInputs(name);
            if (inputs && inputs.length > 0) {
                log(`Found state machine: "${name}" with ${inputs.length} inputs`);
                inputs.forEach(input => {
                    stateMachineInputs[input.name] = input;
                    log(`  - ${input.name} (${getInputTypeName(input.type)})`);
                });
                return;
            }
        } catch (err) {
            // State machine not found, try next
        }
    }

    log('No state machine inputs found - animation plays automatically');
}

/**
 * Get human-readable input type name
 */
function getInputTypeName(type) {
    const riveRuntime = window.rive;
    switch (type) {
        case riveRuntime.StateMachineInputType.Boolean: return 'Boolean';
        case riveRuntime.StateMachineInputType.Number: return 'Number';
        case riveRuntime.StateMachineInputType.Trigger: return 'Trigger';
        default: return 'Unknown';
    }
}

/**
 * Build UI controls based on discovered inputs
 */
function buildControls() {
    const container = document.getElementById('controlsContainer');
    const controlsPanel = document.getElementById('snowfallControls');

    if (!container) return;

    // Clear existing controls
    container.innerHTML = '';

    const riveRuntime = window.rive;
    let hasControls = false;

    Object.entries(stateMachineInputs).forEach(([name, input]) => {
        hasControls = true;

        if (input.type === riveRuntime.StateMachineInputType.Boolean) {
            // Create toggle checkbox
            const label = document.createElement('label');
            label.className = 'toggle-control';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = input.value;
            checkbox.addEventListener('change', (e) => {
                input.value = e.target.checked;
                log(`Set ${name} = ${e.target.checked}`);
            });

            const span = document.createElement('span');
            span.textContent = formatInputName(name);

            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
        }
        else if (input.type === riveRuntime.StateMachineInputType.Number) {
            // Create slider
            const div = document.createElement('div');
            div.className = 'slider-control';

            const span = document.createElement('span');
            span.textContent = formatInputName(name);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = input.value || 50;

            const output = document.createElement('output');
            output.textContent = slider.value;

            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                input.value = val;
                output.textContent = val;
            });

            div.appendChild(span);
            div.appendChild(slider);
            div.appendChild(output);
            container.appendChild(div);
        }
        else if (input.type === riveRuntime.StateMachineInputType.Trigger) {
            // Create button
            const btn = document.createElement('button');
            btn.className = 'trigger-btn';
            btn.textContent = formatInputName(name);
            btn.addEventListener('click', () => {
                input.fire();
                log(`Fired ${name}`);
            });
            container.appendChild(btn);
        }
    });

    // Hide controls panel if no inputs found
    if (!hasControls && controlsPanel) {
        controlsPanel.classList.add('hidden');
        log('No controls to display - hiding panel');
    }
}

/**
 * Format input name for display (camelCase/PascalCase to Title Case)
 */
function formatInputName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

/**
 * Resize canvas to fill its container
 */
function resizeCanvas() {
    if (!canvasElement) return;

    const container = canvasElement.parentElement;
    canvasElement.width = container.clientWidth;
    canvasElement.height = container.clientHeight;
}

/**
 * Handle window resize - update canvas and Rive drawing surface
 */
export function handleResize() {
    if (!riveInstance || !canvasElement) return;

    resizeCanvas();
    riveInstance.resizeDrawingSurfaceToCanvas();
}

/**
 * Cleanup Rive instance
 */
export function cleanup() {
    if (riveInstance) {
        riveInstance.cleanup();
        riveInstance = null;
    }
    stateMachineInputs = {};
    log('Snowfall cleaned up');
}

/**
 * Get a state machine input by name
 */
export function getInput(name) {
    return stateMachineInputs[name];
}

/**
 * Fire a trigger input
 */
export function fireTrigger(name) {
    const input = stateMachineInputs[name];
    if (input && input.type === window.rive.StateMachineInputType.Trigger) {
        input.fire();
        return true;
    }
    return false;
}
