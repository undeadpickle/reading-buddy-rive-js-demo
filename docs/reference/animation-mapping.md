# Animation Mapping: Lottie → Rive

## How Epic's Lottie Works

Epic uses `lottie-web` with marker-based animation:

```javascript
// Epic's pattern
lottieInstance.playSegments([startFrame, endFrame]);

// Markers defined in Lottie JSON (66 named segments)
// Examples: idle, wave, jump, giggle, feeding, happy, celebrate, etc.
```

## Our Rive Mapping

We map marker names to Rive state machine inputs:

```javascript
// In js/config.js
export const ANIMATION_MAPPING = {
  'idle':      { trigger: null },                                    // Default state
  'giggle':    { trigger: 'trig_wave' },                            // Tap response
  'wave':      { trigger: 'trig_wave' },                            // Greeting
  'jump':      { trigger: 'trig_jump' },                            // Excitement
  'feeding':   { trigger: 'trig_wave', boolean: 'isHappy', value: true },  // Reward
  'celebrate': { trigger: 'trig_jump' },                            // Star earned
  'hooray':    { trigger: 'trig_wave' },                            // Generic celebration
};
```

## Usage in Data Adapter

```javascript
playSegment(markerName) {
  const mapping = ANIMATION_MAPPING[markerName];
  if (!mapping) return;

  if (mapping.trigger) {
    fireTrigger(mapping.trigger);
  }
  if (mapping.boolean !== undefined) {
    setBoolean(mapping.boolean, mapping.value);
  }
}
```

## Epic Marker Reference (from technical doc)

| Marker | Frames | Purpose |
|--------|--------|---------|
| idle | 0-60 | Default resting state |
| wave | 61-120 | Greeting animation |
| jump | 121-180 | Excited jump |
| giggle | 181-220 | Tap response |
| feeding | 221-350 | Receiving food reward |
| happy | 351-450 | Post-reward happy state |
| readingCelebrationIntro | 451-510 | Daily goal celebration start |
| readingCelebrationLoop | 511-570 | Celebration loop |
| readingCelebrationPop | 571-630 | Celebration end |

## Adding New Mappings

1. Add entry to `ANIMATION_MAPPING` in `js/config.js`
2. If new Rive trigger needed, add to Rive Editor
3. Update `STATE_INPUTS.triggers` array in config

## Current Rive Inputs Available

```javascript
// Triggers (fire once, auto-reset)
'trig_wave', 'trig_jump', 'trig_showBubble', 'trig_hideBubble'

// Booleans (persistent state)
'isHappy', 'isReading', 'isBubbleVisible'

// Numbers
'energyLevel'  // Not yet wired in Rive
```
