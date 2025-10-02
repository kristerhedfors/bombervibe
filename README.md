# 💣 Electric Boogaloo

An AI-powered Bomberman game where players are controlled by LLMs through OpenAI API. Classic Bomberman gameplay meets modern AI - watch as GPT-4.1-mini agents compete in strategic bomb-dropping battles!

## 🎮 Features

- **AI-Powered Gameplay**: 4 core players + up to 6 Battle Royale NPCs controlled by OpenAI's `gpt-4.1-mini` model
- **Customizable Strategies**: Edit each player's AI prompt to change their behavior
- **Battle Royale NPCs**: Drag and drop unique NPC characters with pre-programmed personalities (Berserker, Camper, Hunter, Trickster, Guardian, Chaos)
- **Manual Override**: Control Player 1 with keyboard (Arrow keys + Spacebar for bombs)
- **Classic Mechanics**: 13x11 grid, bombs with 1-tile range, destructible blocks
- **Turn-Based Strategy**: Sequential turns with 10-turn bomb timers
- **Structured Output**: JSON schema-based AI responses for reliable gameplay
- **Memory System**: AI players remember their previous thoughts and strategies
- **Danger Analysis**: Real-time safety calculations and lethal position warnings
- **Chess Notation Grid**: A-M columns, 1-11 rows for precise positioning
- **Cypherpunk Aesthetic**: Matrix-style terminal visuals with glowing effects
- **Pure Frontend**: No backend required - runs entirely in the browser
- **URL Fragment API Key**: Pass your OpenAI API key in the URL hash for instant access
- **System Prompt Editor**: Customize the core game rules sent to all AI players
- **Demo Video**: Watch AI gameplay before starting

## 🚀 Quick Start

### Play Online

**Option 1: URL Fragment (Recommended)**

Visit with your API key in the URL fragment:
```
https://kristerhedfors.github.io/bombervibe/#sk_your_api_key_here
```

This automatically loads your API key and skips the modal prompt!

**Option 2: Manual Entry**

