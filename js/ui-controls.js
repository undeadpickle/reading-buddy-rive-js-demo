// js/ui-controls.js
// UI event handlers and control panel setup

import { CONFIG, BUDDIES, EVENTS, STATE_INPUTS, SAMPLE_DIALOGUES } from './config.js';
import { switchBuddy, fireTrigger, setBoolean, setNumber, getCurrentBuddy, showBubble, hideBubble } from './rive-controller.js';
import { log } from './main.js';

/**
 * Initialize all UI controls
 */
export function initControls() {
    initBuddySelector();
    initAnimationTriggers();
    initStateControls();
    initEventSimulators();
    initSpeechBubbleControls();
    initDebugPanel();

    log('UI controls initialized');
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
 * Set up speech bubble controls
 */
function initSpeechBubbleControls() {
    const container = document.getElementById('speechBubbleSection');
    if (!container) return;

    // Text input and send button
    const textInput = document.getElementById('bubbleTextInput');
    const sendBtn = document.getElementById('sendBubbleText');
    const hideBtn = document.getElementById('hideBubbleBtn');

    if (textInput && sendBtn) {
        sendBtn.addEventListener('click', () => {
            const text = textInput.value.trim();
            if (text) {
                showBubble(text);
            }
        });

        // Enter key support
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendBtn.click();
            }
        });
    }

    // Hide bubble button
    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            hideBubble();
        });
    }

    // Sample dialogue buttons
    const samplesContainer = document.getElementById('sampleDialogues');
    if (samplesContainer && SAMPLE_DIALOGUES) {
        SAMPLE_DIALOGUES.forEach((text, index) => {
            const btn = document.createElement('button');
            btn.className = 'sample-dialogue-btn';
            btn.textContent = `Sample ${index + 1}`;
            btn.title = text;
            btn.addEventListener('click', () => {
                showBubble(text);
                if (textInput) textInput.value = text;
            });
            samplesContainer.appendChild(btn);
        });
    }

    log('Speech bubble controls initialized');
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
 */
function formatTriggerName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
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
