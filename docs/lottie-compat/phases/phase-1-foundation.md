# Phase 1: Foundation

## Phase 1A: Mock API Data Files (DONE)

**Created:**
- `public/api/buddy.json`
- `public/api/daily-tasks.json`

**Structure matches Epic's API exactly** - see [epic-api-structure.md](../reference/epic-api-structure.md)

---

## Phase 1B: Animation Mapping Config

**Modify:** `js/config.js`

**Add these exports:**

```javascript
// Maps Epic's Lottie marker names → Rive state machine inputs
export const ANIMATION_MAPPING = {
  'idle': { trigger: null },
  'giggle': { trigger: 'trig_wave' },
  'wave': { trigger: 'trig_wave' },
  'jump': { trigger: 'trig_jump' },
  'feeding': { trigger: 'trig_wave', boolean: 'isHappy', value: true },
  'celebrate': { trigger: 'trig_jump' },
  'hooray': { trigger: 'trig_wave' },
};

// Dialogue contexts from Epic's API
export const DIALOGUE_CONTEXTS = ['adventure', 'celebration', 'hatch', 'celebrationEgg'];
```

**Test:** Demo loads without errors (config is just data, no behavior change)

**Commit:** `Phase 1B: Add animation mapping config`

---

## Phase 1C: Data Adapter Module

**Create:** `js/data-adapter.js`

**Functions:**

```javascript
// Load buddy data from mock API
async loadBuddyData() → fetches public/api/buddy.json

// Get dialogue string for context
getDialogue(context) → returns random string from dialog[context]

// Map Lottie marker → Rive calls
playSegment(markerName) → looks up ANIMATION_MAPPING, fires trigger/sets boolean

// Star management
earnStar() → increments star count, returns new count
getStarProgress() → returns { current, max }
resetStars() → resets to 0
```

**Test:** Import in main.js, log `dataAdapter.getDialogue('adventure')` to console

**Commit:** `Phase 1C: Add data adapter module`
