# Electric Boogaloo - Debug Guide

## Quick Start

### 1. Set up Python Environment

```bash
# Create virtual environment (already done)
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install dependencies (already done)
pip install -r requirements.txt

# Install browser
playwright install chromium
```

### 2. Run Debug Script

**Local file debugging:**
```bash
python debug_game.py YOUR_GROQ_API_KEY
```

**Remote URL debugging:**
```bash
python debug_game.py YOUR_GROQ_API_KEY https://kristerhedfors.github.io/electric-boogaloo
```

### 3. What You'll See

The script will:
1. ✅ Open Chrome browser (visible, not headless)
2. ✅ Load the game with API key in URL fragment
3. ✅ Auto-click START button
4. ✅ Capture ALL console logs in real-time with color coding
5. ✅ Save logs to `game_debug.log` when you exit

## Console Log Format

Logs are prefixed with tags for easy filtering:

### Turn Execution
```
[TURN 5] Current player: 1 at (2, 3)
[TURN 5] Requesting AI move for Player 1
[TURN 5] Game state: { players: [...], bombs: 2, ... }
[TURN 5] AI returned move: { action: "move", direction: "up", dropBomb: true }
[TURN 5] Attempting to drop bomb at (2, 3)
[TURN 5] Bomb drop SUCCESS
[TURN 5] Attempting to move up from (2, 3)
[TURN 5] Move SUCCESS - now at (2, 2)
```

### AI Communication
```
[AI P1] Sending request to moonshotai/kimi-k2-instruct-0905
[AI P1] User prompt length: 1234 chars
[AI P1] Response status: 200
[AI P1] Raw response: {"action":"move","direction":"up","dropBomb":true}
[AI P1] Parsed move: { action: "move", direction: "up", dropBomb: true }
[AI P1] Valid move action: up (dropBomb: true)
```

### Errors
```
[AI P2] API error 401: Invalid API key
[AI P2] Falling back to random move
[TURN 10] ERROR for Player 2: API error: 401
```

## Debug Features

### Browser Controls
- **Visible browser**: Watch the game play in real-time
- **Slow motion**: 100ms delay between actions for easier viewing
- **DevTools**: Open manually (F12) for deeper inspection

### Console Logging
All JavaScript `console.log()`, `console.error()`, `console.warn()` captured and displayed with:
- ⏰ Timestamps
- 🎨 Color coding (white=log, cyan=info, yellow=warning, red=error)
- 💾 Auto-save to `game_debug.log`

### Game State Inspection
Each turn logs:
- Current player position
- Alive/dead status
- Bomb counts
- Move attempts and results
- API request/response details

## Common Issues

### "API key not set" Error
- Check URL fragment has the key: `#gsk_...`
- Try manual entry if auto-load fails

### API 401 Errors
- Verify your Groq API key is valid
- Check you have credits available

### No Console Logs
- Make sure browser opened successfully
- Check terminal for Python errors

### Game Not Starting
- Script auto-clicks START button
- If it fails, click manually in the browser

## Advanced Usage

### Custom Viewport
Edit `debug_game.py`:
```python
viewport={'width': 2560, 'height': 1440}  # 4K display
```

### Headless Mode
```python
browser = p.chromium.launch(headless=True)  # No visible browser
```

### Take Screenshots
Add to script:
```python
page.screenshot(path='game_state.png')
```

### Record Video
```python
context = browser.new_context(
    record_video_dir='videos/',
    record_video_size={'width': 1920, 'height': 1080}
)
```

## Log File Analysis

The `game_debug.log` file contains all console output. Useful for:

### Finding Errors
```bash
grep "ERROR" game_debug.log
```

### Tracking Player Moves
```bash
grep "TURN.*Player 1" game_debug.log
```

### Analyzing AI Responses
```bash
grep "AI P" game_debug.log | grep "Raw response"
```

### Counting API Calls
```bash
grep "Sending request" game_debug.log | wc -l
```

## Tips

1. **Run multiple times** - AI behavior varies due to randomness
2. **Watch bomb timers** - 3-second delays between placement and explosion
3. **Check stacking** - Look for player+bomb visual overlays
4. **Monitor turn counts** - Game should progress smoothly ~1 turn/second
5. **Verify move+bomb** - Look for "dropBomb: true" in logs

## Exit

Press `Ctrl+C` in terminal to stop the debug session.
The browser will close and logs will be saved automatically.

---

Happy debugging! 🎮💣🐛
