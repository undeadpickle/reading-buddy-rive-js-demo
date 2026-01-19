// js/snowfall-controller.js
// Rive controller for Snowfall particles - uses ViewModel data binding

import { log } from './logger.js';

const SNOWFALL_CONFIG = {
    riveFile: './public/rive/snow-fall-particles.riv',
    fileVersion: 8, // Bump for particleShape enum + snowflake artboard inputs
};

// Input configurations with proper ranges (derived from Rive script defaults)
const INPUT_CONFIG = {
    // Appearance
    particleShape:        { group: 'Appearance', type: 'enum', options: [
        { value: 0, label: 'Rectangle' },
        { value: 1, label: 'Snowflake' },
    ], default: 1 },
    // Spawning
    topFlowRate:          { min: 0,   max: 100,  step: 1,    group: 'Spawning', type: 'number', default: 15 },
    topVelocity:          { min: 0,   max: 3,    step: 0.1,  group: 'Spawning', type: 'number', default: 0.8 },
    maxParticles:         { min: 50,  max: 1000, step: 50,   group: 'Spawning', type: 'number', default: 350 },
    // Pointer Physics
    forceRadius:          { min: 0,   max: 500,  step: 10,   group: 'Pointer', type: 'number', default: 120 },
    pushStrength:         { min: 0,   max: 2000, step: 50,   group: 'Pointer', type: 'number', default: 800 },
    repelStrength:        { min: 0,   max: 500,  step: 10,   group: 'Pointer', type: 'number', default: 150 },
    // Accumulation
    accumulationRate:     { min: 0,   max: 5,    step: 0.1,  group: 'Accumulation', type: 'number', default: 0.8 },
    maxSnowHeight:        { min: 0,   max: 0.5,  step: 0.01, group: 'Accumulation', type: 'number', default: 0.05 },
    accumulationSegments: { min: 4,   max: 48,   step: 1,    group: 'Accumulation', type: 'number', default: 12 },
    // Wind
    windStrength:         { min: 0,   max: 100,  step: 1,    group: 'Wind', type: 'number', default: 15 },
    gustFrequency:        { min: 0,   max: 10,   step: 0.5,  group: 'Wind', type: 'number', default: 3 },
    // Debug
    debugMode:            { group: 'Debug', type: 'boolean', default: false },
    // Canvas dimensions (hidden from UI, passed to Lua script)
    canvasWidth:          { group: 'Internal', type: 'number', hidden: true },
    canvasHeight:         { group: 'Internal', type: 'number', hidden: true },
};

const GROUP_ORDER = ['Appearance', 'Spawning', 'Pointer', 'Accumulation', 'Wind', 'Debug'];

let riveInstance = null;
let viewModelInstance = null;
let viewModelProperties = {};
let canvasElement = null;

/**
 * Initialize the snowfall Rive animation
 */
