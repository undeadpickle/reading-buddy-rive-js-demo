// js/config.js
// Configuration and constants for the Reading Buddy demo
//
// Rive Runtime Notes:
// - index.html uses @rive-app/canvas@2.33.1 (lighter weight, good for character animation)
// - snowfall.html uses @rive-app/webgl@2.34.1 (required for Lua script particle effects)
// - Keep versions pinned in HTML script tags; test before upgrading

export const CONFIG = {
    RIVE_FILE: './public/rive/reading-buddy.riv',
    RIVE_FILE_VERSION: 2,  // Bump this after re-exporting .riv to bust cache
    ASSETS_BASE: './public/reading-buddies',
    CANVAS_SIZE: 500,
    STATE_MACHINE: 'BuddyStateMachine',  // State machine name in .riv
    ARTBOARD: 'Reading Buddy',  // Explicit artboard name (required for View Model binding)
    DEFAULT_BUDDY: 'catdog-orange',
    DEFAULT_SCENE: 'reading-buddy',
};

// Scene configurations for different artboards
export const SCENES = {
    'reading-buddy': {
        name: 'Reading Buddy',
        artboard: 'Reading Buddy',
        stateMachine: 'BuddyStateMachine',
        width: 500,
        height: 500,
        displayMode: 'canvas',  // Normal canvas display
        controls: ['buddySelector', 'dialogue', 'animations', 'states', 'events', 'gamification'],
    },
    'adventure-page': {
        name: 'Adventure Page',
        artboard: 'Adventure Page',
        stateMachine: 'State Machine 1',
        width: 500,
        height: 680,
        displayMode: 'canvas',  // Taller canvas
        controls: ['buddySelector', 'dialogue'],  // Limited controls for this scene
    },
    'star-rewards': {
        name: 'Star Rewards',
        artboard: 'Star Rewards',
        stateMachine: 'State Machine 1',
        width: 1920,
        height: 1080,
        displayMode: 'overlay',  // Full-screen overlay mode
        controls: ['starRewards'],  // Scene-specific controls
    },
};

// All available buddy variants
export const BUDDIES = {
    'catdog-orange': { name: 'Orange Cat-Dog', hasTail: true },
    'catdog-blue': { name: 'Blue Cat-Dog', hasTail: true },
    'catdog-green': { name: 'Green Cat-Dog', hasTail: true },
    'catdog-purple': { name: 'Purple Cat-Dog', hasTail: true },
    'catdog-white': { name: 'White Cat-Dog', hasTail: true },
    'kitten-ninja': { name: 'Ninja Kitten', hasTail: true },
    'master-hamster': { name: 'Master Hamster', hasTail: false },
    'barloc': { name: 'Barloc', hasTail: true },
    'george': { name: 'George', hasTail: false },
    'maddie': { name: 'Maddie', hasTail: false },
    'scout': { name: 'Scout', hasTail: true },
};

// Body parts that map to OOB asset names in .riv
// These MUST match the asset names defined in Rive Editor (case-sensitive)
export const BODY_PARTS = [
    'head',
    'headBack',
    'torso',
    'armLeft',
    'armRight',
    'legLeft',
    'legRight',
    'eyeLeft',
    'eyeRight',
    'eyeBlinkLeft',
    'eyeBlinkRight',
    'tail',  // Only loaded if buddy.hasTail === true
];

// State machine input names - coordinate with Rive file
// Note: These are View Model properties (triggers) in Rive
export const STATE_INPUTS = {
    // Triggers (fire once, auto-reset) - must match Rive input names exactly
    triggers: ['trig_wave', 'trig_jump', 'trig_showBubble', 'trig_hideBubble'],
    // Booleans (on/off states) - must match Rive input names exactly
    booleans: ['isHappy', 'isReading', 'isBubbleVisible'],
    // Numbers (continuous values 0-100) - coming soon, not yet wired in Rive
    numbers: ['energyLevel'],
};

// Event mappings for simulated external events
// Each event can trigger animations and set states
export const EVENTS = {
    bookComplete: {
        trigger: 'trig_wave',
        description: 'Kid finished a book'
    },
    streakReached: {
        trigger: 'trig_jump',
        description: 'Reading streak milestone'
    },
    newBadge: {
        trigger: 'trig_wave',
        description: 'Earned a new badge'
    },
};

// Maps Epic's Lottie marker names → Rive state machine inputs
// Used by data-adapter.js to translate playSegment() calls
export const ANIMATION_MAPPING = {
    'idle': { trigger: null },                                              // Default state, no trigger needed
    'giggle': { trigger: 'trig_wave' },                                     // Tap response
    'wave': { trigger: 'trig_wave' },                                       // Greeting
    'jump': { trigger: 'trig_jump' },                                       // Excitement
    'feeding': { trigger: 'trig_wave', boolean: 'isHappy', value: true },   // Reward animation
    'celebrate': { trigger: 'trig_jump' },                                  // Star earned
    'hooray': { trigger: 'trig_wave' },                                     // Generic celebration
};

// Dialogue contexts from Epic's API (keys in buddy.dialog object)
export const DIALOGUE_CONTEXTS = ['adventure', 'celebration', 'hatch', 'celebrationEgg'];

// Centralized UI constants (avoid magic numbers scattered across files)
export const UI_CONSTANTS = {
    MOBILE_BREAKPOINT: 900,      // px - bottom sheet vs desktop layout
    MAX_STARS: 3,                // Gamification star count
    OVERLAY_PADDING: 32,         // px - padding around overlay canvas
    MAX_LOG_ENTRIES: 100,        // Debug log max entries before pruning
    RIVE_LOAD_TIMEOUT: 5000,     // ms - timeout for Rive runtime to load
    DEBOUNCE_RESIZE: 250,        // ms - resize event debounce delay
};
