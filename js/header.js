// js/header.js
// Shared header with project switcher dropdown

import { PROJECTS, getCurrentProjectId } from './projects.js';

// Update dropdown selection on every pageshow (handles bfcache restoration)
// Registered at module scope so it's always active
window.addEventListener('pageshow', () => {
    const select = document.querySelector('.project-selector');
    if (select) {
        select.value = getCurrentProjectId();
    }
});

/**
 * Initialize the header with project switcher dropdown
 * Call this on every page after DOM ready
 */
export function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) {
        console.warn('Header element not found');
        return;
    }

    // Don't add duplicate switcher
    if (header.querySelector('.project-switcher')) {
        return;
    }

    const switcher = createProjectSwitcher();
    header.appendChild(switcher);
}

/**
 * Create the project switcher dropdown element
 */
function createProjectSwitcher() {
    const currentId = getCurrentProjectId();

    const wrapper = document.createElement('div');
    wrapper.className = 'project-switcher';

    const select = document.createElement('select');
    select.className = 'project-selector';
    select.setAttribute('aria-label', 'Switch project');

    Object.values(PROJECTS).forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = `${project.icon} ${project.name}`;
        option.selected = project.id === currentId;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        const selectedProject = PROJECTS[e.target.value];
        if (selectedProject && selectedProject.id !== currentId) {
            window.location.href = selectedProject.path;
        }
    });

    wrapper.appendChild(select);
    return wrapper;
}
