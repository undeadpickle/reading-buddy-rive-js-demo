// js/ui-controls.js
// UI event handlers and control panel setup

import { CONFIG, BUDDIES, EVENTS, STATE_INPUTS, SCENES } from './config.js';
import { switchBuddy, fireTrigger, setBoolean, getBoolean, setNumber, getCurrentBuddy, setDialogueText, setOnBubbleClick } from './rive-controller.js';
import { switchScene, getCurrentScene, closeOverlay } from './scene-controller.js';
import { log } from './logger.js';
import { getAllDialogues, getDialogue, playSegment } from './data-adapter.js';

/**
 * Initialize all UI controls
 */
export function initControls() {
    initSceneSelector();
    initBuddySelector();
    initDialogueInput();
    initAnimationTriggers();
    initStateControls();
    initEventSimulators();
    initDebugPanel();
    initCanvasClickHandler();

    log('UI controls initialized');
}

/**
 * Set up scene selector dropdown
 */
function initSceneSelector() {
    const selector = document.getElementById('sceneSelector');
    if (!selector) return;

    selector.addEventListener('change', async () => {
        const sceneId = selector.value;
        if (!sceneId) return;

        log(`Scene selector changed: ${sceneId}`);

        // Show loading
        showLoading(true);

        // Switch scene
        const success = await switchScene(sceneId);

        showLoading(false);

        if (!success) {
            // Revert selector to current scene on failure
            const current = getCurrentScene();
            if (current) {
                selector.value = current;
            }
        }
    });
}

/**
 * Update scene selector UI to match current scene
 * @param {string} sceneId
 */
export function updateSceneSelectorDisplay(sceneId) {
    const selector = document.getElementById('sceneSelector');
    if (selector && sceneId) {
        selector.value = sceneId;
    }
}

/**
 * Populate buddy selector grid with thumbnails
 */
function initBuddySelector() {
    const container = document.getElementById('buddySelector');
    if (!container) return;

    Object.entries(BUDDIES).forEach(([id, buddy]) => {
        const thumb = document.createElement('button');
        thumb.className = 'buddy-thumb';
        thumb.dataset.buddyId = id;
        thumb.title = buddy.name;

        // Use head.png as thumbnail
        const img = document.createElement('img');
        img.src = `${CONFIG.ASSETS_BASE}/${id}/head.png`;
        img.alt = buddy.name;
        img.loading = 'lazy';
        thumb.appendChild(img);

        thumb.addEventListener('click', async () => {
            if (id === getCurrentBuddy()) return;

            // Update active state
            container.querySelectorAll('.buddy-thumb').forEach(t =>
                t.classList.remove('active'));
            thumb.classList.add('active');

            // Show loading, switch buddy
            showLoading(true);
            await switchBuddy(id);
            showLoading(false);

            // Always update display (even in placeholder mode)
            updateCurrentBuddyDisplay(id);
        });

        container.appendChild(thumb);
    });

    // Set default buddy as active
    const defaultThumb = container.querySelector(`[data-buddy-id="${CONFIG.DEFAULT_BUDDY}"]`);
    if (defaultThumb) {
        defaultThumb.classList.add('active');
    }
}

/**
 * Set up dialogue text input with speech bubble control
 */
function initDialogueInput() {
    const input = document.getElementById('dialogueInput');
    const submitBtn = document.getElementById('dialogueSubmit');

    if (!input || !submitBtn) return;

    // Set up bubble click handler (Rive fires the trigger, we just log it)
    setOnBubbleClick(() => {
        log('Speech bubble hidden (clicked)');
    });

    const submitDialogue = () => {
        const text = input.value.trim();
        if (!text) return;

        // Always update the text in View Model
        setDialogueText(text);

        // Check if bubble is already visible
        const isVisible = getBoolean('isBubbleVisible');

        if (!isVisible) {
            // Show bubble (triggers animation)
            fireTrigger('trig_showBubble');
            setBoolean('isBubbleVisible', true);
            log(`Speech bubble shown: "${text}"`);
        } else {
            // Just update text, no animation re-trigger
            log(`Speech bubble text updated: "${text}"`);
        }

        // Visual feedback on button
        submitBtn.classList.add('triggered');
        setTimeout(() => submitBtn.classList.remove('triggered'), 200);

        // Clear input
        input.value = '';
    };

    submitBtn.addEventListener('click', submitDialogue);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitDialogue();
    });

    // Preset dropdown handler
    const presetsDropdown = document.getElementById('dialoguePresets');
    if (presetsDropdown) {
        presetsDropdown.addEventListener('change', () => {
            const text = presetsDropdown.value;
            if (!text) return; // Ignore placeholder selection

            // Populate input field
            input.value = text;

            // Update View Model and show bubble
            setDialogueText(text);

            const isVisible = getBoolean('isBubbleVisible');
            if (!isVisible) {
                fireTrigger('trig_showBubble');
                setBoolean('isBubbleVisible', true);
                log(`Speech bubble shown: "${text}"`);
            } else {
                log(`Speech bubble text updated: "${text}"`);
            }

            // Reset dropdown to placeholder
            presetsDropdown.selectedIndex = 0;
        });
    }
}

/**
 * Populate dialogue presets dropdown with phrases from API
 * Must be called after loadBuddyData() completes
 */
