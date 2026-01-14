# Epic Rive Integration Guide

A production-ready guide for integrating Rive animations into Epic's reading buddy experience, based on lessons learned from building this demo.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Epic's Current Architecture](#epics-current-architecture)
3. [Rive File Setup](#rive-file-setup)
4. [The assetLoader Pattern](#the-assetloader-pattern)
5. [Integration Options](#integration-options)
6. [Animation API Translation](#animation-api-translation)
7. [Gotchas & Troubleshooting](#gotchas--troubleshooting)
8. [Performance Comparison](#performance-comparison)
9. [Migration Checklist](#migration-checklist)

---

## Executive Summary

### Why Rive Over Lottie?

| Aspect | Lottie | Rive |
|--------|--------|------|
| Renderer | SVG (DOM updates) | Canvas (GPU-accelerated) |
| Interactivity | Manual JS event binding | Built-in state machines |
| Animation control | Frame-based (`playSegments`) | State-based (triggers) |
| Runtime complexity | Simpler, frame-driven | More powerful, event-driven |
| File size | JSON (larger) | Binary (smaller) |

### What Changes

- Animation renderer: `<s1-lottie>` SVG → `<canvas>` element
- Animation control: `playSegments([start, end])` → `fireTrigger('trig_name')`
- Asset loading: `xlink:href` injection → `assetLoader` callback

### What Stays the Same

- Asset CDN URLs (same PNGs)
- API response format (buddy data structure)
- Component positioning (fixed, bottom-left)
- Z-index layering

---

## Epic's Current Architecture

### Z-Index Layer Stack

```
Z-INDEX LAYERS (from browser inspection):
├── 99999 - Modal/emergency overlay (hidden)
├── 199   - Reading Buddy (fixed position, bottom-left)
├── 80    - EPIC-READ component (book reader)
├── 10    - UI controls (close button, page slider)
└── 1     - Timer, slider thumbs
```

### Current Component Structure

```html
<reading-buddy-popover>
  <epic-reading-buddy-eggbert>
    <div class="buddy-popover-wrapper hatched"
         style="position: fixed; z-index: 199;">
      <div class="reading-buddy-click-wrapper">
        <reading-buddy-avatar>
          <div style="width: 400px; height: 400px;">
            <!-- CURRENT: Lottie SVG renderer -->
            <s1-lottie>
              <svg viewBox="0 0 1000 1000">
                <!-- Body parts as <image> elements -->
                <image xlink:href="https://cdn.../head.png" />
              </svg>
            </s1-lottie>
          </div>
        </reading-buddy-avatar>
      </div>
    </div>
  </epic-reading-buddy-eggbert>
</reading-buddy-popover>
```

### How Lottie Loads Assets

Epic's Lottie implementation:
1. Fetches buddy JSON from API (includes CDN URLs for body parts)
2. Lottie JSON contains `<image>` placeholders
3. Runtime injects `xlink:href` attributes with CDN URLs
4. Browser fetches PNGs on-demand

---

## Rive File Setup

### Artboard Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Artboard name | `Reading Buddy` | Must match JS config |
| Dimensions | 1000 x 1000 | Match Lottie viewBox |
| Background | Transparent | For overlay use |

**Note:** Our demo uses 500x500, but production should use 1000x1000 to match Epic's existing asset dimensions.

### OOB Asset Names (Case-Sensitive!)

Assets must be named **exactly** as shown - Rive matching is case-sensitive:

```
Required (all buddies):
├── head
├── headBack
├── torso
├── armLeft
├── armRight
├── legLeft
├── legRight
├── eyeLeft
├── eyeRight
├── eyeBlinkLeft
├── eyeBlinkRight

Optional (some buddies):
└── tail          # Only for buddies with hasTail: true
```

Buddies without tails: `master-hamster`, `george`, `maddie`

### State Machine Structure

```
BuddyStateMachine
├── Layers
│   ├── BodyLayer      # idle, wave, jump animations
│   ├── BlinkLayer     # Auto-cycling blink animation
│   └── BubbleLayer    # Speech bubble show/hide
│
└── Inputs
    ├── Triggers (fire once, auto-reset)
    │   ├── trig_wave
    │   ├── trig_jump
    │   ├── trig_showBubble
    │   └── trig_hideBubble
    │
    ├── Booleans (persistent state)
    │   ├── isHappy
    │   ├── isReading
    │   └── isBubbleVisible
    │
    └── Numbers
        └── energyLevel     # 0-100, for future use
```

### Export Settings

In Rive Editor:
1. **File → Export**
2. Check **"Use referenced assets"** (critical for OOB loading)
3. Export as `.riv` file
4. Place in your assets directory

**Common mistake:** Using "Save" instead of "Export" - Save only syncs to Rive cloud, doesn't update local `.riv` file.

---

## The assetLoader Pattern

This is the most critical part of integration. Get this wrong and assets won't load or fonts won't render.

### Why Custom assetLoader?

When Rive encounters an OOB (out-of-band) referenced asset, it calls your `assetLoader` callback. You must:
1. Fetch the asset bytes (from CDN or cache)
2. Decode the bytes using Rive's decoder
3. Set the decoded asset on the Rive asset object
4. Return `true` to indicate you handled it

### Complete Pattern (Don't Use Simplified Versions!)

```javascript
// The CORRECT pattern with all gotchas handled
assetLoader: async (asset, bytes) => {
    // ===========================================
    // 1. FONT HANDLING (Critical Gotcha!)
    // ===========================================
    // Even embedded fonts need explicit decoding when using custom assetLoader
    // Without this, text won't render even though docs suggest return false should work
    if (asset.isFont && bytes.length > 0) {
        try {
            const font = await rive.decodeFont(bytes);
            asset.setFont(font);
            font.unref();  // Prevent memory leak
            return true;
        } catch (err) {
            console.error(`Font decode error: ${err.message}`);
            return false;
        }
    }

    // ===========================================
    // 2. EMBEDDED/CDN ASSETS
    // ===========================================
    // If asset has bytes (embedded) or CDN UUID (Rive-hosted), let Rive handle it
    if (bytes.length > 0 || asset.cdnUuid?.length > 0) {
        return false;
    }

    // ===========================================
    // 3. OOB IMAGE LOADING
    // ===========================================
    if (asset.isImage) {
        const assetName = asset.name;  // e.g., "head", "torso"

        try {
            // Option A: From pre-loaded cache (recommended)
            const imageBytes = assetCache.get(assetName);

            // Option B: On-demand from CDN
            // const response = await fetch(`${CDN_BASE}/${buddyId}/${assetName}.png`);
            // const imageBytes = new Uint8Array(await response.arrayBuffer());

            if (!imageBytes) {
                console.warn(`Missing asset: ${assetName}`);
                return false;
            }

            // Decode using Rive's image decoder
            const image = await rive.decodeImage(imageBytes);

            // Set on the asset
            asset.setRenderImage(image);

            // CRITICAL: unref to prevent memory leak
            image.unref();

            return true;
        } catch (err) {
            console.error(`Image load error for ${assetName}: ${err.message}`);
            return false;
        }
    }

    // Not an asset type we handle
    return false;
}
```

### Pre-Caching vs On-Demand

| Approach | Pros | Cons |
|----------|------|------|
| **Pre-cache all** | Instant buddy switching, no loading states | Higher initial load time, more memory |
| **On-demand** | Lower initial load, lazy loading | Visible loading delays on switch |
| **Hybrid** | Pre-cache current + adjacent buddies | More complex logic |

**Recommendation:** Pre-cache for the reading experience where buddy switching is a deliberate action, not rapid browsing.

```javascript
// Pre-caching pattern
async function preloadBuddyAssets(buddyId) {
    const assets = new Map();
    const bodyParts = ['head', 'torso', 'armLeft', /* ... */];

    await Promise.all(bodyParts.map(async (part) => {
        const response = await fetch(`${CDN}/${buddyId}/${part}.png`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        assets.set(part, bytes);
    }));

    return assets;
}
```

---

## Integration Options

### Option A: Direct Replacement (Recommended for POC)

Replace the `<s1-lottie>` element contents with a canvas:

```html
<!-- BEFORE -->
<reading-buddy-avatar>
  <div style="width: 400px; height: 400px;">
    <s1-lottie>...</s1-lottie>
  </div>
</reading-buddy-avatar>

<!-- AFTER -->
<reading-buddy-avatar>
  <div style="width: 400px; height: 400px;">
    <canvas id="rive-buddy"
            width="1000" height="1000"
            style="width: 100%; height: 100%;">
    </canvas>
  </div>
</reading-buddy-avatar>
```

```javascript
const riveInstance = new rive.Rive({
    src: '/assets/animations/reading-buddy.riv',
    canvas: document.getElementById('rive-buddy'),
    stateMachines: 'BuddyStateMachine',
    autoplay: true,
    assetLoader: createAssetLoader(buddyId, rive)
});
```

### Option B: Angular Component (Production)

```typescript
import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
    selector: 'epic-rive-buddy',
    template: `<canvas #riveCanvas></canvas>`,
    styles: [`canvas { width: 100%; height: 100%; }`]
})
export class RiveBuddyComponent implements AfterViewInit, OnDestroy {
    @ViewChild('riveCanvas') canvas: ElementRef<HTMLCanvasElement>;
    @Input() buddyId: string;
    @Input() set trigger(value: string) {
        if (value && this.stateMachine) {
            this.fireTrigger(value);
        }
    }

    private riveInstance: rive.Rive;
    private stateMachine: rive.StateMachineInput[];

    ngAfterViewInit() {
        this.initRive();
    }

    ngOnDestroy() {
        // Critical: cleanup to prevent memory leaks
        this.riveInstance?.cleanup();
    }

    private async initRive() {
        await preloadBuddyAssets(this.buddyId);

        this.riveInstance = new rive.Rive({
            src: '/assets/animations/reading-buddy.riv',
            canvas: this.canvas.nativeElement,
            stateMachines: 'BuddyStateMachine',
            autoplay: true,
            assetLoader: createAssetLoader(this.buddyId, rive),
            onLoad: () => {
                this.stateMachine = this.riveInstance
                    .stateMachineInputs('BuddyStateMachine');
            }
        });
    }

    fireTrigger(name: string) {
        const input = this.stateMachine?.find(i => i.name === name);
        if (input?.type === rive.StateMachineInputType.Trigger) {
            input.fire();
        }
    }
}
```

### Option C: Feature Flag A/B Test

```typescript
// In reading-buddy.component.ts
@Component({
    selector: 'reading-buddy-avatar',
    template: `
        <ng-container *ngIf="useRive; else lottieTemplate">
            <epic-rive-buddy [buddyId]="buddyId"></epic-rive-buddy>
        </ng-container>
        <ng-template #lottieTemplate>
            <s1-lottie [options]="lottieOptions"></s1-lottie>
        </ng-template>
    `
})
export class ReadingBuddyAvatarComponent {
    useRive = this.featureFlags.isEnabled('reading-buddy-rive');
}
```

---

## Animation API Translation

### Lottie → Rive Mapping

Epic's Lottie uses `playSegments([startFrame, endFrame])` with named markers. We map those marker names to Rive triggers:

```javascript
const ANIMATION_MAPPING = {
    // Marker name → Rive action
    'idle':      { trigger: null },                  // Default state
    'giggle':    { trigger: 'trig_wave' },          // Tap response
    'wave':      { trigger: 'trig_wave' },          // Greeting
    'jump':      { trigger: 'trig_jump' },          // Excitement
    'feeding':   { trigger: 'trig_wave', boolean: 'isHappy', value: true },
    'celebrate': { trigger: 'trig_jump' },          // Star earned
    'hooray':    { trigger: 'trig_wave' },          // Generic celebration
};
```

### Translation Function

```javascript
// Adapter that receives Lottie-style calls
function playSegment(markerName) {
    const mapping = ANIMATION_MAPPING[markerName];
    if (!mapping) {
        console.warn(`Unknown marker: ${markerName}`);
        return;
    }

    // Fire trigger if defined
    if (mapping.trigger) {
        const input = stateMachine.find(i => i.name === mapping.trigger);
        input?.fire();
    }

    // Set boolean if defined
    if (mapping.boolean !== undefined) {
        const input = stateMachine.find(i => i.name === mapping.boolean);
        if (input) input.value = mapping.value;
    }
}
```

### Epic Marker Reference

| Lottie Marker | Frames | Rive Trigger | Notes |
|---------------|--------|--------------|-------|
| idle | 0-60 | (none) | Default state |
| wave | 61-120 | trig_wave | Greeting |
| jump | 121-180 | trig_jump | Excitement |
| giggle | 181-220 | trig_wave* | Tap response |
| feeding | 221-350 | trig_wave + isHappy | Reward |
| celebrate | Various | trig_jump | Star earned |

*Consider adding `trig_giggle` for distinct tap animation.

---

## Gotchas & Troubleshooting

### 1. Fonts Not Rendering

**Symptom:** Text in Rive animation doesn't appear.

**Cause:** Custom `assetLoader` intercepts ALL assets, including embedded fonts.

**Fix:** Explicitly decode and set fonts:
```javascript
if (asset.isFont && bytes.length > 0) {
    const font = await rive.decodeFont(bytes);
    asset.setFont(font);
    font.unref();
    return true;
}
```

### 2. Browser Cache Issues

**Symptoms:** Old animations playing, assets not updating.

**Fixes:**
- Hard refresh: `Cmd+Shift+R`
- Incognito window
- Clear site data in DevTools

### 3. Export vs Save in Rive Editor

**Symptom:** Changes in Rive Editor don't appear in browser.

**Cause:** "Save" syncs to Rive cloud, not local file.

**Fix:** Always use **File → Export** to update local `.riv` file.

### 4. View Model Binding Requires Runtime 2.33+

**Symptom:** `riveInstance.viewModelInstance` returns null.

**Fix:** Update CDN to `@rive-app/canvas@2.33.1` or later.

### 5. Tailless Buddy Errors

**Symptom:** Console warns about missing `tail` asset.

**Cause:** Some buddies (master-hamster, george, maddie) don't have tails.

**Fix:** Check buddy config before loading:
```javascript
const partsToLoad = BODY_PARTS.filter(part => {
    if (part === 'tail' && !buddy.hasTail) return false;
    return true;
});
```

### 6. Memory Leaks

**Symptom:** Memory usage grows over time, especially with buddy switching.

**Cause:** Not calling `unref()` on decoded assets, not calling `cleanup()` on instance.

**Fix:**
```javascript
// After setting assets
image.unref();
font.unref();

// On component destroy
riveInstance.cleanup();
```

---

## Performance Comparison

### What to Measure

| Metric | How to Measure |
|--------|----------------|
| Frame rate | `requestAnimationFrame` counter, Rive's FPS callback |
| Memory | DevTools Performance tab, `performance.memory` |
| Initial load | `performance.mark/measure` around initialization |
| Animation smoothness | Visual inspection, frame drops in DevTools |

### Expected Improvements

| Aspect | Lottie SVG | Rive Canvas |
|--------|------------|-------------|
| FPS (idle) | ~30-40 | 60 |
| FPS (animation) | ~20-30 | 60 |
| DOM nodes | 50-100+ | 1 (canvas) |
| GPU usage | None | Yes (WebGL available) |
| JS execution | Higher (DOM updates) | Lower (canvas draws) |

### Measurement Code

```javascript
// FPS Counter
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        console.log(`FPS: ${frames}`);
        frames = 0;
        lastTime = now;
    }
    requestAnimationFrame(measureFPS);
}
```

---

## Migration Checklist

### Rive File Setup
- [ ] Artboard size matches Epic (1000x1000)
- [ ] Artboard name matches JS config (`Reading Buddy`)
- [ ] All OOB assets named correctly (case-sensitive)
- [ ] State machine named `BuddyStateMachine`
- [ ] All triggers created: `trig_wave`, `trig_jump`, etc.
- [ ] Exported with "Use referenced assets" checked

### JavaScript Implementation
- [ ] Rive runtime loaded (CDN or bundled): `@rive-app/canvas@2.33.1+`
- [ ] `assetLoader` handles fonts explicitly
- [ ] `assetLoader` handles OOB images
- [ ] `.unref()` called on all decoded assets
- [ ] `.cleanup()` called on instance destruction
- [ ] Animation mapping configured

### Angular Integration
- [ ] Component created with proper lifecycle hooks
- [ ] Input bindings for buddyId and triggers
- [ ] OnDestroy cleanup implemented
- [ ] Feature flag configured for A/B test

### Testing
- [ ] All buddy variants load correctly
- [ ] Tailless buddies don't error
- [ ] All animations trigger correctly
- [ ] Memory stable over time
- [ ] FPS stays at 60 during animations

### Deployment
- [ ] `.riv` file deployed to CDN
- [ ] Feature flag rolled out to test group
- [ ] Metrics instrumented
- [ ] Rollback plan documented

---

## Related Documentation

- [Lottie Compatibility Layer](./lottie-compat/README.md) - How this demo adapts Epic's data format
- [Animation Mapping Reference](./lottie-compat/reference/animation-mapping.md) - Full marker-to-trigger mapping
- [CLAUDE.md](../CLAUDE.md) - Project-specific gotchas and patterns
