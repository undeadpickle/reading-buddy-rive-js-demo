# Epic Lottie → Rive Compatibility Layer

## Quick Context (for Claude Code)

**Goal:** Create a compatibility layer so the Rive demo can receive data in the same format Epic's web app sends to Lottie. This enables A/B testing of Rive as a Lottie replacement.

**Branch:** `feature/epic-lottie-compat`

**Current Status:** See [STATUS.md](./STATUS.md)

## Architecture

```
Epic API Format (mock JSON)
         ↓
   data-adapter.js  ←→  UI Controls
         ↓
   rive-controller.js
         ↓
   Rive State Machine
```

## Key Insight

Epic uses `playSegments([startFrame, endFrame])` with named markers. We map marker names → Rive triggers via `ANIMATION_MAPPING` in config.js.

## File Map

| New File | Purpose |
|----------|---------|
| `public/api/buddy.json` | Mock getBuddy API response |
| `public/api/daily-tasks.json` | Mock getTasksForToday response |
| `js/data-adapter.js` | Epic API → Rive transformer |
| `js/gamification-ui.js` | Star counter UI module |

## Phase Overview

| Phase | Scope | Status |
|-------|-------|--------|
| 1A | Mock API data files | Done |
| 1B | Animation mapping config | Done |
| 1C | Data adapter module | Done |
| 2A | Star counter UI | Done |
| 2B | Gamification controls | Done |
| 3A | Wire gamification | Done |
| 3B | Wire dialogue system | Done |
| 3C | Canvas tap response | Done |
| 4 | Documentation | Done |
| 5A | trig_giggle animation (Rive) | Pending |
| 5B | trig_celebrate animation (Rive) | Pending |
| 5C | JS config update | Pending |

## Navigation

- **Current status:** [STATUS.md](./STATUS.md)
- **Phase details:** [phases/](./phases/)
- **API reference:** [reference/](./reference/)
- **Terminology:** [reference/terminology.md](./reference/terminology.md)

## Background Docs

- **[Epic Rive Integration Guide](../epic-rive-integration-guide.md)** - Production-ready guide for integrating Rive into Epic (assetLoader patterns, gotchas, migration checklist)
- **[Epic Web App Technical Architecture](../Epic%20Web%20App%20-%20Adventures%20Page%20Technical%20Architecture.md)** - Deep dive into how Epic's current Lottie implementation works (API responses, markers, component structure, what's in Lottie vs HTML)
