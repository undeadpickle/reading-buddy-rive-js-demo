# Phase 3: Wiring Everything Together

## Phase 3A: Wire Gamification Buttons

**Modify:** `js/ui-controls.js`

Wire button handlers:

```javascript
// Earn Star button
document.getElementById('earnStar').addEventListener('click', () => {
  const newCount = dataAdapter.earnStar();
  updateStars(newCount, 3);
  dataAdapter.playSegment('celebrate');  // Fires trig_jump
});

// Reset button
document.getElementById('resetStars').addEventListener('click', () => {
  dataAdapter.resetStars();
  updateStars(0, 3);
});
```

**Test:** Click "Earn Star" → star fills + buddy jumps

**Commit:** `Phase 3A: Wire gamification buttons`

---

## Phase 3B: Wire Dialogue System

**Modify:** `js/ui-controls.js`

Replace hardcoded dropdown with API data:

```javascript
function populateDialoguePresets() {
  const select = document.getElementById('dialoguePresets');
  const phrases = dataAdapter.getAllDialogues('adventure');

  // Clear existing options (keep first placeholder)
  while (select.options.length > 1) select.remove(1);

  // Add API phrases
  phrases.forEach(phrase => {
    const option = document.createElement('option');
    option.value = phrase;
    option.textContent = phrase;
    select.appendChild(option);
  });
}
```

**Test:** Dropdown shows dialogue from buddy.json

**Commit:** `Phase 3B: Wire dialogue to data adapter`

---

## Phase 3C: Canvas Tap Response

**Modify:** `js/ui-controls.js`

Add click handler on canvas:

```javascript
document.getElementById('riveCanvas').addEventListener('click', () => {
  // Play giggle animation (maps to trig_wave)
  dataAdapter.playSegment('giggle');

  // Show random tap dialogue
  const dialogue = dataAdapter.getDialogue('adventure');
  setDialogueText(dialogue);
  fireTrigger('trig_showBubble');
});
```

**Test:** Click canvas → wave animation + speech bubble with dialogue

**Commit:** `Phase 3C: Add canvas tap response`
