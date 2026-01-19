# CLAUDE.md

## Project Overview

Rive animation sandbox for Epic's reading buddy characters. 11 buddy variants with dynamic PNG body part swapping via OOB (out-of-band) assets.

**Docs:** [STATUS.md](docs/STATUS.md) tracks remaining work. Reference docs in `docs/reference/`.

## Commands

```bash
python3 -m http.server 8080     # Start dev server
open http://localhost:8080      # Open browser
lsof -ti:8080 | xargs kill -9   # Kill stale server
```

No build/bundler/tests - vanilla JS via ES modules.

## Architecture

### Modules

- **js/config.js** - Central config: Rive path, buddy variants, body parts, state machine inputs, animation mappings, scene definitions, UI constants
- **js/asset-loader.js** - OOB asset preloading, image caching, Rive assetLoader callback
- **js/rive-controller.js** - Rive lifecycle, state machine inputs, buddy switching, scene reset
- **js/scene-controller.js** - Multi-artboard scene switching, overlay management
- **js/data-adapter.js** - Epic API → Rive transformer
- **js/ui-controls.js** - DOM handlers, buddy selector, animation buttons
- **js/gamification-ui.js** - Star counter UI
- **js/utils.js** - Shared utilities (debounce, waitForRive)
- **js/bottom-sheet.js** - Mobile bottom sheet behavior, auto-collapse on interactions
- **js/header.js** - Project switcher dropdown
- **js/projects.js** - Multi-project registry
- **js/logger.js** - Centralized console + debug panel logging
- **js/snowfall-controller.js** - Snowfall particles demo, ViewModel binding to Lua script
- **js/snowfall-main.js** - Snowfall demo entry point

### Data Flow

1. Page load → preload buddy PNGs into cache
2. Init Rive → assetLoader intercepts OOB requests → serves from cache
3. Scene switch (same canvas) → `reset()` reuses decoded assets (fast)
4. Scene switch (different canvas/overlay) → full reinit required
5. Buddy switch → cleanup old instance → reinit with new buddy's assets

### Asset Structure

```
public/
├── rive/reading-buddy.riv
└── reading-buddies/[buddy-id]/[body-part].png
```

Body parts (must match Rive Editor names exactly): head, headBack, torso, armLeft, armRight, legLeft, legRight, eyeLeft, eyeRight, eyeBlinkLeft, eyeBlinkRight, tail (optional).

### OOB Asset Pattern (Critical)

```javascript
assetLoader: async (asset, bytes) => {
  // Fonts: must explicitly decode even when embedded
  if (asset.isFont && bytes.length > 0) {
    const font = await rive.decodeFont(bytes);
    asset.setFont(font);
    font.unref();
    return true;
  }
  // Embedded/CDN assets: let Rive handle
  if (bytes.length > 0 || asset.cdnUuid?.length > 0) return false;
  // OOB images: load from cache
  if (asset.isImage) {
    const image = await rive.decodeImage(imageBytes);
    asset.setRenderImage(image);
    image.unref(); // CRITICAL: prevents memory leak
    return true;
  }
  return false;
};
```

### Rive Lua ↔ JS ViewModel Pattern

For complex Rive animations (like snowfall particles), Lua scripts run inside the Rive runtime and bind to ViewModel properties. JS updates these properties to control the animation at runtime.

**Lua side (in Rive Editor):**
```lua
local function init(self, context)
  local vm = context:viewModel()
  if vm then
    local prop = vm:getNumber('topFlowRate')
    if prop then
      self.topFlowRate = prop.value
      prop:addListener(function()
        self.topFlowRate = prop.value
      end)
    end
  end
end
```

**JS side (snowfall-controller.js):**
```javascript
const prop = viewModelInstance.number('topFlowRate');
if (prop) prop.value = newValue;
```

**Key patterns:**
- Lua uses `addListener()` for reactive updates from JS
- JS uses `viewModelInstance.number()` / `.boolean()` to get property handles
- Canvas dimensions passed via `canvasWidth`/`canvasHeight` ViewModel properties
- Rive `resize()` callback gives artboard size, but JS canvas size may differ
- See `public/rive/rive-scripts/SnowflakeParticles.luau` for full example

