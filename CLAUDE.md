# Electric Boogaloo - Claude Code Project Notes

## Project Overview

**Electric Boogaloo** is an AI-powered Bomberman game built as a GitHub Pages site. Four players compete in turn-based bomb-dropping action, with each player controlled by an LLM via Groq Cloud API.

## Tech Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (no build tools)
- **AI**: Dual API support - Groq Cloud or OpenAI (auto-detected by API key prefix)
  - Groq: `moonshotai/kimi-k2-instruct-0905` model
  - OpenAI: `gpt-4.1-mini` model
- **Hosting**: GitHub Pages (static site)
- **Storage**: localStorage for API keys and prompts

## Project Structure

```
bombervibe/
├── index.html              # Main game page
├── css/
│   └── style.css          # Cypherpunk Matrix theme
├── js/
│   ├── config/
│   │   └── blocks.js      # Block type definitions
│   ├── engine/            # Generic game engine (reusable)
│   │   ├── GameEngine.js  # Core turn-based game loop
│   │   ├── LLMAdapter.js  # Provider-agnostic LLM integration
│   │   ├── UIRenderer.js  # Abstract rendering interface
│   │   ├── StateManager.js    # Immutable state management
│   │   ├── ActionSystem.js    # Event sourcing
│   │   ├── ReplaySystem.js    # Game replay functionality
│   │   └── Serialization.js   # State serialization
│   ├── games/
│   │   └── bombervibe/    # Bombervibe game implementation
│   │       ├── config.js          # Game constants
│   │       ├── BombervibePlayer.js   # Player class
│   │       ├── BombervibePrompts.js  # Prompt management
│   │       ├── BombervibeGame.js     # Core game logic (IGame)
│   │       └── BombervibeRenderer.js # Rendering (IUIRenderer)
│   ├── entities/          # Entity classes
│   │   ├── player.js
│   │   ├── bomb.js
│   │   ├── item.js
│   │   └── explosion.js
│   ├── testing/           # Testing utilities
│   │   ├── mock-llm.js
│   │   └── seed-finder.js
│   ├── npc-characters.js  # NPC character definitions
│   ├── drag-drop.js       # Drag & drop functionality
│   ├── rng.js            # Seeded random number generator
│   └── ui-init.js        # UI initialization (replaces ui.js)
├── tests/
│   ├── .env                        # API keys
│   ├── test_gameplay.py            # Playwright gameplay test
│   ├── test_migration_baseline.py  # Legacy baseline tests
│   ├── test_bombervibe_simple.html # Component test
│   └── index-new.html              # Integration test
├── .venv/              # Python virtual environment
├── README.md           # User documentation
├── CLAUDE.md          # This file (development notes)
├── REFACTORING.md     # Refactoring progress
└── PROJECT_METRICS.md # Project statistics
```

## Game Features

### Implemented (Simplified Version)
- ✅ 13x11 grid with hard/soft blocks
- ✅ Emoji-based graphics (players as people: ⛷️🧑‍🌾🛒🧑‍🚀, blocks: 🌳🗿, bombs: 💣, explosions: 💥)
- ✅ 4 players, turn-based sequential play
- ✅ Move OR place bomb per turn
- ✅ One bomb per player at a time
- ✅ 3-second bomb timer, 2-tile explosion range
- ✅ Scoring: +10 blocks, +100 kills
- ✅ Manual controls for Player 1 (arrows + spacebar)
- ✅ Editable AI prompts (one per player)
- ✅ Cypherpunk visual theme

### Not Implemented (Future Enhancements)
- ❌ Power-ups (speed, bomb range, multiple bombs)
- ❌ Bomb throwing/kicking mechanics
- ❌ AI difficulty levels
- ❌ Sound effects
- ❌ Mobile controls
- ❌ Tournament/replay modes

## Development Workflow

### ⚠️ IMPORTANT: Git Operations

**HUMAN handles ALL git operations.** Claude does NOT push to remote repositories.

**Human is responsible for:**
- `git push` to remote
- Creating/managing branches
- GitHub Pages configuration
- GitHub repository settings
- SSH key management
- Authentication

**Claude can:**
- Stage files (`git add`)
- Create commits locally (`git commit`)
- Check status (`git status`, `git log`, `git diff`)
- Read git configuration

### GitHub Pages Setup (Human Task)

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to: `https://github.com/kristerhedfors/electric-boogaloo/settings/pages`
   - Source: Deploy from branch
   - Branch: `main`
   - Folder: `/ (root)`
   - Click "Save"

3. **Access site:**
   - URL: `https://kristerhedfors.github.io/electric-boogaloo/`
   - With API key: `https://kristerhedfors.github.io/electric-boogaloo/#gsk_your_key_here`
   - Wait 1-2 minutes for deployment

