// js/snowfall-main.js
// Entry point for Snowfall particles demo

import { initHeader } from './header.js';
import { initBottomSheet } from './bottom-sheet.js';
import { initSnowfall, cleanup, handleResize } from './snowfall-controller.js';
import { log } from './logger.js';
import { waitForRive, debounce } from './utils.js';

/**
 * Main initialization
 */
async function init() {
    initHeader();

    // Initialize bottom sheet for mobile (must be after DOM is ready)
    initBottomSheet({
        panelSelector: '.snowfall-controls',
        handleSelector: '#snowfallSheetHandle',
        fabSelector: '#snowfallFab',
        autoCollapseRules: [
            // Collapse after slider adjustment (longer delay for scrubbing)
            { containerSelector: '#controlsContainer', targetSelector: 'input[type="range"]', delay: 800, event: 'change' },
            // Collapse after toggle
            { containerSelector: '#controlsContainer', targetSelector: 'input[type="checkbox"]', delay: 400, event: 'change' },
            // Collapse after trigger button
            { containerSelector: '#controlsContainer', targetSelector: '.trigger-btn', delay: 300 },
        ]
    });

    log('Snowfall Demo initializing...');

    const loadingOverlay = document.getElementById('loadingOverlay');

    try {
        // Wait for Rive runtime
        const riveAvailable = await waitForRive();
        if (!riveAvailable) {
            log('Rive runtime not loaded', 'error');
            return;
        }

        log('Rive runtime available');

        // Initialize Rive with snowfall animation
        const canvas = document.getElementById('snowfallCanvas');
        if (!canvas) {
            log('Canvas element not found', 'error');
            return;
        }

        const success = await initSnowfall(canvas);

        if (success) {
            log('Snowfall initialized');
        } else {
            log('Failed to initialize snowfall', 'error');
        }
    } catch (err) {
        log(`Initialization failed: ${err.message}`, 'error');
        console.error(err);
    } finally {
        loadingOverlay?.classList.add('hidden');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Handle window resize
window.addEventListener('resize', debounce(handleResize, 250));

// Handle devicePixelRatio changes (e.g., moving window between displays)
window
    .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    .addEventListener('change', handleResize);

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
