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
electric-boogaloo/
├── index.html           # Main game page
├── css/
│   └── style.css       # Cypherpunk Matrix theme
├── js/
│   ├── player.js       # Player class
│   ├── game.js         # Core game logic
│   ├── ai.js           # Groq API integration
│   └── ui.js           # Game loop & rendering
├── README.md           # User documentation
└── CLAUDE.md          # This file (development notes)
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

### Key Classes

**Player** (`js/player.js`):
- Position tracking
- Movement validation
- Bomb placement logic
- Score management

**Game** (`js/game.js`):
- Grid state management
- Bomb explosion logic
- Collision detection
- Turn sequencing
- Win condition checking

**AIController** (`js/ai.js`):
- Groq API communication
- Game state serialization
- Prompt management
- localStorage persistence

**UI** (`js/ui.js`):
- Game loop (requestAnimationFrame)
- Grid rendering
- Event handling
- Manual keyboard controls

### Game Flow

```
1. Page loads → Initialize game
2. User enters API key → Store in localStorage
3. User clicks START → Begin game loop
4. Each turn:
   - Get current player
   - If Player 1 & manual input: Handle keyboard
   - Else: Call AI for move
   - Execute move
   - Update bombs (check timers)
   - Check explosions
   - Render grid
   - Next player turn
5. Game over → Show winner
```

## Customization Guide

### Change Turn Speed

In `js/ui.js`:
```javascript
this.turnDelay = 1000; // Milliseconds (default: 1 second)
```

### Modify Grid Size

In `js/game.js`:
```javascript
this.GRID_WIDTH = 13;  // Default: 13
this.GRID_HEIGHT = 11; // Default: 11
```

### Adjust Bomb Settings

In `js/player.js`:
```javascript
timer: 3000,  // 3 seconds
range: 2      // 2 tiles
```

### Change Colors

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

To change models, edit `setApiKey()` in [js/ai.js:178-204](js/ai.js#L178-L204).

## Testing

### Local Testing
1. Open `index.html` in browser
2. Enter API key (Groq or OpenAI)
3. Click START
4. Use DevTools console for debugging
5. Console will show which API/model is detected

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