4. **Get API Key:**
   - **Groq Cloud** (recommended for speed):
     - Visit: `https://console.groq.com`
     - Sign up (free tier available)
     - Generate API key (starts with `gsk_...`)
   - **OpenAI** (alternative):
     - Visit: `https://platform.openai.com/api-keys`
     - Create API key (starts with `sk-...`)
   - The game auto-detects which API to use based on key prefix

### URL Fragment API Key Feature

The site supports passing your API key via URL fragment (hash):

```
https://kristerhedfors.github.io/electric-boogaloo/#gsk_your_api_key_here
```

**Benefits:**
- No need to manually enter API key each visit
- Shareable links (but keep your key private!)
- Bypasses modal prompt for faster game start
- Still saves to localStorage for subsequent visits

**Implementation:**
- On page load, checks `window.location.hash` for API key
- If fragment starts with `gsk_` or `sk-`, automatically sets it
- Falls back to localStorage if no fragment
- Falls back to modal prompt if neither exists

## API Integration

### Dual API Support

The game automatically detects which API to use based on your key prefix:

**Groq Cloud API** (key starts with `gsk_`):
```javascript
API Endpoint: https://api.groq.com/openai/v1/chat/completions
Tactical Model: moonshotai/kimi-k2-instruct-0905
Memory Model: moonshotai/kimi-k2-instruct-0905
Cost: Free tier available
Speed: Extremely fast (~100-300ms response time)
```

**OpenAI API** (key starts with `sk-`):
```javascript
API Endpoint: https://api.openai.com/v1/chat/completions
Tactical Model: gpt-4.1-mini
Memory Model: gpt-4.1-mini
Cost: ~$0.0001 per turn (very cheap)
Speed: ~200-500ms response time
```

**Two-Stage AI Architecture:**
1. **Tactical Call**: Makes immediate move decisions based on full game state
2. **Memory Update**: Runs asynchronously in background with compact prompt to update operational memory for next turn

This separation reduces prompt size for memory updates (~200 tokens vs 2000+) while maintaining full context for tactical decisions.

### LLM Input Format

Each turn, the AI receives:
1. **Game state**: ASCII grid with positions
2. **Player info**: Scores, bomb status, alive/dead
3. **Bomb info**: Locations, explosion timers
4. **Custom prompt**: User-defined strategy (editable in corners)

### Expected Output (Tactical Call)

```json
{
  "direction": "up" | "down" | "left" | "right",
  "dropBomb": true | false,
  "thought": "Tactical reasoning for this move (max 50 words)"
}
```

### Expected Output (Memory Update)

```json
{
  "memory": "Operational notes for next turn (max 50 words)"
}
```

Fallback: If LLM fails or returns invalid JSON, uses random valid move.

## Code Architecture

The codebase uses a **generic game engine architecture** that separates reusable engine components from game-specific implementations.

### Engine Framework (`js/engine/`)

**GameEngine.js** - Core turn-based game orchestration:
- Turn loop management (sequential/parallel AI)
- Game state updates
- Renderer coordination
- Event handling
- Implements IGame interface for game logic

**LLMAdapter.js** - Provider-agnostic LLM integration:
- Auto-detects Groq vs OpenAI based on API key
- Tactical + Memory two-stage architecture
- Player memory management
- Error handling with fallback to random moves

**UIRenderer.js** - Abstract rendering interface:
- IUIRenderer interface for custom renderers
- Game state visualization
- BaseUIRenderer helper class

**StateManager.js** - Immutable state management:
- GameState class for state snapshots
- Deep cloning for immutability

**ActionSystem.js** - Event sourcing:
- Action recording (move, bomb, explosion, etc.)
- State reconstruction from action log

**ReplaySystem.js** - Game replay functionality:
- Record full game history
- Playback at different speeds
- Export/import replay data

**Serialization.js** - State serialization:
- JSON export/import
- Compact binary format

### Bombervibe Game (`js/games/bombervibe/`)

**BombervibeGame.js** - Complete Bomberman implementation (IGame):
- Grid state management
- Bomb explosion logic with blast radius
- Collision detection
- Turn sequencing
- Win condition checking
- Loot system (power-ups)
- AI vision system (7x7 grid)
- Danger analysis (safe/lethal move detection)
- LLM prompt generation

**BombervibePlayer.js** - Player entity:
- Position tracking
- Movement validation
- Bomb carrying/placement
- Score management
- Power-ups (speed, bomb range, extra bombs)

**BombervibePrompts.js** - LLM prompt management:
- System prompt with game rules
- Per-player custom strategies
- Tactical response format (JSON schema)
- Memory update format
- Prompt history tracking

