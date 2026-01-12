# Phase 4: Integration Documentation

## What to Document

**Create:** `docs/lottie-compat-layer.md` (final integration guide)

### Sections

1. **Architecture Overview**
   - Data flow diagram
   - Module responsibilities

2. **API Reference**
   - `loadBuddyData()` - Load buddy from mock/real API
   - `getDialogue(context)` - Get context-aware dialogue
   - `playSegment(markerName)` - Trigger animation by Lottie marker name
   - `earnStar()` / `resetStars()` / `getStarProgress()` - Gamification

3. **Animation Mapping Reference**
   - Full table of Lottie markers → Rive triggers
   - How to add new mappings

4. **Switching to Real API**
   - Change fetch URL from `./public/api/buddy.json` to Epic's endpoint
   - Auth headers needed
   - Response structure is identical

5. **Rive Editor Enhancements**
   - Optional triggers to add for richer animations
   - Current mappings reuse existing triggers (wave, jump)

### Commit

`Phase 4: Add integration documentation`
