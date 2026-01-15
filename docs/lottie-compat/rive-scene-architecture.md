# Rive Scene Architecture Plan

## User Requirements (Confirmed)

1. **Adventures Page** - Small buddy canvas, standalone character, full body visible
2. **Mystery Chest Overlay** - Full-screen, buddy behind chest, animated stars
3. **Same buddy rig** across scenes (just positioned differently)
4. **Full Rive scenes** - chest and stars animated in Rive, not HTML
5. **3-5 total scenes** expected
6. **Per-scene state machines** - Each scene has its own SM
7. **Speech bubble fully in Rive** - Both bubble shape and text in Rive (dynamic via `setTextRunValue`)

## Rive Terminology

| Your Term | Rive Term | Description |
|-----------|-----------|-------------|
| Scene | **Artboard** | A canvas/stage containing artwork and animations |
| Reusable buddy | **Component** | An artboard marked for reuse/nesting |
| Buddy inside scene | **Nested Artboard** | Component embedded in another artboard |

## Recommended Architecture: Nested Artboards (Component Pattern)

```
reading-buddy-scenes.riv (single file)
│
├── Artboard: "Buddy" [COMPONENT]
│   ├── OOB image assets (head, torso, arms, etc.)
│   ├── All buddy animations (wave, jump, idle, celebrate, etc.)
│   └── State machine: "BuddyStateMachine"
│       └── Inputs: trig_wave, trig_jump, trig_celebrate, etc.
│
├── Artboard: "Speech Bubble" [COMPONENT]  ← Separate reusable component
│   ├── Bubble shape with animated tail (3 variants)
│   ├── Text Run ("dialogueText")
│   └── State machine: "BubbleStateMachine"
│       └── Inputs: trig_showLeft, trig_showRight, trig_showTop, trig_hide
│
├── Artboard: "Adventure Scene"
│   ├── Nested: "Buddy" component (full body, centered)
│   ├── Nested: "Speech Bubble" component (positioned per scene)
│   ├── (Optional) Timer/progress elements
│   └── State machine: "AdventureStateMachine"
│       └── Controls buddy AND bubble independently
│
└── Artboard: "Mystery Chest Scene"
    ├── Nested: "Buddy" component (positioned behind chest)
    ├── Nested: "Speech Bubble" component (positioned per scene)
    ├── Chest artwork + open/shake animations
    ├── 3 Stars + fill/sparkle animations
    └── State machine: "ChestStateMachine"
        └── Controls stars, chest, buddy, AND bubble
```

### Why Speech Bubble is Separate

| Requirement | Solution |
|-------------|----------|
| Different tail positions | Bubble SM controls tail direction via input |
| Different positions relative to buddy | Each scene positions bubble independently |
| Reusable across app | Single component, nested wherever needed |
| Consistent animation | Show/hide animations defined once |

## Why This Architecture

| Benefit | Explanation |
|---------|-------------|
| **Single source of truth** | Buddy animations defined once in the component |
| **OOB still works** | Asset swapping happens on the component, works everywhere |
| **Scene-specific positioning** | Each scene places the buddy where needed |
| **Unified state machines** | Scene SM can control both scene elements AND the nested buddy |
| **Single .riv file** | Simple deployment, shared assets, no multi-file coordination |
| **Scales to 3-5 scenes** | Just add more artboards that nest the Buddy component |

## How It Works at Runtime (JS)

### Triggering Nested Buddy Animations

```javascript
// Fire trigger on nested buddy within a scene
rive.setInputStateAtPath("trig_wave", true, "Buddy");

// Path is the hierarchy name of the nested component
```

### Controlling Speech Bubble

```javascript
// Set dialogue text on the bubble's text run
rive.setTextRunValue("dialogueText", "Let's read together!");

// Show bubble with tail pointing right (buddy is to the left)
rive.setInputStateAtPath("trig_showRight", true, "Speech Bubble");

// Later, hide the bubble
rive.setInputStateAtPath("trig_hide", true, "Speech Bubble");
```

