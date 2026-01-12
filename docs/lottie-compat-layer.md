# Epic Lottie → Rive Compatibility Layer

Integration guide for using Rive animations with Epic's existing data layer.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Epic Web App                            │
│                                                             │
│   getBuddy() API  ──────────►  buddy.json response          │
│   playSegments(['wave'])  ──►  Lottie marker name           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  data-adapter.js                            │
│                                                             │
│   loadBuddyData()      ──►  Stores buddy config             │
│   getDialogue(context) ──►  Returns random phrase           │
│   playSegment(marker)  ──►  Translates to Rive trigger      │
│   earnStar() / etc.    ──►  Gamification state              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  rive-controller.js                         │
│                                                             │
│   fireTrigger('trig_wave')                                  │
│   setBoolean('isBubbleVisible', true)                       │
│   setDialogueText('Hello!')                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rive State Machine                         │
│                                                             │
│   BuddyStateMachine with triggers, booleans, View Model     │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| Module | Role |
|--------|------|
| `data-adapter.js` | Translates Epic API format to Rive calls. Drop-in replacement for Lottie player calls. |
| `config.js` | Animation mapping table, dialogue contexts, state machine input names. |
| `rive-controller.js` | Low-level Rive instance management, input caching, OOB asset loading. |
| `gamification-ui.js` | Star counter display and animations (HTML/CSS layer). |

## API Reference

### `loadBuddyData()`

Loads buddy data from the API (mock or real).

```javascript
import { loadBuddyData } from './data-adapter.js';

const buddy = await loadBuddyData();
// Returns: { name, id, dialog: { adventure: [...], celebration: [...] }, ... }
```

### `getDialogue(context)`

Returns a random dialogue string for the given context.

```javascript
import { getDialogue } from './data-adapter.js';

const phrase = getDialogue('adventure');
// Returns: "Hi there, let's read!" (random from pool)
```

**Contexts:** `'adventure'`, `'celebration'`, `'hatch'`, `'celebrationEgg'`

### `getAllDialogues(context)`

Returns all unique dialogue strings for a context (useful for dropdowns).

```javascript
import { getAllDialogues } from './data-adapter.js';

const phrases = getAllDialogues('adventure');
// Returns: ["Hi there, let's read!", "I found some books...", ...]
```

### `playSegment(markerName)`

Triggers an animation by Lottie marker name. This is the core compatibility function.

```javascript
import { playSegment } from './data-adapter.js';

playSegment('wave');      // Fires trig_wave
playSegment('celebrate'); // Fires trig_jump
playSegment('giggle');    // Fires trig_wave (tap response)
```

### Gamification

```javascript
import { earnStar, resetStars, getStarProgress } from './data-adapter.js';

earnStar();              // Increments star count (max 3)
resetStars();            // Resets to 0
getStarProgress();       // Returns { current: 2, max: 3 }
```

## Animation Mapping Reference

Lottie markers are translated to Rive triggers via `ANIMATION_MAPPING` in `config.js`:

| Lottie Marker | Rive Trigger | Boolean Side Effect | Notes |
|---------------|--------------|---------------------|-------|
| `idle` | (none) | - | Default state |
| `giggle` | `trig_wave` | - | Canvas tap response |
| `wave` | `trig_wave` | - | Greeting |
| `jump` | `trig_jump` | - | Excitement |
| `feeding` | `trig_wave` | `isHappy = true` | Reward animation |
| `celebrate` | `trig_jump` | - | Star earned |
| `hooray` | `trig_wave` | - | Generic celebration |

### Adding New Mappings

Edit `js/config.js`:

```javascript
export const ANIMATION_MAPPING = {
    // ... existing mappings ...
    'newMarker': { trigger: 'trig_wave' },                    // Simple trigger
    'complex': { trigger: 'trig_jump', boolean: 'isHappy', value: true }, // With boolean
};
```

Then add the corresponding trigger in Rive Editor if needed.

## Switching to Real API

### 1. Update Fetch URL

In `data-adapter.js`, change:

```javascript
// Mock API
const response = await fetch('./public/api/buddy.json');

// Real API
const response = await fetch('https://api.getepic.com/api/v2/buddy/getBuddy', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

### 2. Response Structure

The mock `buddy.json` matches Epic's exact response format:

```json
{
  "success": true,
  "result": {
    "name": "Orange Cat-Dog",
    "id": "catdog-orange",
    "dialog": {
      "adventure": [["phrase1", "phrase2"], ["phrase3"]],
      "celebration": [...],
      "hatch": [...],
      "celebrationEgg": [...]
    }
  }
}
```

No code changes needed if the real API returns this structure.

### 3. Auth Headers

Epic's API requires authentication. Update fetch options with appropriate headers based on your auth implementation.

## Rive Editor Enhancements

### Current Triggers (already wired)

- `trig_wave` - Wave/greeting animation
- `trig_jump` - Jump/excitement animation
- `trig_showBubble` / `trig_hideBubble` - Speech bubble control

### Optional Triggers to Add

For richer mapping, consider adding these triggers in Rive:

| Trigger | Use Case |
|---------|----------|
| `trig_celebrate` | Distinct celebration (currently maps to jump) |
| `trig_giggle` | Distinct tap response (currently maps to wave) |
| `trig_feeding` | Distinct reward animation |

Update `ANIMATION_MAPPING` after adding new triggers.

## Quick Start

```javascript
// 1. Load buddy data
import { loadBuddyData, playSegment, getDialogue } from './data-adapter.js';

await loadBuddyData();

// 2. Play animations (same calls Epic uses for Lottie)
playSegment('wave');       // Buddy waves
playSegment('celebrate');  // Buddy jumps

// 3. Get dialogue
const phrase = getDialogue('adventure');
setDialogueText(phrase);   // Show in speech bubble
```

## Files Modified/Created

| File | Changes |
|------|---------|
| `public/api/buddy.json` | Mock getBuddy API response |
| `public/api/daily-tasks.json` | Mock getTasksForToday response |
| `js/config.js` | Added `ANIMATION_MAPPING`, `DIALOGUE_CONTEXTS` |
| `js/data-adapter.js` | New - Epic API → Rive translation layer |
| `js/gamification-ui.js` | New - Star counter module |
| `js/ui-controls.js` | Added dialogue presets, canvas tap handler |
| `js/main.js` | Added data adapter initialization |
| `index.html` | Added star counter UI, gamification controls |
| `css/styles.css` | Added star counter styles |
