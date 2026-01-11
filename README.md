# Reading Buddy Rive Demo

Interactive animated character demo using [Rive](https://rive.app) with dynamic OOB (out-of-band) asset swapping. Switch between 11 different "reading buddy" character variants in real-time while maintaining smooth animations.

## Features

- **11 Character Variants**: catdog-orange, catdog-blue, catdog-green, catdog-purple, catdog-white, kitten-ninja, master-hamster, barloc, george, maddie, scout
- **Dynamic Asset Swapping**: 11-12 body parts per character loaded via OOB asset system
- **Speech Bubble System**: Dynamic text display using Rive's text run API with sample dialogues and custom input
- **State-Driven Behaviors**: Boolean inputs (isHappy, isReading) and number input (energyLevel) for interactive character states
- **Trigger Animations**: Wave and jump animations with smooth transitions back to idle
- **Auto-Blink System**: Characters blink naturally without manual triggering
- **Zero Build Process**: Vanilla JavaScript with ES modules - just serve and run

## Quick Start

```bash
# Clone the repo
git clone https://github.com/undeadpickle/reading-buddy-rive-js-demo.git
cd reading-buddy-rive-js-demo

# Start a local server (Python 3)
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## Project Structure

```
├── index.html              # Main page
├── css/styles.css          # Styling
├── js/
│   ├── config.js           # Central configuration
│   ├── asset-loader.js     # OOB asset preloading and caching
│   ├── rive-controller.js  # Rive instance management
│   ├── ui-controls.js      # DOM event handlers
│   └── main.js             # Entry point
└── public/
    ├── rive/reading-buddy.riv    # Rive animation file
    └── reading-buddies/          # Character PNG assets
        ├── catdog-orange/
        ├── catdog-blue/
        └── ... (11 variants)
```

## How It Works

1. **Preload**: All 152 character PNGs (11-12 parts x 11 variants + extras) are loaded into memory at startup
2. **Initialize**: Rive runtime starts with the default buddy, intercepting OOB asset requests
3. **Switch**: Selecting a new buddy cleans up the old instance and reinitializes with cached assets

The OOB asset pattern allows the same Rive file to display different character skins without re-exporting.

## Tech Stack

- **Rive Runtime**: `@rive-app/canvas@2.33.1` (via CDN)
- **Frontend**: Vanilla JavaScript (ES Modules)
- **Server**: Any static file server (Python, Node, etc.)

## Development

For Claude Code users, see [CLAUDE.md](CLAUDE.md) for detailed development guidance including:
- Rive MCP connection setup
- Troubleshooting guide
- Architecture details

## License

MIT