Visit: **[https://kristerhedfors.github.io/bombervibe](https://kristerhedfors.github.io/bombervibe)**

Then enter your API key when prompted.

### Setup GitHub Pages

1. **Fork or clone this repository**

```bash
git clone https://github.com/kristerhedfors/bombervibe.git
cd bombervibe
```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select branch: `main` (or `master`)
   - Select folder: `/ (root)`
   - Click Save

3. **Get OpenAI API Key**
   - Visit [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Sign up for account (free tier may be available)
   - Generate API key
   - Copy your key (starts with `sk-...`)

4. **Play!**

   **Method A (URL Fragment):**
   ```
   https://yourusername.github.io/bombervibe/#sk_your_api_key_here
   ```

   **Method B (Manual):**
   - Visit your GitHub Pages URL
   - Enter your OpenAI API key when prompted
   - Click START to begin

## 🎯 How to Play

### Game Rules

- **4-10 Players**: 4 core players + up to 6 Battle Royale NPCs
- **Turn-based**: Players take sequential turns (P1→P2→P3→P4→NPCs)
- **Actions per turn**: Move (up/down/left/right) AND optionally drop bomb
- **Bombs**: Explode after **10 turns** with **1-tile range** in 4 directions
- **Movement**: Players can walk through soft blocks and bombs
- **One bomb limit**: Can't place another bomb until first explodes
- **Scoring**:
  - Destroy soft block: +10 points
  - Eliminate player: +100 points
- **Win condition**: Last player alive or highest score

### Visual Elements

- **Player 1** ⛷️ Skier (Cyan)
- **Player 2** 🧑‍🌾 Farmer (Magenta)
- **Player 3** 🛒 Shopper (Yellow)
- **Player 4** 🧑‍🚀 Astronaut (Green)
- **Battle Royale NPCs**:
  - 🔥 **Berserker** (Orange) - AGGRESSIVE rush tactics
  - 🏕️ **Camper** (Purple) - DEFENSIVE corner camping
  - 🎯 **Hunter** (Red) - STALKER target elimination
  - 🎭 **Trickster** (Pink) - DECEPTIVE feint tactics
  - 🛡️ **Guardian** (Teal) - PROTECTIVE territorial patrol
  - 💥 **Chaos** (Lime) - RANDOM mayhem
- **Soft Blocks** 🌳 Trees (destructible)
- **Hard Blocks** 🗿 Stones (indestructible)
- **Bombs** 💣 Classic bomb
- **Explosions** 💥 Boom!

### Controls

**Player 1 (⛷️ Skier) Manual Override:**
- Arrow Keys: Move
- Spacebar or B: Place bomb

**All Players (including P1 if no manual input):**
- AI-controlled via OpenAI API
- Customize strategy in corner text boxes

### Battle Royale Mode

Drag and drop NPC characters from the palette onto the game board:

1. **Before game starts**: Set up your initial Battle Royale configuration
2. **During gameplay**: Air-drop NPCs into the chaos mid-game!
3. **Strategic spawning**: Place NPCs on empty cells or soft blocks

Each NPC has unique AI behavior and can be spawned only once per game.

### Customizing AI Behavior

Each corner has an editable prompt for that player's AI strategy:

**Example Strategies:**

- **Aggressive**: "Chase opponents relentlessly. Drop bombs and move away immediately. Trap enemies in corners."
- **Defensive**: "Avoid danger. Clear blocks slowly. Always keep escape routes open. Only engage when safe."
- **Territorial**: "Control the center. Drop bombs and walk through them to safety. Dominate key areas."
- **Opportunistic**: "Wait for enemies to fight. Strike when they're vulnerable. Use your escape mobility wisely."

**Pro Tip**: Since you can walk through bombs and soft blocks, drop a bomb then immediately move away to safety!

Edit prompts in the corner text boxes and they'll save automatically to localStorage.

### System Prompt Editor

Click "SYSTEM PROMPT" to edit the core game rules and instructions sent to **all** AI players:
- Modify game objectives and survival rules
- Adjust strategic guidance
- Customize response format requirements
- Reset to default at any time

## 🛠️ Technical Details

### Stack

- Pure HTML5/CSS3/JavaScript (no build tools)
- OpenAI API for LLM inference
- Model: `gpt-4.1-mini` (fast, cost-effective, supports structured output)
- localStorage for API key, prompts, and memory persistence
- JSON Schema for structured AI responses

### Project Structure

```
bombervibe/
├── index.html          # Main page structure
├── demo.html           # Demo video page
├── css/
│   └── style.css       # Cypherpunk theme styling
├── js/
│   ├── game.js         # Core game logic (LEGACY - active)
│   ├── player.js       # Player class (LEGACY - active)
│   ├── ai.js           # OpenAI API integration (LEGACY - active)
│   ├── ui.js           # Game loop and rendering (LEGACY - active)
│   ├── npc-characters.js  # Battle Royale NPC definitions
│   ├── drag-drop.js    # NPC drag & drop system
│   ├── actions.js      # Action system (NEW - future)
│   ├── state.js        # State management (NEW - future)
│   ├── history.js      # Move history tracking (NEW - future)
│   ├── serialization.js # State serialization (NEW - future)
│   └── entities/       # Entity components (NEW - future)
│       ├── player.js
│       ├── bomb.js
│       ├── item.js
│       └── explosion.js
├── videos/
│   └── demo-web.mp4    # Gameplay demo video
└── README.md
```

### API Usage

Each AI turn makes one API call to OpenAI:
- **Model**: `gpt-4.1-mini`
- **Cost**: ~$0.001-0.002 per turn (depends on pricing)
- **Speed**: ~200-500ms per response
- **Input**: Structured system prompt + game state description + player strategy prompt
- **Output**: JSON schema-validated `{"direction": "up", "dropBomb": true, "thought": "Strategic plan..."}`
- **Memory**: Each player's previous thought is stored and included in next turn

The API uses structured output with JSON schema to ensure reliable, parseable responses every time.

## 🎨 Customization

### Change Colors

Edit CSS variables in `css/style.css`:

```css
:root {
    --cyan: #00ffff;
    --magenta: #ff00ff;
    --yellow: #ffff00;
    --green: #00ff00;
    /* ... */
}
```

### Adjust Game Speed

In `js/ui.js`, modify:

```javascript
this.turnDelay = 1000; // Milliseconds between turns (default: 1000ms)
```

### Change Grid Size

In `js/game.js`, modify:

```javascript
this.GRID_WIDTH = 13;  // Default: 13
this.GRID_HEIGHT = 11; // Default: 11
```

### Modify Bomb Settings

In `js/game.js`, modify:

```javascript
// Bomb timer in turns (not milliseconds)
turnsUntilExplode: 10  // Default: 10 turns
range: 1               // Default: 1 tile
```

### Use Different AI Model

In `js/ai.js`, change:

```javascript
this.model = 'gpt-4.1-mini'; // Try: gpt-4o-mini, gpt-4o, etc.
```

Check [OpenAI documentation](https://platform.openai.com/docs/models) for available models.

**Note**: Ensure the model you choose supports structured output (JSON schema) for best results.

### Create Custom NPCs

Edit `js/npc-characters.js` to add your own Battle Royale characters:

```javascript
{
    id: 'my_npc',
    name: 'MY NPC',
    emoji: '🎃',
    color: '#ff9900',
    keyword: 'STRATEGIC',
    prompt: 'Your custom AI behavior prompt here...',
    tooltip: 'Brief description shown on hover',
    spawnable: true
}
```

## 🐛 Troubleshooting

**"API key not set" error**
- Click RESET and re-enter your API key
- Check key starts with `sk-`

**"API error: 401"**
- Invalid API key - generate new one at OpenAI Platform
- Check your OpenAI account has available credits

**"API error: 429"**
- Rate limit exceeded - wait a moment and try again
- Check your OpenAI usage limits

**AI makes invalid moves**
- Should be rare with structured output - fallback to random valid move activates
- Check browser console for parsing errors
- Verify model supports JSON schema structured output

**Bombs not exploding**
- Bombs explode after **10 turns**, not 3 seconds
- Check browser console for errors
- Refresh page and restart game

**NPCs won't spawn**
- Check if maximum 10 players reached (4 core + 6 NPCs)
- Can't spawn on hard blocks or occupied positions
- Try spawning on empty cells or soft blocks

**System Prompt changes not working**
- Click SAVE after editing
- Refresh page if changes don't apply
- Click RESET TO DEFAULT to restore original prompt

## 📝 Development

Want to modify the game?

1. Clone repository
2. Open `index.html` in browser (no build step needed)
3. Edit files and refresh to see changes
4. Use browser DevTools console to debug

### Development Notes

- **Legacy code** (active): `game.js`, `player.js`, `ai.js`, `ui.js`, `npc-characters.js`, `drag-drop.js`
- **New architecture** (ready for future): `actions.js`, `state.js`, `history.js`, `serialization.js`, `entities/`
- All scripts are loaded in `index.html` - new architecture coexists with legacy for gradual migration

### Adding Features

Some ideas:
- Power-ups (speed, bomb range, multiple bombs)
- AI difficulty levels
- Tournament mode (best of X games)
- Replay system from move history
- Sound effects and music
- Mobile touch controls
- Spectator mode
- Real-time multiplayer (human vs AI)

## 📊 Project Metrics

See `metrics.json` for detailed codebase statistics including:
- Lines of code by file type
- File counts and sizes
- Git repository stats
- Technology stack breakdown

## 📄 License

MIT License - feel free to fork and modify!

## 🙏 Credits

- Inspired by classic Bomberman (Hudson Soft)
- Powered by [OpenAI](https://openai.com)
- Built with Claude Code
- Repository: [bombervibe](https://github.com/kristerhedfors/bombervibe)

## 🔗 Links

- [OpenAI Platform](https://platform.openai.com)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [OpenAI Models](https://platform.openai.com/docs/models)
- [GitHub Pages Guide](https://pages.github.com)

---

**Made with ⚡ by AI • Play at your own risk • May cause extreme AI competitiveness**
