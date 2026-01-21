# Current Status

**Last Updated:** 2026-01-18

## Progress

### Core Features
- [x] Phase 1A: Mock API data files
- [x] Phase 1B: Animation mapping config
- [x] Phase 1C: Data adapter module
- [x] Phase 2A: Star counter UI
- [x] Phase 2B: Gamification controls
- [x] Phase 3A: Wire gamification
- [x] Phase 3B: Wire dialogue system
- [x] Phase 3C: Canvas tap response
- [x] Phase 4: Documentation
- [x] Scene Switching: Multi-artboard support with fast reset optimization

### Recent Features (2026-01)
- [x] Mobile UI: Bottom sheet, FAB toggle, auto-collapse on interactions
- [x] Epic Header: Logo and branding
- [x] Project Switcher: Dropdown to switch between demos
- [x] Snowfall Particles Demo: Lua script particle system with ViewModel binding
- [x] ViewModel UI Controls: Runtime control of Lua script parameters
- [x] Snowflake Particle Shapes: Enum input type, dropdown UI, 3 snowflake variants

### Pending
- [ ] Phase 5A: Add trig_giggle animation (Rive)
- [ ] Phase 5B: Add trig_celebrate animation (Rive)
- [ ] Phase 5C: Update JS config for new animations

## Status: ACTIVE DEVELOPMENT

### Snowfall Particles Demo (COMPLETE)

New demo page (`snowfall.html`) showcasing Rive's Lua scripting capabilities:
- Full-viewport particle system with physics simulation
- ViewModel data binding between JS and Lua script
- Runtime-adjustable parameters (flow rate, velocity, wind, accumulation)
- Uses WebGL runtime (`@rive-app/webgl@2.34.1`) for particle performance
- Lua script located at `public/rive/rive-scripts/SnowflakeParticles.luau`

### Mobile UI (COMPLETE)

Responsive controls for mobile devices:
- Bottom sheet pattern for control panel
- Floating action button (FAB) to toggle controls
- Auto-collapse after user interactions (buddy select, animation trigger)
- Graceful resize handling between mobile/desktop

### Scene Switching (COMPLETE)

Multi-artboard support with three scenes:
- **Reading Buddy** (default): Standard buddy view with all controls
- **Adventure Page**: Taller layout with buddy + speech bubble
- **Star Rewards**: Full-screen overlay with treasure chest animation

Key implementation details:
- Artboards must be marked as "components" (Shift+N) in Rive Editor to export
- Cache busting via `RIVE_FILE_VERSION` in config.js
- **Performance optimization**: Same-canvas scene switches use `riveInstance.reset()` to avoid re-decoding OOB assets

## Recent Commits

```
0ed8140 Add snowflake particle shapes with dropdown UI
bbc3b3d Fix snowfall canvas to fill full viewport with Fit.Layout
fbf680e Add natural snow mounds, disable debug mode by default
f65f0eb Fix snow floor dimensions bug, extract magic numbers to constants
5ee3f3f Add mobile bottom sheet to snowfall page, fix project switcher on back nav
8716370 Fix project switcher paths for GitHub Pages
60f6150 Refactor: extract utils, centralize constants, update docs
36fccb0 Add ViewModel UI controls for Snowfall particles
4cf0611 Add project switcher dropdown and Snowfall Particles demo
1440aa5 Mobile UI polish: sheet collapse, FAB icon, overlay improvements
```

## Files Created/Modified

### Core Modules
- `js/config.js` - ANIMATION_MAPPING, DIALOGUE_CONTEXTS, SCENES, RIVE_FILE_VERSION, UI_CONSTANTS
- `js/rive-controller.js` - initRiveWithScene(), resetToScene(), ViewModel binding
- `js/scene-controller.js` - Scene switching logic, overlay management
- `js/data-adapter.js` - Epic API compatibility layer
- `js/ui-controls.js` - Scene selector, dialogue presets, canvas click handler
- `js/gamification-ui.js` - Star counter UI
- `js/utils.js` - Shared utilities (debounce, waitForRive)

### New Modules (2026-01)
- `js/bottom-sheet.js` - Mobile bottom sheet behavior
- `js/header.js` - Project switcher dropdown
- `js/projects.js` - Multi-project registry
- `js/logger.js` - Centralized logging
- `js/snowfall-controller.js` - Snowfall demo Rive controller
- `js/snowfall-main.js` - Snowfall demo entry point

### Assets
- `public/api/buddy.json` - Mock getBuddy response
- `public/api/daily-tasks.json` - Mock getTasksForToday response
- `public/rive/rive-scripts/SnowflakeParticles.luau` - Lua particle script

## Collaboration Notes

- User wants to be involved at each step
- Check before making non-obvious decisions
- Sub-agents for research only, not edits
- Commit only after user verification
