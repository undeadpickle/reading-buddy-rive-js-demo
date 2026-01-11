# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reading Buddy Rive Demo - A vanilla JS interactive character demo using Rive animations with OOB (out-of-band) asset swapping. Displays animated "reading buddy" characters with 11 variants and dynamic PNG body part swapping.

## Development Commands

```bash
# Start local development server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080

# Kill stale server (if port is in use)
lsof -ti:8080 | xargs kill -9
```

No build, bundler, or test commands - this is a vanilla JS project loaded via ES modules.

## Git & Repository

**Repo:** https://github.com/undeadpickle/reading-buddy-rive-js-demo

```bash
# Standard git workflow
git add -A && git commit -m "message" && git push

# Pull latest
git pull origin main
```

**Note:** `.mcp.json` is gitignored (contains local MCP config). Clone users need to create their own.

## Rive MCP Connection Check

**At the start of each session**, verify the Rive MCP server is connected by running `mcp__rive__listStateMachines` or `mcp__rive__listLinearAnimations`. If it works, you'll see the BuddyStateMachine and animations (idle, wave, jump, blink).

### If connection fails, troubleshoot in order:

1. **Is Rive Early Access running?** - The MCP server is built into the app; open Rive Early Access on Mac

2. **Is a Rive file open?** - Open `reading-buddy.riv` in Rive Early Access (the file this project uses)

3. **Restart Claude Code** - MCP connections are established at startup; restart the session after Rive is running

4. **Check .mcp.json config** - Should contain:
   ```json
   {
     "mcpServers": {
       "rive": {
         "url": "http://localhost:9791/sse"
       }
     }
   }
   ```

5. **Port conflict?** - Check if something else is using port 9791: `lsof -i :9791`

6. **Rive version issue?** - Make sure you're running Rive Early Access (not standard Rive) - MCP is only available in Early Access

### Chrome DevTools MCP Issues
If Chrome DevTools MCP has connection problems (browser already running error):
```bash
# Kill stale browser processes
pkill -f "chrome-devtools-mcp"
# Then restart Claude Code session to reconnect
```

## Architecture

### Module Structure

- **js/config.js** - Central configuration: Rive file path, buddy variants, body parts list, state machine inputs, event mappings
- **js/logger.js** - Centralized logging utility with debug panel output
- **js/asset-loader.js** - OOB asset preloading, image caching (Map of buddyId → Map of bodyPart → Uint8Array), and Rive assetLoader callback
- **js/rive-controller.js** - Rive instance lifecycle, state machine input caching, trigger/boolean/number input control, buddy switching
- **js/ui-controls.js** - DOM event handlers, buddy selector grid, animation buttons, event simulators
- **js/main.js** - Entry point, initialization sequence, FPS counter

### Data Flow

1. Page load → preload all buddy PNGs (11-12 per buddy, ~150 total) into memory cache
2. Initialize Rive with default buddy → assetLoader callback intercepts OOB image requests → serves from cache
3. Buddy switch → cleanup old Rive instance → reinitialize with new buddy's cached assets

### Rive OOB Asset Pattern (Critical)

```javascript
assetLoader: async (asset, bytes) => {
    // Fonts: must explicitly decode even when embedded (see "Fonts Not Rendering" gotcha)
    if (asset.isFont && bytes.length > 0) {
        const font = await rive.decodeFont(bytes);
        asset.setFont(font);
        font.unref();
        return true;
    }
    // Other embedded/CDN assets: let Rive handle
    if (bytes.length > 0 || asset.cdnUuid?.length > 0) return false;
    // OOB images: load from cache
    if (asset.isImage) {
        const image = await rive.decodeImage(imageBytes);
        asset.setRenderImage(image);
        image.unref(); // CRITICAL: Prevents memory leak
        return true;
    }
    return false;
}
```

Assets must be named exactly as defined in Rive Editor (case-sensitive): head, headBack, torso, armLeft, armRight, legLeft, legRight, eyeLeft, eyeRight, eyeBlinkLeft, eyeBlinkRight, tail.

### Asset Structure

```
public/
├── rive/reading-buddy.riv       # Rive file with bones + BuddyStateMachine
└── reading-buddies/
    └── [buddy-id]/              # catdog-orange, catdog-blue, etc.
        └── [body-part].png      # 11-12 PNGs per buddy (500x500px transparent)
```

## Rive-Specific Notes

- Rive runtime loaded via CDN: `@rive-app/canvas@2.33.1`
- State machine: `BuddyStateMachine` with triggers (`trig_wave`, `trig_jump`), booleans (`isHappy`, `isReading`), and number (`energyLevel` - coming soon)
- Artboard config set to `null` to use default (avoid "Invalid artboard name" errors)
- State machine inputs are View Model properties, not traditional inputs
- Animations need transitions wired in Rive Editor with 100% exit time to prevent loops
- BlinkLayer auto-cycles through blink animations (no trigger needed)

## Buddy Variants

All buddies have standard body parts. Some buddies don't have tails:
- **master-hamster**: No tail
- **george**: No tail
- **maddie**: No tail

Asset loading gracefully skips tail for buddies with `hasTail: false` in config.

### Adding New Buddies

1. Create folder: `public/reading-buddies/[buddy-id]/`
2. Add PNG assets (11-12 files, 500x500px transparent):
   - Required: head, headBack, torso, armLeft, armRight, legLeft, legRight, eyeLeft, eyeRight, eyeBlinkLeft, eyeBlinkRight
   - Optional: tail (omit if character has no tail)
3. Add entry to `BUDDIES` object in `js/config.js`:
   ```javascript
   'buddy-id': { name: 'Display Name', hasTail: true },  // or hasTail: false
   ```
4. Test in browser - buddy appears automatically in selector grid

## Known Issues / Current State

- `energyLevel` number input exists but not yet wired to visual effects in Rive (UI shows "coming soon")
- `catdog-orange-mouthshapes` folder exists with mouth shape assets but not integrated (future feature)

## Gotchas & Troubleshooting

### Input Names Must Match Exactly
- JS `config.js` input names must match Rive input names exactly (case-sensitive)
- Current triggers: `trig_wave`, `trig_jump`
- Current booleans: `isHappy`, `isReading`
- Current numbers: `energyLevel`
- Check debug log for `Input found: [name]` vs `[Type] not found: [name]`

### Browser Cache Issues
- **Symptoms:** Old .riv file playing, assets not updating, animations not firing
- **Quick fix:** Hard refresh `Cmd+Shift+R`
- **Nuclear option:** Kill server (`lsof -ti:8080 | xargs kill -9`), restart, use incognito window

### Rive Export vs Save
- **Save** only saves to Rive's cloud - doesn't update local .riv file
- **Export** writes the actual .riv file to disk - required after making changes in Rive Editor

### Harmless Errors (Ignore These)
- `Missing asset in cache: tail` - Expected for tailless buddies (master-hamster, george, maddie)

### View Model Data Binding Requires Runtime 2.33+
- **Symptom:** `riveInstance.viewModelInstance` returns null
- **Fix:** Update CDN in `index.html` to `@rive-app/canvas@2.33.1`+, ensure `autoBind: true` in Rive constructor

### Fonts Not Rendering with Custom assetLoader
When using a custom `assetLoader` (for OOB image swapping), **embedded fonts won't render** if you just `return false`. You must explicitly decode and set them:
```javascript
if (asset.isFont && bytes.length > 0) {
    const font = await rive.decodeFont(bytes);
    asset.setFont(font);
    font.unref();
    return true;
}
```
This applies even though Rive docs suggest `return false` should let Rive handle embedded assets automatically. The fix is in `js/asset-loader.js`.
