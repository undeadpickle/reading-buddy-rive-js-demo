// js/bottom-sheet.js
// Mobile bottom sheet behavior for control panel

import { UI_CONSTANTS } from './config.js';

let isExpanded = false;
let controlPanel = null;
let sheetHandle = null;
let mobileFab = null;

const MOBILE_BREAKPOINT = UI_CONSTANTS.MOBILE_BREAKPOINT;

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
    }
}

/**
 * Set up auto-collapse after user interactions
 * Collapses sheet so user can see animation result
 */
function setupAutoCollapse() {
    // Collapse after buddy selection
    const buddySelector = document.getElementById('buddySelector');
    if (buddySelector) {
        buddySelector.addEventListener('click', (e) => {
            if (e.target.closest('.buddy-thumb') && isMobileViewport()) {
                setTimeout(collapseSheet, 300);
            }
        });
    }

    // Collapse after animation trigger
    const animTriggers = document.getElementById('animationTriggers');
    if (animTriggers) {
        animTriggers.addEventListener('click', (e) => {
            if (e.target.closest('.trigger-btn') && isMobileViewport()) {
                setTimeout(collapseSheet, 200);
            }
        });
    }

    // Collapse after event simulation
    const eventSimulators = document.getElementById('eventSimulators');
    if (eventSimulators) {
        eventSimulators.addEventListener('click', (e) => {
            if (e.target.closest('.event-btn') && isMobileViewport()) {
                setTimeout(collapseSheet, 200);
            }
        });
    }

    // Collapse after gamification button
    const earnStar = document.getElementById('earnStar');
    if (earnStar) {
        earnStar.addEventListener('click', () => {
            if (isMobileViewport()) {
                setTimeout(collapseSheet, 200);
            }
        });
    }
}

/**
 * Initialize bottom sheet behavior
 * Only activates on mobile viewport
 */
export function initBottomSheet() {
    controlPanel = document.querySelector('.control-panel');
    sheetHandle = document.getElementById('sheetHandle');
    mobileFab = document.getElementById('mobileFab');

    if (!controlPanel) {
        console.warn('[BottomSheet] Control panel not found');
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

    // Set up auto-collapse for better UX
    setupAutoCollapse();
}