### Adding New Input Types to Snowfall Controller

When adding new input types (beyond `number`, `boolean`, `enum`) to `INPUT_CONFIG` in `snowfall-controller.js`:

1. **Update `discoverViewModel()`** — Add type check for property discovery:
   ```javascript
   if (config.type === 'number' || config.type === 'enum' || config.type === 'newType') {
       prop = viewModelInstance.number(name); // or appropriate accessor
   }
   ```

2. **Update default initialization** — If the type has non-zero defaults:
   ```javascript
   if (((config.type === 'number' || config.type === 'enum' || config.type === 'newType') && prop.value === 0 && config.default !== 0) || ...)
   ```

3. **Update `buildControls()`** — Add UI rendering:
   ```javascript
   if (config.type === 'newType') {
       container.appendChild(createNewTypeControl(name, prop, config));
   }
   ```

4. **Create control function** — e.g., `createNewTypeControl(name, prop, config)` returning a DOM element

5. **Add CSS** — Style the new control in `css/snowfall.css`

## Rive Notes

- Runtime: `@rive-app/canvas@2.33.1` for character animation, `@rive-app/webgl@2.34.1` for particles (see config.js header)
- State machine: `BuddyStateMachine` - check config.js for current triggers/booleans/numbers
- Artboard set to `null` in constructor to use default (avoids "Invalid artboard name" errors)
- Animations need transitions wired in Rive Editor with 100% exit time to prevent loops
- Use Context7 MCP with `rive-app/rive-docs` for API docs
- Scene switching uses `riveInstance.reset()` to avoid re-decoding OOB assets
- **Lua artboard inputs require manual Rive Editor setup** — MCP can add ViewModel properties but cannot link component artboards to Lua script inputs. You must: (1) mark artboards as Components (`Shift+N`), (2) select the Lua script, (3) add artboard inputs in the Inputs panel, (4) assign artboards to inputs, (5) Export

### Responsive Full-Width/Height Canvas (Fit.Layout)

For Rive animations that need to fill the entire canvas and respond to resize:

```javascript
new rive.Rive({
    src: 'file.riv',
    canvas: canvasElement,
    layout: new rive.Layout({
        fit: rive.Fit.Layout,
        alignment: rive.Alignment.TopLeft,
    }),
    // ...
});
```

**Critical:** Must use `new Layout({...})` object syntax, not direct `fit:` property.

- `Fit.Layout` makes the artboard resize to match canvas dimensions
- Lua coordinates = canvas CSS coordinates (no scaling math needed)
- Pass actual canvas dimensions to ViewModel for Lua scripts:
  ```javascript
  widthProp.value = canvas.clientWidth;
  heightProp.value = canvas.clientHeight;
  ```
- Call `riveInstance.resizeDrawingSurfaceToCanvas()` on window resize

See [snowfall-controller.js](js/snowfall-controller.js) for working example.

## Critical Gotchas

### Export vs Save
**Save** = Rive cloud only. **Export** = writes .riv to disk. Always export after changes.

### Artboards Must Be Components
Only artboards marked as **components** are included in .riv export. Select artboard → `Shift+N` to toggle. Symptom: "Invalid artboard name" error when switching scenes.

### Browser Cache
Symptoms: old .riv, stale assets, animations not firing.
Fixes:
- **Manual:** `Cmd+Shift+R` (hard refresh)
- **Via MCP:** `navigate_page` with `ignoreCache: true` and `type: reload`
- **Nuclear:** bump `RIVE_FILE_VERSION` in config.js

## MCP Troubleshooting

**Rive MCP not connecting?**
1. Rive Early Access must be running (not standard Rive)
2. A .riv file must be open
3. Restart Claude Code after Rive is running
4. Check `.mcp.json` has `"rive": { "url": "http://localhost:9791/sse" }`

**Chrome DevTools MCP "browser already running" error?**
Symptom: `list_pages` fails with "The browser is already running for .../chrome-profile"
Cause: Stale browser instance from previous session blocking new connection.
```bash
pkill -f "chrome-devtools-mcp"
```
No need to restart Claude Code — MCP reconnects automatically on next tool call.
