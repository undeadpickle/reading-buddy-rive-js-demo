# Terminology & Definitions

Shared naming conventions for consistency between Claude and collaborators.

## UI Components

### Star Reward Celebration Overlay
The full-screen modal that appears when a child earns a star. Features:
- Large animated stars at the top (currently Lottie, future Rive)
- Buddy peeking from behind mystery chest
- Speech bubble with encouragement text

**Not to be confused with:** Mystery Chest card stars (small HTML/CSS stars in sidebar card)

### Mystery Chest Card
The "What's Inside?" card in the Adventures page sidebar showing:
- Chest image (static PNG)
- Small star progress indicators (HTML/CSS, 1-3 stars)
- "Earn 3 stars to open" text

### Star Progress (Demo)
The HTML/CSS placeholder stars above the canvas in our Rive demo. Used for testing gamification data flow. **Not** a recreation of either Epic UI - just dev tooling.

## Animation Terms

### Lottie Skeleton
Epic's master animation file (`buddySkeleton.json`) containing:
- 4000 frames @ 29.97fps
- 66 named markers for animation segments
- Placeholder asset slots (head, torso, arms, legs, eyes, tail)

Body part images are injected at runtime via `xlink:href`.

### Markers
Named frame ranges in Lottie that define animation segments:
- `idle` (frames 245+) - Default resting state
- `wave` - Greeting animation
- `jump` - Excited jump
- `giggle` - Tap response
- `feeding` - Receiving food reward
- `celebrate` - Star earned celebration
- `holeBuddyIn` - Buddy peeking from mystery chest

Called via `lottieInstance.playSegments([startFrame, endFrame])`.

### OOB Assets (Out-of-Band)
Assets loaded separately from the main animation file. In Rive, these are PNG images loaded via `assetLoader` callback instead of being embedded in the .riv file.

## API Terms

### getBuddy
API endpoint returning buddy data:
- Name and display info
- Asset URLs (body part images)
- Dialogue strings by context (adventure, celebration, hatch)
- Equipped accessories

### getTasksForToday
API endpoint returning daily reading goals:
- `numberOfStars` - Current star count (0-3)
- `dailyTasks[]` - List of reading tasks with completion status

### rewardProgress
Nested object in buddy data tracking mystery chest progress:
- `curProgress` / `maxProgress` - Stars toward chest unlock
- `state` - Chest state (locked, unlockable, opened)

## State Machine Terms (Rive)

### Trigger
Fire-once input that auto-resets. Used for one-shot animations.
- `trig_wave`, `trig_jump`, `trig_showBubble`, `trig_hideBubble`

### Boolean
Persistent on/off state. Used for modes.
- `isHappy`, `isReading`, `isBubbleVisible`

### Number
Continuous value. Used for levels/intensity.
- `energyLevel` (0-100)

## Project-Specific Terms

### Data Adapter
`js/data-adapter.js` - Compatibility layer that transforms Epic API data format into Rive state machine calls. Maps Lottie marker names to Rive triggers.

### Animation Mapping
`ANIMATION_MAPPING` in config.js - Dictionary mapping Epic marker names to Rive inputs:
```javascript
'celebrate': { trigger: 'trig_jump' }
'feeding': { trigger: 'trig_wave', boolean: 'isHappy', value: true }
```

## Common Confusions

| Term | Is | Is NOT |
|------|-----|--------|
| Star Reward Overlay | Full-screen modal with animated stars | Small stars in Mystery Chest card |
| Mystery Chest | Static PNG image | Lottie animation |
| Demo star progress | Dev testing UI | Production star UI |
| Buddy skeleton | Animation file with placeholders | Individual buddy assets |
