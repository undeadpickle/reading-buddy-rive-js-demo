# Reading Buddy Rive Demo

Interactive animated character demo using [Rive](https://rive.app) with dynamic OOB (out-of-band) asset swapping. Switch between 11 different "reading buddy" character variants in real-time while maintaining smooth animations.

## Features

- **11 Character Variants**: catdog-orange, catdog-blue, catdog-green, catdog-purple, catdog-white, kitten-ninja, master-hamster, barloc, george, maddie, scout
- **Dynamic Asset Swapping**: 11-12 body parts per character loaded via OOB asset system
- **Interactive Speech Bubbles**: Click-to-show/hide speech bubbles with smart text updating and state tracking
- **Dialogue Text System**: Dynamic text display using Rive's View Model data binding with custom input
- **State-Driven Behaviors**: Boolean inputs (isHappy, isReading, isBubbleVisible) and number input (energyLevel) for interactive character states
- **Trigger Animations**: Wave, jump, and speech bubble animations with smooth transitions back to idle
- **Auto-Blink System**: Characters blink naturally without manual triggering
- **Snowfall Particles Demo**: Full-viewport Lua-scripted particle system with runtime-adjustable parameters
- **Project Switcher**: Navigate between demo pages via header dropdown
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
├── index.html              # Reading Buddy demo
├── snowfall.html           # Snowfall Particles demo
├── css/
│   ├── styles.css          # Main demo styling
│   └── snowfall.css        # Snowfall demo styling
├── js/
│   ├── config.js           # Central configuration
│   ├── asset-loader.js     # OOB asset preloading and caching
│   ├── rive-controller.js  # Rive instance management
│   ├── scene-controller.js # Scene switching logic
│   ├── ui-controls.js      # DOM event handlers
│   ├── data-adapter.js     # Epic API compatibility
│   ├── gamification-ui.js  # Star counter UI
│   ├── bottom-sheet.js     # Mobile bottom sheet
│   ├── header.js           # Project switcher dropdown
│   ├── projects.js         # Multi-project registry
│   ├── logger.js           # Centralized logging
│   ├── snowfall-controller.js  # Snowfall Rive controller
│   ├── snowfall-main.js    # Snowfall entry point
│   ├── utils.js            # Shared utilities
│   └── main.js             # Reading Buddy entry point
└── public/
    ├── rive/               # Rive animation files
    └── reading-buddies/    # Character PNG assets (11 variants)
```

## How It Works

1. **Preload**: Character PNGs (11-12 parts per active variant) are loaded into memory at startup
2. **Initialize**: Rive runtime starts with the default buddy, intercepting OOB asset requests
3. **Switch**: Selecting a new buddy cleans up the old instance and reinitializes with cached assets

The OOB asset pattern allows the same Rive file to display different character skins without re-exporting.

## Tech Stack

- **Rive Runtime**: `@rive-app/canvas@2.33.1` for character animation, `@rive-app/webgl@2.34.1` for particles (via CDN)
- **Frontend**: Vanilla JavaScript (ES Modules)
- **Server**: Any static file server (Python, Node, etc.)

## Development

For Claude Code users, see [CLAUDE.md](CLAUDE.md) for detailed development guidance including:
- Rive MCP connection setup
- Troubleshooting guide
- Architecture details

## License

MIT