export async function initSnowfall(canvas) {
    if (!canvas) {
        log('Canvas not provided', 'error');
        return false;
    }

    canvasElement = canvas;
    resizeCanvas();

    const riveRuntime = window.rive;

    return new Promise((resolve) => {
        try {
            riveInstance = new riveRuntime.Rive({
                src: `${SNOWFALL_CONFIG.riveFile}?v=${SNOWFALL_CONFIG.fileVersion}`,
                canvas: canvas,
                autoplay: true,
                stateMachines: 'SnowfallStateMachine',
                autoBind: true, // Enable ViewModel auto-binding
                layout: new riveRuntime.Layout({
                    fit: riveRuntime.Fit.Layout,
                    alignment: riveRuntime.Alignment.TopLeft,
                }),

                onLoad: () => {
                    log('Snowfall Rive file loaded');

                    // Get ViewModel instance for data binding
                    discoverViewModel();

                    // Pass initial canvas dimensions to Lua script
                    updateCanvasDimensions();

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
 * Discover ViewModel and cache property accessors
 */
function discoverViewModel() {
    if (!riveInstance) return;

    viewModelInstance = riveInstance.viewModelInstance;

    if (!viewModelInstance) {
        log('No ViewModel instance found - controls will use defaults');
        return;
    }

    log('Found ViewModel instance, discovering properties...');

    // Try to get each property from the ViewModel
    Object.entries(INPUT_CONFIG).forEach(([name, config]) => {
        try {
            let prop = null;
            if (config.type === 'number' || config.type === 'enum') {
                // enum values are stored as numbers in ViewModel
                prop = viewModelInstance.number(name);
            } else if (config.type === 'boolean') {
                prop = viewModelInstance.boolean(name);
            }

            if (prop) {
                viewModelProperties[name] = prop;
                log(`  - ${name} (${config.type}) = ${prop.value}`);

                // Initialize with default if value is 0/false and we have a default
                if (config.default !== undefined) {
                    if (((config.type === 'number' || config.type === 'enum') && prop.value === 0 && config.default !== 0) ||
                        (config.type === 'boolean' && prop.value === false && config.default === true)) {
                        prop.value = config.default;
                        log(`    → Set default: ${config.default}`);
                    }
                }
            }
        } catch (err) {
            log(`  - ${name}: not found in ViewModel`);
        }
    });

    log(`Discovered ${Object.keys(viewModelProperties).length} ViewModel properties`);
}

/**
 * Build UI controls based on ViewModel properties, grouped by category
 */
function buildControls() {
    const container = document.getElementById('controlsContainer');
    const controlsPanel = document.getElementById('snowfallControls');

    if (!container) return;

    container.innerHTML = '';

    // Group properties by category
    const groups = {};
    GROUP_ORDER.forEach(g => groups[g] = []);

    Object.entries(INPUT_CONFIG).forEach(([name, config]) => {
        const prop = viewModelProperties[name];
        const group = config.group || 'Other';
        if (!groups[group]) groups[group] = [];
        groups[group].push({ name, prop, config });
    });

    let hasControls = false;

    // Render each group
    GROUP_ORDER.forEach(groupName => {
        const items = groups[groupName];
        if (!items || items.length === 0) return;

        // Check if any items in group have properties
        const hasProps = items.some(({ prop }) => prop);
        if (!hasProps) return;

        hasControls = true;

        // Group header
        const header = document.createElement('h3');
        header.className = 'control-group-header';
        header.textContent = groupName;
        container.appendChild(header);

        // Group controls
        items.forEach(({ name, prop, config }) => {
            if (!prop) return; // Skip properties not in ViewModel
            if (config.hidden) return; // Skip hidden properties (internal use only)

            if (config.type === 'enum') {
                container.appendChild(createEnumControl(name, prop, config));
            } else if (config.type === 'boolean') {
                container.appendChild(createBooleanControl(name, prop, config));
            } else if (config.type === 'number') {
                container.appendChild(createNumberControl(name, prop, config));
            }
        });
    });

    if (!hasControls && controlsPanel) {
        controlsPanel.classList.add('hidden');
        log('No controls to display - hiding panel');
    } else {
        controlsPanel?.classList.remove('hidden');
        log(`Built ${Object.keys(viewModelProperties).length} controls`);
    }
}

/**
 * Create an enum dropdown control
 */
function createEnumControl(name, prop, config) {
    const div = document.createElement('div');
    div.className = 'select-control';

    const span = document.createElement('span');
    span.textContent = formatInputName(name);

    const select = document.createElement('select');
    config.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (prop.value === opt.value) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        prop.value = val;
        log(`Set ${name} = ${config.options.find(o => o.value === val)?.label || val}`);
    });

    div.appendChild(span);
    div.appendChild(select);
    return div;
}

/**
 * Create a boolean toggle control
 */
function createBooleanControl(name, prop, config) {
    const label = document.createElement('label');
    label.className = 'toggle-control';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = prop.value;
    checkbox.addEventListener('change', (e) => {
        prop.value = e.target.checked;
        log(`Set ${name} = ${e.target.checked}`);
    });

    const span = document.createElement('span');
    span.textContent = formatInputName(name);

    label.appendChild(checkbox);
    label.appendChild(span);
    return label;
}

/**
 * Create a number slider control with proper min/max/step
 */
function createNumberControl(name, prop, config) {
    const div = document.createElement('div');
    div.className = 'slider-control';

    const span = document.createElement('span');
    span.textContent = formatInputName(name);

    const currentVal = prop.value ?? config.default ?? 0;
    const min = config.min ?? 0;
    const max = config.max ?? Math.max(100, currentVal * 3);
    const step = config.step ?? (max <= 1 ? 0.01 : 1);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = currentVal;

    const output = document.createElement('output');
    output.textContent = formatNumber(currentVal, step);

    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        prop.value = val;
        output.textContent = formatNumber(val, step);
    });

    div.appendChild(span);
    div.appendChild(slider);
    div.appendChild(output);
    return div;
}

/**
 * Format number for display based on step precision
 */
function formatNumber(val, step) {
    if (step >= 1) return Math.round(val).toString();
    const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
    return val.toFixed(decimals);
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

    // Pass canvas dimensions to Rive ViewModel for Lua script
    updateCanvasDimensions();
}

/**
 * Pass canvas dimensions to Rive ViewModel
 * With Fit.Layout, the artboard resizes to match the canvas,
 * so Lua coordinates = canvas coordinates. Pass CSS dimensions.
 */
function updateCanvasDimensions() {
    if (!viewModelInstance || !canvasElement) return;

    const widthProp = viewModelProperties['canvasWidth'];
    const heightProp = viewModelProperties['canvasHeight'];

    // Use clientWidth/clientHeight (CSS pixels)
    if (widthProp) widthProp.value = canvasElement.clientWidth;
    if (heightProp) heightProp.value = canvasElement.clientHeight;

    log(`Canvas dimensions: ${canvasElement.clientWidth}x${canvasElement.clientHeight}`);
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
    viewModelInstance = null;
    viewModelProperties = {};
    log('Snowfall cleaned up');
}

/**
 * Get a ViewModel property by name
 */
export function getProperty(name) {
    return viewModelProperties[name];
}

/**
 * Set a ViewModel property value
 */
export function setProperty(name, value) {
    const prop = viewModelProperties[name];
    if (prop) {
        prop.value = value;
        return true;
    }
    return false;
}