**BombervibeRenderer.js** - Visual rendering (IUIRenderer):
- Grid rendering (terrain, explosions, loot)
- Player entity rendering with CSS transitions
- Bomb indicators and timers
- Floating thought bubbles
- Score display
- NPC customization

**config.js** - Game constants:
- Grid dimensions
- Bomb timers
- Scoring rules
- Loot probabilities
- AI vision radius

### UI Layer

**ui-init.js** - Initialization and event handling:
- Creates engine/game/renderer instances
- Sets up button event listeners
- Keyboard controls (Player 1 manual mode)
- API key management
- Game controls (start/pause/reset)
- Prompt editors

### Game Flow

```
1. Page loads (DOMContentLoaded):
   - ui-init.js creates instances:
     * BombervibePrompts (prompt management)
     * BombervibeGame (game logic)
     * LLMAdapter (AI integration)
     * BombervibeRenderer (rendering)
     * GameEngine (orchestration)
   - Engine initializes with config (turnDelay, autoPlay, parallelAI)
   - Sets up event listeners

2. User enters API key → LLMAdapter detects provider

3. User clicks START:
   - engine.start() begins game loop
   - Records initial state for replay

4. Each turn (GameEngine.executeTurn):
   - Get current game state
   - If parallelAI: Execute all alive players in parallel
   - Else: Execute players sequentially
     * Get current player
     * If manual mode: Handle keyboard input
     * Else: LLMAdapter.getTacticalMove()
       - Generate prompt with game state
       - Call Groq/OpenAI API
       - Parse JSON response
       - Fallback to random if invalid
     * game.processMove() executes action
   - game.nextTurn() advances game state
   - renderer.render() updates UI
   - Check game over condition

5. Game over → renderer.showGameOver(winner)
```

## Customization Guide

### 🎨 Customize Block Appearance

**See [BLOCK_CUSTOMIZATION.md](BLOCK_CUSTOMIZATION.md) for complete guide!**

Quick change soft block (brick) colors in `css/style.css`:
```css
:root {
    --soft-brick-color: #888;    /* Main brick color */
    --soft-mortar-color: #aaa;   /* Mortar/grout color */
}
```

The game now uses a centralized block configuration system:
- **All block types** defined in `js/config/blocks.js`
- **All colors** use CSS variables for easy theming
- **Helper functions** for querying block properties
- **No more magic numbers** - use `BLOCK_TYPES.SOFT.id` instead of `1`

### Change Turn Speed

In `js/ui-init.js` (line 69):
```javascript
engine.initialize({
    turnDelay: 1000,  // Milliseconds (default: 1 second)
    autoPlay: true,
    parallelAI: true
});
```

### Modify Grid Size

In `js/games/bombervibe/config.js`:
```javascript
GRID_WIDTH: 13,  // Default: 13
GRID_HEIGHT: 11  // Default: 11
```

### Adjust Bomb Settings

In `js/games/bombervibe/config.js`:
```javascript
BOMB_ROUNDS_UNTIL_EXPLODE: 4,  // Rounds until explosion
BOMB_RANGE: 2                   // Explosion range (tiles)
```

### Change Player Colors

In `css/style.css`:
```css
:root {
    --cyan: #00ffff;      /* Player 1 */
    --magenta: #ff00ff;   /* Player 2 */
    --yellow: #ffff00;    /* Player 3 */
    --green: #00ff00;     /* Player 4 */
}
```

### Use Different AI Model

Models are automatically selected based on your API key:

