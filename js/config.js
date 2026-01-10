// js/config.js
// Configuration and constants for the Reading Buddy demo

export const CONFIG = {
    RIVE_FILE: './public/rive/reading-buddy.riv',
    ASSETS_BASE: './public/reading-buddies',
    CANVAS_SIZE: 500,
    STATE_MACHINE: 'BuddyStateMachine',  // State machine name in .riv
    ARTBOARD: 'Reading Buddy',  // Explicit artboard name (required for View Model binding)
    DEFAULT_BUDDY: 'catdog-orange',
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
    triggers: ['trig_wave', 'trig_jump'],
    // Booleans (on/off states) - must match Rive input names exactly
    booleans: ['isHappy', 'isReading'],
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
