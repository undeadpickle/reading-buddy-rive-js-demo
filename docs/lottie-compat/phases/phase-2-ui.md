# Phase 2: Gamification UI

## Phase 2A: Star Counter UI (HTML/CSS only)

**Modify:** `index.html`

Add inside `.preview-panel`, above `.canvas-wrapper`:

```html
<div class="star-progress" id="starProgress">
  <span class="star" data-star="1"></span>
  <span class="star" data-star="2"></span>
  <span class="star" data-star="3"></span>
</div>
```

**Modify:** `css/styles.css`

```css
.star-progress {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px;
}

.star {
  width: 32px;
  height: 32px;
  font-size: 28px;
  transition: transform 0.3s ease;
}

.star::before {
  content: '☆';
  color: #ccc;
}

.star.filled::before {
  content: '★';
  color: #ffc107;
}

.star.earning {
  animation: star-pop 0.5s ease;
}

@keyframes star-pop {
  50% { transform: scale(1.4); }
}
```

**Test:** Stars visible above canvas

**Commit:** `Phase 2A: Add star counter UI markup`

---

## Phase 2B: Gamification Controls

**Modify:** `index.html`

Add new section after "Simulate Events":

```html
<section class="control-section">
  <h2>Gamification</h2>
  <div class="button-group">
    <button id="earnStar">Earn Star</button>
    <button id="resetStars">Reset</button>
  </div>
</section>
```

**Create:** `js/gamification-ui.js`

```javascript
// Initialize star display
export function initGamificationUI() { ... }

// Update star visual state
export function updateStars(earned, max = 3) { ... }

// Animate single star earning
export function animateStarEarn(starIndex) { ... }
```

**Test:** Call `updateStars(2, 3)` from console - first 2 stars should fill

**Commit:** `Phase 2B: Add gamification controls and UI module`
