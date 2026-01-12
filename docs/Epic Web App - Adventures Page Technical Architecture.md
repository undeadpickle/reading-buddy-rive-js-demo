## Epic Page - Complete Technical Architecture

### Tech Stack

| Layer             | Technology                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| **Framework**     | Angular (with Zone.js)                                                   |
| **Animation**     | lottie-web (SVG renderer mode)                                           |
| **Layout**        | @angular/flex-layout                                                     |
| **UI Components** | Angular Material (mat-dialog, buttons, tooltips)                         |
| **State**         | Component-level services (no NgRx)                                       |
| **Styling**       | SCSS with Mikado & Roboto fonts                                          |
| **API**           | REST (PHP backend at `api-web.getepic.com`)                              |
| **CDN**           | Cloudflare (`cdn-gcp-media.getepic.com`, `cdn-gcp-media-v2.getepic.com`) |
| **Payments**      | Stripe.js                                                                |
| **Feature Flags** | Flagsmith                                                                |

---

### Lottie Architecture

**Main Files:**

- `/assets/app/animations/reading-buddy/buddySkeleton.json` — The master skeleton (4000 frames @ 29.97fps)
- `/assets/app/animations/reading-habit/reading-habit-timer.json` — Timer animation
- `/assets/app/animations/nav-icons/*.json` — Nav icon hover states

**How Assets Are Injected:**

The `buddySkeleton.json` defines **placeholder assets** with empty paths:

```json
{
  "id": "head",
  "w": 1000,
  "h": 1000,
  "u": "",
  "p": "", // ← Empty path, injected at runtime
  "e": 1
}
```

At runtime, the Angular component:

1. Fetches buddy data from `WebReadingBuddy.getBuddy` API
2. Gets asset URLs from the response: `assets.baseUrl` + `bodyParts[]` + `assets.extension`
3. Injects these URLs into the Lottie SVG via `xlink:href` on `<image>` elements

**Body Parts Loaded (for Jayden buddy):**

- `armLeft.svg`, `armRight.svg`
- `eyeLeft.svg`, `eyeRight.svg`, `eyeBlinkLeft.svg`, `eyeBlinkRight.svg`
- `head.svg`, `headBack.svg`
- `legLeft.svg`, `legRight.svg`, `legSeparator.svg`
- `torso.svg`
- `egg.svg` (for unhatched state)

---

### Animation Control via Markers

The skeleton has **66 named markers** that define animation segments. The Angular component uses `playSegments([startFrame, endFrame])` to trigger states:

| Marker Name                        | Start Frame | Use Case                         |
| ---------------------------------- | ----------- | -------------------------------- |
| `idleEgg`                          | 0           | Unhatched egg idle               |
| `egg_hatch_tap1/2`                 | 161/181     | Tap interactions during hatching |
| `hatching`                         | 201         | Hatch animation                  |
| `idle`                             | 245         | Default character state          |
| `feeding`                          | 570         | Food reward animation            |
| `happy`                            | 747         | Post-reward celebration          |
| `readingCelebrationIntro/Loop/Pop` | 968+        | Daily goal completion            |
| `holeBuddyIn`                      | 2097        | Mystery chest peek animation     |
| `hooray`                           | 2727        | Generic celebration              |
| `yippee`                           | 2789        | Another celebration variant      |
| `giggle`                           | 3685        | Tap response                     |

**Events Bound (via Zone.js):**

- `animationCreated` — When Lottie instance ready
- `complete` — When segment finishes
- `segmentStart` — For chaining animations

---

### Key Angular Components

```
epic-adventures
├── epic-reading-buddy-interactive
│   ├── epic-reading-buddy-speech-bubble
│   └── reading-buddy-avatar
│       └── s1-lottie (custom Lottie wrapper)
├── epic-reading-habit-timer
│   └── s1-lottie
├── epic-adventure-action-card (Mystery Chest, Buddy Gear, etc.)
├── epic-badge-row
├── epic-spotlight-word-game-selection-row
└── epic-word-journal-row
```

