// js/utils.js
// Shared utility functions

/**
 * Check if Rive runtime is available
 * @returns {boolean}
 */
export function isRiveAvailable() {
    return typeof window.rive !== 'undefined';
}

/**
 * Wait for Rive runtime to load (with timeout)
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<boolean>} - true if Rive loaded, false if timeout
 */
export async function waitForRive(timeout = 5000) {
    const start = Date.now();

    return new Promise((resolve) => {
        function check() {
            if (isRiveAvailable()) {
                resolve(true);
            } else if (Date.now() - start > timeout) {
                resolve(false);
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    });
}

/**
 * Debounce a function call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
