// js/bottom-sheet.js
// Mobile bottom sheet behavior for control panel

import { UI_CONSTANTS } from './config.js';

let isExpanded = false;
let controlPanel = null;
let sheetHandle = null;
let mobileFab = null;

const MOBILE_BREAKPOINT = UI_CONSTANTS.MOBILE_BREAKPOINT;

/**
 * Default configuration for reading buddy page (backward compatible)
 */
const DEFAULT_CONFIG = {
    panelSelector: '.control-panel',
    handleSelector: '#sheetHandle',
    fabSelector: '#mobileFab',
    autoCollapseRules: [
        { containerSelector: '#buddySelector', targetSelector: '.buddy-thumb', delay: 300 },
        { containerSelector: '#animationTriggers', targetSelector: '.trigger-btn', delay: 200 },
        { containerSelector: '#eventSimulators', targetSelector: '.event-btn', delay: 200 },
        { containerSelector: '#earnStar', targetSelector: null, delay: 200 },
    ]
};

/**
 * Check if viewport is mobile width
 */
function isMobileViewport() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

/**
 * Toggle sheet expanded/collapsed state
 */
function toggleSheet() {
    if (!controlPanel) return;

    isExpanded = !isExpanded;
    controlPanel.classList.toggle('sheet-expanded', isExpanded);
    mobileFab?.classList.toggle('fab-active', isExpanded);

    // Scroll to top when collapsing
    if (!isExpanded) {
        controlPanel.scrollTop = 0;
    }
}

/**
 * Collapse the sheet (programmatic)
 */
export function collapseSheet() {
    if (!controlPanel || !isMobileViewport()) return;

    isExpanded = false;
    controlPanel.classList.remove('sheet-expanded');
    mobileFab?.classList.remove('fab-active');
    controlPanel.scrollTop = 0;
}

/**
 * Expand the sheet (programmatic)
 */
export function expandSheet() {
    if (!controlPanel || !isMobileViewport()) return;

    isExpanded = true;
    controlPanel.classList.add('sheet-expanded');
    mobileFab?.classList.add('fab-active');
}

/**
 * Handle window resize - clear sheet state when switching to desktop
 */
function handleResize() {
    if (!isMobileViewport() && isExpanded) {
        isExpanded = false;
        controlPanel?.classList.remove('sheet-expanded');
        mobileFab?.classList.remove('fab-active');
    }
}

/**
 * Set up auto-collapse based on configuration rules
 * @param {Array} rules - Auto-collapse rule definitions
 */
function setupAutoCollapse(rules) {
    if (!rules || rules.length === 0) return;

    rules.forEach(rule => {
        const { containerSelector, targetSelector, delay = 200, event = 'click' } = rule;
        const container = document.querySelector(containerSelector);

        if (!container) return;

        // Handle direct element clicks (no targetSelector)
        if (!targetSelector) {
            container.addEventListener(event, () => {
                if (isMobileViewport()) {
                    setTimeout(collapseSheet, delay);
                }
            });
            return;
        }

        // Event delegation for child elements
        container.addEventListener(event, (e) => {
            if (e.target.closest(targetSelector) && isMobileViewport()) {
                setTimeout(collapseSheet, delay);
            }
        });
    });
}

/**
 * Initialize bottom sheet behavior
 * Only activates on mobile viewport
 * @param {Object} [config] - Configuration object (uses defaults if not provided)
 * @param {string} [config.panelSelector] - CSS selector for the control panel
 * @param {string} [config.handleSelector] - CSS selector for sheet handle
 * @param {string} [config.fabSelector] - CSS selector for FAB button
 * @param {Array} [config.autoCollapseRules] - Rules for auto-collapse behavior
 */
export function initBottomSheet(config = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    controlPanel = document.querySelector(mergedConfig.panelSelector);
    sheetHandle = mergedConfig.handleSelector ? document.querySelector(mergedConfig.handleSelector) : null;
    mobileFab = mergedConfig.fabSelector ? document.querySelector(mergedConfig.fabSelector) : null;

    if (!controlPanel) {
        console.warn(`[BottomSheet] Panel not found: ${mergedConfig.panelSelector}`);
        return;
    }

    // Handle click toggles sheet (keep as backup)
    if (sheetHandle) {
        sheetHandle.addEventListener('click', toggleSheet);
    }

    // FAB click toggles sheet
    if (mobileFab) {
        mobileFab.addEventListener('click', toggleSheet);
    }

    // Clear state on resize to desktop
    window.addEventListener('resize', handleResize);

    // Set up auto-collapse rules
    setupAutoCollapse(mergedConfig.autoCollapseRules);
}