**`s1-lottie` Component:**

- Custom wrapper around `lottie-web`
- Uses SVG renderer (not canvas)
- Exposes events: `animationCreated`, `complete`, `segmentStart`
- Handles dynamic asset injection

---

### API Data Flow

**Page Load Sequence:**

1. `WebReadingBuddy.isLive` — Check if feature enabled
2. `WebReadingBuddy.getBuddy` — Get current buddy + assets + dialog strings + equipped accessories
3. `WebDailyStar.getTasksForToday` — Get daily reading goals & star progress
4. `WebReadingBuddy.getAllBuddies` — Load buddy roster (includes `rewardProgress` for mystery chest)
5. `WebReadingBuddy.getAllAccessories` — Load gear inventory
6. `WebWordJournal.getWordCollection` — Load collected vocabulary
7. `WebAchievement.getUserAchievementsLibrary` — Load badge data

**Key API Response - getBuddy:**

```json
{
  "name": "Jayden",
  "assets": {
    "baseUrl": "https://cdn-gcp-media-v2.getepic.com/buddies/Jayden/",
    "extension": ".svg",
    "bodyParts": ["armLeft", "armRight", "eyeLeft", ...]
  },
  "dialog": {
    "adventure": [["Hi there, let's read!"], ...],
    "celebration": [["We read -1 minutes.\n Pop to celebrate!"]],
    "hatch": [["Hello there!"]]
  },
  "equipped": [
    { "name": "glasses-superhero", "assetUrl": "https://..." }
  ]
}
```

**Dialog Strings:**

- Stored in API, **not hardcoded**
- Template variables like `-1` get replaced with actual values
- Different arrays for different states (adventure, celebration, hatch)

---

### Mystery Chest System

**Progress tracked via:**

```json
"rewardProgress": {
  "variable_reward": {
    "title": "What's Inside?",
    "subtitle": "Earn 3 stars to open your Mystery Chest.",
    "image": "https://cdn-gcp-media-v2.getepic.com/variable_reward/Chest_Close.png",
    "state": 1,
    "curProgress": 1,
    "maxProgress": 3
  }
}
```

**Stars earned via `WebDailyStar.getTasksForToday`:**

```json
{
  "numberOfStars": 1,
  "dailyTasks": [
    { "taskId": 2, "textMessage": "Read for 5 minutes", "completed": 0 },
    { "taskId": 3, "textMessage": "Read for 20 minutes", "completed": 0 }
  ]
}
```

The overlay dialog is an Angular Material `mat-dialog` with the buddy using the `holeBuddyIn` → `holeLookingUpIdle` marker sequence to peek from behind the chest.

---

### What's NOT in the Lottie

| Element                | How It's Handled                                                 |
| ---------------------- | ---------------------------------------------------------------- |
| **Speech bubble text** | Separate HTML component (`epic-reading-buddy-speech-bubble`)     |
| **Accessory overlays** | Separate SVG images composed on top                              |
| **Star progress**      | HTML/CSS elements                                                |
| **Audio**              | **Not currently implemented** — no audio files or triggers found |
| **Mystery chest**      | Static PNG image, not Lottie                                     |

---

### Key Insights for Your Work

1. **Extensible marker system** — Adding new animations means adding markers to the skeleton JSON, then calling `playSegments()` from Angular

2. **Headless body parts** — Any character can use the skeleton; just swap the asset URLs. This is how they support 17+ different buddies with one animation file

3. **Dialog is data-driven** — All speech bubble text comes from the API, enabling A/B testing and localization without code changes

4. **No audio integration yet** — The Lottie events could easily trigger audio via the `segmentStart` callback, but it's not implemented

5. **Mystery chest is static** — It's just a PNG with HTML overlays. The buddy "peeking" uses the `holeBuddyIn` animation segment

6. **Accessibility gap** — The Lottie content doesn't expose to the a11y tree. Screen readers only see the "Continue" button in the modal
