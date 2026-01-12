// js/gamification-ui.js
// Gamification UI module - star counter state and animations
// NOTE: Placeholder stars for testing data flow. Real stars will be Rive scene.

import { log } from './logger.js';

let currentStars = 0;
let maxStars = 3;

/**
 * Initialize gamification UI and wire up button handlers
 */
export function initGamificationUI() {
    const earnBtn = document.getElementById('earnStar');
    const resetBtn = document.getElementById('resetStars');

    if (earnBtn) {
        earnBtn.addEventListener('click', () => {
            if (currentStars < maxStars) {
                currentStars++;
                animateStarEarn(currentStars);
                updateStars(currentStars, maxStars);
                log(`Star earned! (${currentStars}/${maxStars})`);
            } else {
                log('Max stars reached', 'warn');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentStars = 0;
            updateStars(0, maxStars);
            log('Stars reset');
        });
    }

    // Initialize display
    updateStars(0, maxStars);
    log('Gamification UI initialized');
}

/**
 * Update star visual state
 * @param {number} earned - Number of stars earned
 * @param {number} max - Maximum stars (default 3)
 */
export function updateStars(earned, max = 3) {
    currentStars = earned;
    maxStars = max;

    const container = document.getElementById('starProgress');
    if (!container) return;

    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
        const starNum = index + 1; // 1-indexed
        if (starNum <= earned) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
}

/**
 * Animate single star earning with pop effect
 * @param {number} starIndex - 1-indexed star number to animate
 */
export function animateStarEarn(starIndex) {
    const container = document.getElementById('starProgress');
    if (!container) return;

    const star = container.querySelector(`[data-star="${starIndex}"]`);
    if (!star) return;

    // Add animation class
    star.classList.add('earning');

    // Remove after animation completes (matches CSS 0.5s)
    setTimeout(() => {
        star.classList.remove('earning');
    }, 500);
}
