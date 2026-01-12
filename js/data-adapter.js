// js/data-adapter.js
// Compatibility layer: Epic API data → Rive animations
// Translates Lottie playSegment() calls to Rive triggers

import { ANIMATION_MAPPING } from './config.js';
import { fireTrigger, setBoolean } from './rive-controller.js';
import { log } from './logger.js';

// Module state
let buddyData = null;
let starCount = 0;
const MAX_STARS = 3;

/**
 * Load buddy data from mock API
 * @returns {Promise<object>} - The buddy data result object
 */
export async function loadBuddyData() {
    try {
        const response = await fetch('./public/api/buddy.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();

        if (json.success && json.result) {
            buddyData = json.result;
            log(`Loaded buddy data: ${buddyData.name}`);
            return buddyData;
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (err) {
        log(`Failed to load buddy data: ${err.message}`, 'error');
        return null;
    }
}

/**
 * Get random dialogue string for a context
 * @param {string} context - 'adventure', 'celebration', 'hatch', or 'celebrationEgg'
 * @returns {string} - Random dialogue string, or empty string if not found
 */
export function getDialogue(context) {
    if (!buddyData || !buddyData.dialog) {
        log('No buddy data loaded, cannot get dialogue', 'warn');
        return '';
    }

    const stages = buddyData.dialog[context];
    if (!stages || stages.length === 0) {
        log(`No dialogue found for context: ${context}`, 'warn');
        return '';
    }

    // Pick random stage, then random string from that stage
    const randomStage = stages[Math.floor(Math.random() * stages.length)];
    if (!randomStage || randomStage.length === 0) {
        return '';
    }

    const dialogue = randomStage[Math.floor(Math.random() * randomStage.length)];

    // Filter out empty strings and placeholder-only strings
    if (!dialogue || dialogue === '-1') {
        return '';
    }

    return dialogue;
}

/**
 * Get all dialogue strings for a context (flattened from stages)
 * @param {string} context - 'adventure', 'celebration', 'hatch', or 'celebrationEgg'
 * @returns {string[]} - Array of unique dialogue strings, filtered for placeholders
 */
export function getAllDialogues(context) {
    if (!buddyData || !buddyData.dialog) {
        log('No buddy data loaded, cannot get dialogues', 'warn');
        return [];
    }

    const stages = buddyData.dialog[context];
    if (!stages || stages.length === 0) {
        log(`No dialogues found for context: ${context}`, 'warn');
        return [];
    }

    // Flatten all stages, filter empty/placeholder strings
    const phrases = stages.flat().filter(s => s && s !== '-1' && !s.includes('-1'));

    // Return unique phrases
    return [...new Set(phrases)];
}

/**
 * Translate Lottie playSegment marker to Rive trigger/boolean
 * This is the core compatibility function - Epic calls playSegment('wave'),
 * we translate that to Rive's fireTrigger('trig_wave')
 *
 * @param {string} markerName - Lottie marker name (e.g., 'wave', 'celebrate')
 * @returns {boolean} - true if animation was triggered
 */
export function playSegment(markerName) {
    const mapping = ANIMATION_MAPPING[markerName];

    if (!mapping) {
        log(`Unknown animation marker: ${markerName}`, 'warn');
        return false;
    }

    let success = false;

    // Fire trigger if defined
    if (mapping.trigger) {
        success = fireTrigger(mapping.trigger);
    } else if (markerName === 'idle') {
        // idle has no trigger - it's the default state
        success = true;
    }

    // Set boolean if defined
    if (mapping.boolean !== undefined) {
        setBoolean(mapping.boolean, mapping.value);
    }

    log(`playSegment('${markerName}') → trigger: ${mapping.trigger || 'none'}`);
    return success;
}

/**
 * Earn a star (increment count, cap at max)
 * @returns {number} - New star count
 */
export function earnStar() {
    if (starCount < MAX_STARS) {
        starCount++;
        log(`Star earned! ${starCount}/${MAX_STARS}`);
    }
    return starCount;
}

/**
 * Get current star progress
 * @returns {{ current: number, max: number }}
 */
export function getStarProgress() {
    return { current: starCount, max: MAX_STARS };
}

/**
 * Reset stars to 0
 */
export function resetStars() {
    starCount = 0;
    log('Stars reset to 0');
}

/**
 * Get loaded buddy data (for UI display)
 * @returns {object|null}
 */
export function getBuddyData() {
    return buddyData;
}
