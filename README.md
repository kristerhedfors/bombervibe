# 💣 Electric Boogaloo

An AI-powered Bomberman game where players are controlled by LLMs through Groq Cloud API. Classic Bomberman gameplay meets modern AI - watch as Kimi K2 agents compete in strategic bomb-dropping battles!

## 🎮 Features

- **AI-Powered Gameplay**: 4 players controlled by Groq Cloud's `moonshotai/kimi-k2-instruct-0905` model
- **Customizable Strategies**: Edit each player's AI prompt to change their behavior
- **Manual Override**: Control Player 1 with keyboard (Arrow keys + Spacebar for bombs)
- **Classic Mechanics**: 13x11 grid, bombs with 2-tile range, destructible blocks
- **Cypherpunk Aesthetic**: Matrix-style terminal visuals with glowing effects
- **Pure Frontend**: No backend required - runs entirely in the browser
- **URL Fragment API Key**: Pass your Groq API key in the URL hash for instant access

## 🚀 Quick Start

### Play Online

**Option 1: URL Fragment (Recommended)**

Visit with your API key in the URL fragment:
```
https://kristerhedfors.github.io/electric-boogaloo/#gsk_your_api_key_here
```

This automatically loads your API key and skips the modal prompt!

**Option 2: Manual Entry**

Visit: **[https://kristerhedfors.github.io/electric-boogaloo](https://kristerhedfors.github.io/electric-boogaloo)**

Then enter your API key when prompted.

### Setup GitHub Pages

1. **Fork or clone this repository**

```bash
git clone https://github.com/yourusername/electric-boogaloo.git
cd electric-boogaloo
```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select branch: `main` (or `master`)
   - Select folder: `/ (root)`
   - Click Save

3. **Get Groq API Key**
   - Visit [https://console.groq.com](https://console.groq.com)
   - Sign up for free account
   - Generate API key
   - Copy your key (starts with `gsk_...`)

4. **Play!**

   **Method A (URL Fragment):**
   ```
   https://yourusername.github.io/electric-boogaloo/#gsk_your_api_key_here
   ```

   **Method B (Manual):**
   - Visit your GitHub Pages URL
   - Enter your Groq API key when prompted
   - Click START to begin

## 🎯 How to Play

### Game Rules

- **4 Players** start in corners of 13x11 grid
- **Turn-based**: Players take sequential turns (P1→P2→P3→P4)
- **Actions per turn**: Move (up/down/left/right) OR place bomb
- **Bombs**: Explode after 3 seconds with **1-tile range** in 4 directions
- **Movement**: Players can walk through bombs, soft blocks, and other players
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
- **Soft Blocks** 🌳 Trees (destructible)
- **Hard Blocks** 🗿 Stones (indestructible)
- **Bombs** 💣 Classic bomb
- **Explosions** 💥 Boom!

### Controls

**Player 1 (⛷️ Skier) Manual Override:**
- Arrow Keys: Move
- Spacebar or B: Place bomb

**All Players (including P1 if no manual input):**
- AI-controlled via Groq Cloud API
- Customize strategy in corner text boxes

### Customizing AI Behavior

Each corner has an editable prompt for that player's AI strategy:

**Example Strategies:**

- **Aggressive**: "Chase opponents relentlessly. Drop bombs and move away immediately. Trap enemies in corners."
- **Defensive**: "Avoid danger. Clear blocks slowly. Always keep escape routes open. Only engage when safe."
- **Territorial**: "Control the center. Drop bombs and walk through them to safety. Dominate key areas."
- **Opportunistic**: "Wait for enemies to fight. Strike when they're vulnerable. Use your escape mobility wisely."

**Pro Tip**: Since you can walk through bombs, drop a bomb then immediately move away to safety!

Edit prompts in the corner text boxes and they'll save automatically to localStorage.

## 🛠️ Technical Details

### Stack

- Pure HTML5/CSS3/JavaScript (no build tools)
- Groq Cloud API for LLM inference
- Model: `moonshotai/kimi-k2-instruct-0905` (fast, good for gameplay)
- localStorage for API key and prompt persistence

### Project Structure

```
electric-boogaloo/
├── index.html          # Main page structure
├── css/
│   └── style.css      # Cypherpunk theme styling
├── js/
│   ├── game.js        # Core game logic
│   ├── player.js      # Player class
│   ├── ai.js          # Groq API integration
│   └── ui.js          # Game loop and rendering
└── README.md
```

### API Usage

Each AI turn makes one API call to Groq:
- **Model**: `moonshotai/kimi-k2-instruct-0905`
- **Cost**: ~$0.00002 per turn (very cheap)
- **Speed**: ~100-300ms per response
- **Input**: Game state + player strategy prompt
- **Output**: JSON action `{"action": "move", "direction": "up"}` or `{"action": "bomb"}`

Free tier typically includes enough credits for hundreds of games.

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

### Use Different AI Model

In `js/ai.js`, change:

```javascript
this.model = 'moonshotai/kimi-k2-instruct-0905'; // Try: llama-3.1-8b-instant, etc.
```

Check [Groq documentation](https://console.groq.com/docs/models) for available models.

## 🐛 Troubleshooting

**"API key not set" error**
- Click RESET and re-enter your API key
- Check key starts with `gsk_`

**"API error: 401"**
- Invalid API key - generate new one at Groq Console

**"API error: 429"**
- Rate limit exceeded - wait a moment and try again

**AI makes invalid moves**
- Normal - fallback to random valid move
- Try adjusting prompts to be more specific

**Bombs not exploding**
- Check browser console for errors
- Refresh page and restart game

## 📝 Development

Want to modify the game?

1. Clone repository
2. Open `index.html` in browser (no build step needed)
3. Edit files and refresh to see changes
4. Use browser DevTools console to debug

### Adding Features

Some ideas:
- Power-ups (speed, bomb range, multiple bombs)
- AI difficulty levels
- Tournament mode (best of X games)
- Replay system
- Sound effects
- Mobile controls

## 📄 License

MIT License - feel free to fork and modify!

## 🙏 Credits

- Inspired by classic Bomberman (Hudson Soft)
- Powered by [Groq Cloud](https://groq.com)
- Built with Claude Code

## 🔗 Links

- [Groq Cloud Console](https://console.groq.com)
- [Groq API Docs](https://console.groq.com/docs)
- [GitHub Pages Guide](https://pages.github.com)

---

**Made with ⚡ by AI • Play at your own risk • May cause extreme AI competitiveness**
