# CLAUDE.md

## Active Project: Epic Lottie → Rive Compatibility Layer

**Branch:** `feature/epic-lottie-compat`

**IMPORTANT:** Read `docs/lottie-compat/STATUS.md` at session start for current progress.

**Quick Links:**

- [STATUS.md](docs/lottie-compat/STATUS.md) - Current progress (read first!)
- [README.md](docs/lottie-compat/README.md) - Project overview & background docs
- [phases/](docs/lottie-compat/phases/) - Detailed phase instructions

**Goal:** Compatibility layer so Rive receives data in Epic's Lottie format. Enables A/B testing without changing Epic's data layer.

**Collaboration:** Check with user before non-obvious decisions. Commit only after verification. Update STATUS.md after each phase.

---

## Project Overview

Vanilla JS demo using Rive animations with OOB (out-of-band) asset swapping. Animated "reading buddy" characters with 11 variants and dynamic PNG body part swapping.

## Commands

```bash
python3 -m http.server 8080     # Start dev server
open http://localhost:8080      # Open browser
lsof -ti:8080 | xargs kill -9   # Kill stale server
```

No build/bundler/tests - vanilla JS via ES modules.

## Git

**Repo:** https://github.com/undeadpickle/reading-buddy-rive-js-demo

`.mcp.json` is gitignored (local MCP config).

## Architecture

### Modules

- **js/config.js** - Central config: Rive path, buddy variants, body parts, state machine inputs, animation mappings
- **js/asset-loader.js** - OOB asset preloading, image caching, Rive assetLoader callback
- **js/rive-controller.js** - Rive lifecycle, state machine inputs, buddy switching
- **js/data-adapter.js** - Epic API → Rive transformer
- **js/ui-controls.js** - DOM handlers, buddy selector, animation buttons
- **js/gamification-ui.js** - Star counter UI

### Data Flow

1. Page load → preload buddy PNGs into cache
2. Init Rive → assetLoader intercepts OOB requests → serves from cache
3. Buddy switch → cleanup old instance → reinit with new buddy's assets

### Asset Structure

```
public/
├── rive/reading-buddy.riv
└── reading-buddies/[buddy-id]/[body-part].png
```

Body parts (must match Rive Editor names exactly): head, headBack, torso, armLeft, armRight, legLeft, legRight, eyeLeft, eyeRight, eyeBlinkLeft, eyeBlinkRight, tail (optional).

### OOB Asset Pattern (Critical)

This is the core pattern for dynamic asset swapping:

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

## Rive Notes

- Runtime: `@rive-app/canvas@2.33.1` via CDN
- State machine: `BuddyStateMachine` - check config.js for current triggers/booleans/numbers
- Artboard set to `null` in constructor to use default (avoids "Invalid artboard name" errors)
- Animations need transitions wired in Rive Editor with 100% exit time to prevent loops
- Use Context7 MCP with `rive-app/rive-docs` for API docs

## Critical Gotchas

### Export vs Save
**Save** = Rive cloud only. **Export** = writes .riv to disk. Always export after changes.

### Browser Cache
Symptoms: old .riv, stale assets, animations not firing. Fix: `Cmd+Shift+R` or incognito.

## MCP Troubleshooting

**Rive MCP not connecting?**
1. Rive Early Access must be running (not standard Rive)
2. A .riv file must be open
3. Restart Claude Code after Rive is running
4. Check `.mcp.json` has `"rive": { "url": "http://localhost:9791/sse" }`

**Chrome DevTools MCP issues?**
```bash
pkill -f "chrome-devtools-mcp"  # Then restart Claude Code
```