**Groq Cloud** (`gsk_` keys):
- Default: `moonshotai/kimi-k2-instruct-0905`
- See [Groq Models](https://console.groq.com/docs/models) for alternatives

**OpenAI** (`sk-` keys):
- Default: `gpt-4.1-mini`
- Alternatives: `gpt-4o-mini`, `gpt-4o`, etc.
- See [OpenAI Models](https://platform.openai.com/docs/models)

To change models, edit `setApiKey()` in [js/engine/LLMAdapter.js:177-203](js/engine/LLMAdapter.js#L177-L203).

## Testing

### ⚠️ CRITICAL: Test Documentation Protocol

**ALWAYS maintain complete documentation of working UI identifiers and interaction patterns when building tests.**

**⚠️ ALWAYS implement turn/round caps in tests!** Games can run indefinitely - tests MUST have hard limits (typically 10-15 rounds max) to prevent runaway execution.

This section MUST be updated whenever:
- New tests are created
- UI elements are identified
- Interaction patterns are discovered
- Element selectors change

### UI Element Reference (for Playwright Tests)

**Game Container & Grid:**
- Game container: `div#gameContainer`
- Game grid: `div#grid` (where cells are rendered)
- Grid container: `div#gridContainer`
- Game info panel: `div#gameInfo`

**Buttons:**
- Start button: `button#startGame` (must be clicked to start game)
- Pause button: `button#pauseGame`
- Reset button: `button#resetGame`
- Located in `.info-right` area

**Game State Access:**
- Game Instance: `window.game` (BombervibeGame)
- Engine Instance: `window.engine` (GameEngine)
- LLM Adapter: `window.llm` (LLMAdapter)
- Renderer: `window.renderer` (BombervibeRenderer)
- Legacy alias: `window.ai` → `window.llm`
- Game State: `window.game.getGameState()`

**Game Over Detection (CRITICAL for tests):**
- **DOM element**: `div#gameOverOverlay` (appears when game ends)
- **Detection method**: `page.locator('#gameOverOverlay').count() > 0`
- ⚠️ Console logs showing "GAME OVER" are NOT available until browser closes
- ⚠️ ALWAYS check DOM for game over, not console logs during test execution

**Console Log Patterns:**
- Round start: `[ROUND N] START - Players: X alive, Bombs: Y active`
- Player moves: `[ROUND N] PX: DIRECTION (x,y)->(x,y) OK|BLOCKED`
- Bomb placement: `[ROUND N] PX: DIRECTION +BOMB (x,y)->(x,y)`
- Explosions: `[ROUND N] EXPLOSIONS: N bomb(s) detonated`
- AI decisions: `[AI PX] Move: direction, dropBomb: true|false`
- AI thoughts: `[AI PX] Thought: "..."`

**Test Interaction Sequence:**
1. Navigate to `file:///path/to/index.html#API_KEY`
2. Wait for `div#grid` to be visible (game UI loaded)
3. Wait 2 seconds for AI controller to load
4. Click `button#startGame` to start game
5. Monitor console logs for game progression

**Additional Selectors:**
- Turn counter: `span#turnCounter`
- Current player: `span#currentPlayer`
- Scores: `span#score1`, `span#score2`, `span#score3`, `span#score4`
- Player prompts: `textarea#prompt1`, `textarea#prompt2`, `textarea#prompt3`, `textarea#prompt4`

### Manual Testing
1. Open `index.html` in browser (file:// URL works fine - no web server needed)
2. Enter API key (Groq or OpenAI) OR use URL fragment: `index.html#gsk_your_key`
3. Click START button
4. Use DevTools console for debugging
5. Console will show which API/model is detected

### Automated Testing with Playwright

**IMPORTANT**: No web server needed! Playwright opens index.html directly via file:// URL.

**Setup:**
```bash
# API keys stored in tests/.env
cd tests
echo "GROQ_API_KEY=gsk_your_key_here" > .env
# or
echo "OPENAI_API_KEY=sk_your_key_here" > .env
```

**Run tests:**
```bash
# Activate virtual environment with Playwright
source .venv/bin/activate

# Run gameplay validation test
python tests/test_gameplay.py
```

**Test validates:**
- ✅ Game initializes correctly
- ✅ AI players make valid moves
- ✅ Bombs explode at correct timing
- ✅ Players die when hit by explosions
- ✅ Game completes with a winner
- ✅ Console logs show proper game flow

**Focused console logging:**
The game now logs only essential gameplay info:
- `[ROUND X] START` - Round begins with player/bomb counts
- `[ROUND X] P1: UP (0,0)->(0,1) OK` - Player move with coordinates
- `[ROUND X] EXPLOSIONS: 2 bomb(s) detonated` - Bomb events
- No verbose debugging logs during normal gameplay

### Common Issues

**API Not Working:**
- Check API key is valid (starts with `gsk_` or `sk-`)
- Check browser console for API detection message
- Verify network tab shows API calls to correct endpoint
- For Groq: Ensure model is available in your region

**AI Makes Invalid Moves:**
- Normal behavior - fallback to random move
- Try more specific prompts
- Check model supports JSON output

**Bombs Not Exploding:**
- Check game is not paused
- Verify `updateBombs()` is being called in game loop
- Check browser console for errors

## Future Enhancements

### Phase 2 Features
- [ ] Power-ups (random spawns after block destruction)
- [ ] Multiple bombs per player
- [ ] Bomb throwing/kicking
- [ ] Speed modifications
- [ ] Explosion range modifiers

### Phase 3 Features
- [ ] Sound effects (explosions, movement)
- [ ] Background music
- [ ] Mobile touch controls
- [ ] Responsive design
- [ ] Settings menu

### Phase 4 Features
- [ ] Tournament mode (best of N games)
- [ ] Replay system
- [ ] AI training/evolution
- [ ] Leaderboard
- [ ] Match statistics

## License

MIT License - Free to use and modify

---

**Repository**: https://github.com/kristerhedfors/bombervibe
**Live Site**: https://kristerhedfors.github.io/electric-boogaloo/ (after Human enables GitHub Pages)
**Created**: October 2025
**Built with**: Claude Code
