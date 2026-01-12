# Epic API Response Structures

## getBuddy Response

**Endpoint:** `WebReadingBuddy.getBuddy`

```json
{
  "success": 1,
  "result": {
    "id": 11966185,
    "userId": 284113,
    "name": "Jayden",
    "displayName": "Jayden",
    "buddyId": 15,
    "hatched": 1,
    "status": 0,
    "assets": {
      "baseUrl": "https://cdn-gcp-media-v2.getepic.com/buddies/Jayden/",
      "extension": ".svg",
      "version": 1,
      "bodyParts": ["armLeft", "armRight", "eyeLeft", "eyeRight", "head", "headBack", "legLeft", "legRight", "legSeparator", "torso", "eyeBlinkLeft", "eyeBlinkRight", "egg"]
    },
    "dialog": {
      "adventure": [
        ["Hi there, let's read!", "I found some books for you."],
        ["-1 more minutes to go.", "You can do it!"],
        ["We did it!", "Let's read again tomorrow!", "Great job!"]
      ],
      "celebration": [["We read -1 minutes!", "Pop to celebrate!"]],
      "hatch": [["Hello there!"]],
      "celebrationEgg": [[""]]
    },
    "equipped": [{
      "id": 17883836,
      "name": "glasses-superhero",
      "assetUrl": "https://cdn-gcp-media.getepic.com/buddy-celebration-masks/glasses-superhero.svg?v=2"
    }]
  }
}
```

### Dialog Structure

Each context is an array of phrase sets. Each phrase set is an array of variations:

```
dialog.adventure[0] = ["Hi there!", "Ready to read?"]  // First phrase set
dialog.adventure[1] = ["Keep going!", "You can do it!"]  // Second phrase set
```

The `-1` placeholder gets replaced with actual values (e.g., minutes remaining).

---

## getTasksForToday Response

**Endpoint:** `WebDailyStar.getTasksForToday`

```json
{
  "success": 1,
  "result": {
    "numberOfStars": 1,
    "dailyTasks": [
      {
        "taskId": 2,
        "taskType": 1,
        "userTaskId": null,
        "textMessage": "Read for 5 minutes",
        "completed": 0,
        "presented": 0
      },
      {
        "taskId": 3,
        "taskType": 2,
        "userTaskId": null,
        "textMessage": "Read for 20 minutes",
        "completed": 0,
        "presented": 0
      }
    ]
  }
}
```

### Fields

- `numberOfStars`: Current stars earned today (0-3)
- `dailyTasks[].completed`: 0 = not done, 1 = done
- `dailyTasks[].taskType`: 1, 2, 3 for the three daily goals
