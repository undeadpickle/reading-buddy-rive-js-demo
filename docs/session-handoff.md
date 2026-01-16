# Session Handoff

> Updated: 2026-01-15 18:30
> Focus: Snowfall Particles ViewModel UI Controls + Responsive Layout

---

## What Got Done

- **ViewModel UI Controls**: Connected 12 Rive Lua script properties to browser sliders/checkboxes via ViewModel data binding
- **Compact Control Panel**: Made panel scrollable with smaller fonts, tighter spacing, custom scrollbar
- **Rive MCP Integration**: Used MCP to add ViewModel properties (topFlowRate, topVelocity, maxParticles, forceRadius, pushStrength, repelStrength, accumulationRate, maxSnowHeight, accumulationSegments, windStrength, gustFrequency, debugMode)
- **Lua ViewModel Binding**: Updated Lua script to read from ViewModel with property listeners

## What's Next

1. **Fix Particle Spawn Width**: Particles only spawn in center ~60% of viewport, not edge-to-edge. Root cause: Lua script uses `self.width`/`self.height` which don't reflect responsive layout size. Need to use `resize(self, size: Vec2D)` callback instead.
2. **Test Responsive Behavior**: Once fixed, verify particles fill viewport on window resize and different screen sizes
3. **Consider ViewModel approach**: Alternative fix - pass canvas dimensions via ViewModel properties from JS

## Blockers

- **Lua Script Architecture**: The particle spawn bounds are hardcoded to use `self.width` which returns initial layout size, not the computed size after `Fit.Fill`/`Fit.Layout` scaling. Requires Lua script modification in Rive Editor.

---

## Session Retrospective

### What Worked

- **ViewModel Data Binding**: `autoBind: true` + `viewModelInstance.number(name)` / `.boolean(name)` API works perfectly for real-time UI control of Lua script properties
- **Rive MCP for Bulk Property Addition**: Used `mcp__rive__addProperties` to add all 12 ViewModel properties at once
- **Property Listeners in Lua**: `prop:addListener(function() ... end)` pattern for reactive updates
- **CSS Compaction Strategy**: Reducing font sizes to 0.625-0.75rem, padding to 3-4px, and adding max-height with overflow-y: auto worked well

### What Broke

- **Fit Mode Confusion**: Tried `Fit.Fill`, `Fit.Layout`, `Fit.Cover` - none made particles span full viewport because the issue is in the Lua spawn logic, not the runtime scaling
- **Artboard Size Experiments**: Changed artboard from 1x1 Fill to 1920x1080 Fixed, Scripted Layout to Fill x Fill - didn't fix spawn width because `self.width` in Lua doesn't update
- **Luau Dynamic Indexing**: First Lua fix attempt used `self[name] = value` which fails with "Cannot add indexer to table" - Luau typed tables don't support dynamic property access

### Wrong Assumptions

- **Assumed `self.width` Was Computed Size**: Expected `self.width`/`self.height` in Layout Script to reflect final computed dimensions. Actually returns initial/design-time values. Must use `resize(self, size: Vec2D)` callback to get actual runtime size.
- **Assumed Fit Mode Would Fix Spawn Area**: `Fit.Fill` stretches the rendered output but doesn't change the coordinate space the Lua script sees internally.

---

## Quirks Discovered

- **Script `Input<T>` vs ViewModel**: Lua script `Input<number>` types are editor-only configuration, NOT accessible at runtime. Use ViewModel properties + `context:viewModel()` for runtime control.
- **`resize` Callback for Layout Scripts**: The only way to get actual computed layout dimensions is via `resize(self, size: Vec2D)` callback - `self.width`/`self.height` may be stale.
- **Luau Type System**: Can't dynamically index typed tables like `self[varName]`. Must explicitly access each property by name.

---

## Key Files Modified

- `js/snowfall-controller.js` - Rewrote for ViewModel API (was state machine inputs)
- `js/snowfall-main.js` - Added devicePixelRatio change listener
- `css/snowfall.css` - Compact scrollable control panel
- `public/rive/snow-fall-particles.riv` - Added ViewModel properties, changed artboard to 1920x1080

## Code Pattern for ViewModel Binding

**JS Side:**
```javascript
const riveInstance = new Rive({
  autoBind: true,  // Enable ViewModel
  fit: Fit.Fill,
  // ...
});
const prop = riveInstance.viewModelInstance.number('propertyName');
prop.value = 42;  // Updates Lua in real-time
```

**Lua Side:**
```lua
local vm = context:viewModel()
local prop = vm:getNumber('propertyName')
prop:addListener(function() self.myValue = prop.value end)
```

---

## CLAUDE.md Suggestions

- [ ] Add section on ViewModel data binding pattern for Scripted Layouts
- [ ] Add note: "Script `Input<T>` is editor-only; use ViewModel for runtime control"
- [ ] Add note: "Layout Script `resize(self, size)` callback is required for responsive spawn bounds"
- [ ] Update Rive runtime version note (using webgl@2.34.1 for Snowfall, canvas@2.33.1 for Reading Buddy)