export function populateDialoguePresets() {
    const select = document.getElementById('dialoguePresets');
    if (!select) return;

    const phrases = getAllDialogues('adventure');

    // Clear existing options (keep first placeholder)
    while (select.options.length > 1) select.remove(1);

    // Add API phrases
    phrases.forEach(phrase => {
        const option = document.createElement('option');
        option.value = phrase;
        option.textContent = phrase;
        select.appendChild(option);
    });

    log(`Loaded ${phrases.length} dialogue phrases from API`);
}

/**
 * Set up animation trigger buttons
 */
function initAnimationTriggers() {
    const container = document.getElementById('animationTriggers');
    if (!container) return;

    // Create buttons for each trigger
    STATE_INPUTS.triggers.forEach(triggerName => {
        const button = document.createElement('button');
        button.className = 'trigger-btn';
        button.dataset.trigger = triggerName;
        button.textContent = formatTriggerName(triggerName);
        container.appendChild(button);
    });

    // Event delegation for clicks
    container.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-trigger]');
        if (button) {
            const trigger = button.dataset.trigger;
            fireTrigger(trigger);

            // Visual feedback
            button.classList.add('triggered');
            setTimeout(() => button.classList.remove('triggered'), 200);
        }
    });
}

/**
 * Set up boolean toggles and number sliders
 */
function initStateControls() {
    // Boolean checkboxes
    document.querySelectorAll('[data-input][type="checkbox"]').forEach(input => {
        input.addEventListener('change', () => {
            setBoolean(input.dataset.input, input.checked);
        });
    });

    // Number sliders
    document.querySelectorAll('[data-input][type="range"]').forEach(input => {
        const output = document.getElementById(`${input.id}Value`);

        input.addEventListener('input', () => {
            const value = parseFloat(input.value);
            setNumber(input.dataset.input, value);
            if (output) output.textContent = value;
        });
    });
}

/**
 * Set up event simulator buttons
 */
function initEventSimulators() {
    const container = document.getElementById('eventSimulators');
    if (!container) return;

    // Create buttons for each event
    Object.entries(EVENTS).forEach(([eventName, config]) => {
        const button = document.createElement('button');
        button.className = 'event-btn';
        button.dataset.event = eventName;
        button.textContent = formatEventName(eventName);
        button.title = config.description || '';
        container.appendChild(button);
    });

    // Event delegation
    container.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-event]');
        if (button) {
            const eventName = button.dataset.event;
            simulateEvent(eventName);

            // Visual feedback
            button.classList.add('triggered');
            setTimeout(() => button.classList.remove('triggered'), 200);
        }
    });
}

/**
 * Simulate an external event
 */
function simulateEvent(eventName) {
    const eventConfig = EVENTS[eventName];
    if (!eventConfig) {
        log(`Unknown event: ${eventName}`, 'warn');
        return;
    }

    log(`Simulating event: ${eventName}`);

    // Fire trigger if defined
    if (eventConfig.trigger) {
        fireTrigger(eventConfig.trigger);
    }

    // Set boolean if defined
    if (eventConfig.boolean !== undefined) {
        setBoolean(eventConfig.boolean, eventConfig.value);
    }
}

/**
 * Set up debug panel
 */
function initDebugPanel() {
    const clearBtn = document.getElementById('clearLog');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const debugLog = document.getElementById('debugLog');
            if (debugLog) {
                debugLog.innerHTML = '';
                log('Log cleared');
            }
        });
    }
}

/**
 * Set up canvas tap response
 * Click canvas → giggle animation + random adventure dialogue
 */
function initCanvasClickHandler() {
    const canvas = document.getElementById('riveCanvas');
    if (!canvas) return;

    canvas.addEventListener('click', () => {
        // Play giggle animation (maps to trig_wave via data adapter)
        playSegment('giggle');

        // Get random adventure dialogue
        const dialogue = getDialogue('adventure');
        if (!dialogue) return;

        // Set dialogue and show bubble
        setDialogueText(dialogue);

        const isVisible = getBoolean('isBubbleVisible');
        if (!isVisible) {
            fireTrigger('trig_showBubble');
            setBoolean('isBubbleVisible', true);
        }

        log(`Canvas tap: giggle + "${dialogue}"`);
    });
}

/**
 * Toggle loading overlay
 */
export function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}

/**
 * Update current buddy display
 */
export function updateCurrentBuddyDisplay(buddyId) {
    const display = document.getElementById('currentBuddy');
    if (display) {
        const buddy = BUDDIES[buddyId];
        display.textContent = buddy ? buddy.name : buddyId;
    }
}

/**
 * Show placeholder when .riv is not loaded
 */
export function showPlaceholder(show) {
    const placeholder = document.getElementById('rivePlaceholder');
    const canvas = document.getElementById('riveCanvas');

    if (placeholder) {
        placeholder.classList.toggle('hidden', !show);
    }
    if (canvas) {
        canvas.classList.toggle('hidden', show);
    }
}

/**
 * Format trigger name for display
 * "trig_wave" → "Wave", "trig_jump" → "Jump"
 */
function formatTriggerName(name) {
    return name
        .replace(/^trig_/, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Format event name for display
 */
function formatEventName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}
