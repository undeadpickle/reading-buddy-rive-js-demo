// js/logger.js
// Centralized logging utility

/**
 * Logging utility with timestamp and debug panel output
 * @param {string} message
 * @param {'info'|'warn'|'error'} level
 */
export function log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console[level](logEntry);

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${level}`;
        entry.textContent = logEntry;
        debugLog.appendChild(entry);
        debugLog.scrollTop = debugLog.scrollHeight;
        while (debugLog.children.length > 100) {
            debugLog.removeChild(debugLog.firstChild);
        }
    }
}
