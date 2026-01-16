// js/projects.js
// Centralized project registry for the project switcher

export const PROJECTS = {
    'reading-buddy': {
        id: 'reading-buddy',
        name: 'Reading Buddy',
        path: 'index.html',  // Relative path for GitHub Pages compatibility
        icon: '\u{1F4DA}', // book emoji
        riveFile: './public/rive/reading-buddy.riv',
    },
    'snowfall': {
        id: 'snowfall',
        name: 'Snowfall Particles',
        path: 'snowfall.html',  // Relative path for GitHub Pages compatibility
        icon: '\u{2744}\u{FE0F}', // snowflake emoji
        riveFile: './public/rive/snow-fall-particles.riv',
    },
    // Future projects:
    // 'badges': { id: 'badges', name: 'Badge Animations', path: '/badges.html', ... },
};

export const DEFAULT_PROJECT = 'reading-buddy';

/**
 * Get current project ID from URL path
 */
export function getCurrentProjectId() {
    const path = window.location.pathname;

    for (const [id, project] of Object.entries(PROJECTS)) {
        // Match explicit path or root for index
        if (path.endsWith(project.path)) {
            return id;
        }
        // Handle root URL (/) mapping to index.html
        if (project.path === 'index.html' && (path === '/' || path.endsWith('/'))) {
            return id;
        }
    }

    return DEFAULT_PROJECT;
}