### Loading Different Scenes

```javascript
// Each scene is a different artboard in the same file
const adventureRive = new Rive({
  src: "reading-buddy-scenes.riv",
  artboard: "Adventure Scene",        // ← Select which scene
  stateMachines: "AdventureStateMachine",
  canvas: adventureCanvas,
  // ... assetLoader for OOB
});

const chestRive = new Rive({
  src: "reading-buddy-scenes.riv",
  artboard: "Mystery Chest Scene",    // ← Different scene, same file
  stateMachines: "ChestStateMachine",
  canvas: chestCanvas,
  // ... assetLoader for OOB
});
```

## Key Setup Steps in Rive Editor

1. **Create Buddy artboard** with all animations and OOB assets
2. **Mark Buddy as Component** - Select artboard → Inspector → Component toggle (or `Shift+N`)
3. **Create Speech Bubble artboard** with bubble shape, 3 tail variants, text run ("dialogueText")
4. **Mark Speech Bubble as Component**
5. **Create scene artboards** - Adventure Scene, Mystery Chest Scene
6. **Nest Buddy + Speech Bubble** into each scene, position independently
7. **Add scene-specific elements** - chest, stars, backgrounds
8. **Wire state machines** - each scene SM triggers nested buddy + bubble inputs via path

## Speech Bubble Component Design

### Tail Direction: Separate Triggers (Confirmed)

```
BubbleStateMachine inputs:
├── trig_showLeft   → Shows bubble with tail pointing left (buddy is to the right)
├── trig_showRight  → Shows bubble with tail pointing right (buddy is to the left)
├── trig_showTop    → Shows bubble with tail pointing up (buddy is below)
└── trig_hide       → Hides bubble
```

Each trigger plays a distinct animation - explicit, easy to debug, no blend states needed.

### Implementation Notes

- **Text Run naming**: Use "dialogueText" - this is what JS references
- **Font embedding**: Ensure font is embedded in .riv file (not OOB) for text to render
- **Text wrapping**: Set up text box bounds in Rive Editor for multi-line dialogue
- **Positioning**: Each scene places the bubble component where needed (scene-level, not bubble-level)
- **Accessibility**: Consider also exposing text to DOM for screen readers (hybrid approach)

## Alternative Considered: Artboard Properties (Runtime Swapping)

More flexible but overkill here. Artboard Properties let you swap which artboard fills a "slot" at runtime - useful for character creators. Since we're always using the same buddy (just different skins via OOB), nested artboards are simpler and more performant.

---

## Implementation Phases

This plan is primarily a **Rive Editor architecture decision**. Once we agree on this structure, implementation involves:

### Phase 1: Rive Editor Setup
- Restructure existing `reading-buddy.riv` to use the component pattern
- Mark Buddy artboard as component
- Create Speech Bubble artboard as separate component (with text run + tail variants)
- Create Adventure Scene artboard that nests both Buddy and Speech Bubble

### Phase 2: Mystery Chest Scene (New)
- Create Mystery Chest Scene artboard in same file
- Design chest artwork and animations
- Design star fill animations
- Position nested Buddy behind chest
- Wire ChestStateMachine

### Phase 3: JS Integration
- Update `rive-controller.js` to support scene selection via artboard name
- Add `setTextRunValue` wrapper for dialogue
- Update config for new state machine inputs
- Test nested input paths

### Phase 4: Demo Page Updates
- Add scene switcher UI to demo
- Wire up Mystery Chest demo flow

---

## Verification

After implementation:

1. **Buddy component test**: Renders correctly when nested in both scenes
2. **OOB test**: Switching buddy skins works in both scenes
3. **Buddy animation test**: Triggers fire on nested buddy via path
4. **Speech Bubble component test**: Renders in different positions per scene
5. **Bubble tail test**: Tail position changes correctly (left/right/top)
6. **Text test**: `setTextRunValue` updates dialogue text
7. **Scene isolation**: Each scene's SM operates independently
