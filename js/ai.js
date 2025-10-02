// AI.js - OpenAI API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4.1';
        this.prompts = {}; // Dynamic prompts for all players
        this.playerThoughts = {}; // Current turn's tactical thoughts for display
        this.defaultPrompts = {
            1: 'You are Player 1 (cyan). EXPLORER: Move toward center (G6). Collect Flash Radius (⚡) power-ups! Use your 7x7 vision to find soft blocks. 4 rounds per bomb = plenty of escape time!',
            2: 'You are Player 2 (magenta). AGGRESSIVE: Push toward center, destroy blocks, collect loot, pressure opponents. Check VALID MOVES and DANGER ANALYSIS. Adapt each round!',
            3: 'You are Player 3 (yellow). DEFENSIVE: Stay safe, clear blocks methodically, grab power-ups. Use DANGER ANALYSIS. Plan escape routes. 4 rounds is enough time!',
            4: 'You are Player 4 (green). TACTICAL: Balance risk/reward. Prioritize Flash Radius loot! Check timing info. Use 7x7 vision to plan 3-4 moves ahead. Control center!'
        };
        this.playerMemory = {}; // Dynamic memory for all players
        this.promptHistory = {}; // Track prompt changes over time: {playerId: [{prompt, turnNumber, timestamp}]}
        this.systemPrompt = this.getDefaultSystemPrompt();
        this.errorCallback = null; // Callback to show error modal
        this.loadPlayerMemories();
        this.loadPromptHistory();
    }

    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    getDefaultSystemPrompt() {
        return `You are playing ELECTRIC BOOGALOO, an AI-powered Bomberman game.

GAME OBJECTIVE:
1. SURVIVE - Don't die to bombs (most important!)
2. EXPLORE - Move toward the center, escape corners and edges
3. COLLECT LOOT - Power-ups appear randomly (⚡ = Flash Radius)
4. DESTROY BLOCKS - Soft blocks (🟫) give +10 points when destroyed
5. ELIMINATE - Trap opponents for +100 points

LOOT SYSTEM (YAML):
---
loot_types:
  - name: "Flash Radius"
    symbol: "⚡"
    effect: "Increases bomb blast radius by +1 tile in all 4 directions"
    visual: "Golden glowing circle with lightning bolt"
    spawn_chance: "1/8 per turn"
    pickup: "Walk over it to collect"
    destruction: "Destroyed by explosions (unless protected by soft block)"
    strategy: "Essential for higher damage! Calculate escape routes with increased range"
---

GAME RULES:
- You see a 7x7 grid centered on your position (limited vision) displayed as a markdown table
- Grid uses chess notation: columns A-M, rows 1-11 (11=top, 1=bottom)
- You start in a corner, IMMEDIATELY MOVE toward center (G6)
- You CAN walk through: empty spaces (·), bombs (💣), and other players
- You CANNOT walk through: soft blocks (🟫) or hard blocks (⬛) - they block movement!
- ⚠️ IMPORTANT: You can only have ONE bomb active at a time! Check your bomb status (💣0 or 💣1)

⏰ CRITICAL TIMING RULES:
- 1 ROUND = all 4 players move once (not individual turns!)
- Bombs explode after 4 ROUNDS (plenty of time to escape)
- Bomb countdown shows: 💣4 = 4 rounds left, 💣3 = 3 rounds left, 💣2 = 2 rounds left, 💣1 = 1 round left
- Base bomb range = 1 tile (increases with Flash Radius power-ups!)
- Each bomb destroys tiles in all 4 CARDINAL directions (up/down/left/right ONLY - NOT diagonals!)
- Soft blocks (🟫) stop the explosion but get destroyed (+10 points to bomb owner)
- Loot (⚡) is destroyed by explosions UNLESS protected by a soft block on same tile

🔥 BOMB BLAST PATTERN (CRITICAL FOR SURVIVAL):
- Bombs explode in a + (PLUS) pattern: UP, DOWN, LEFT, RIGHT only
- Bombs DO NOT explode diagonally!
- SAFE: Moving diagonally from a bomb (e.g., if bomb at C5, moving to D6 or B4 is SAFE)
- LETHAL: Being directly up/down/left/right of a bomb (e.g., if bomb at C5, positions C4/C6/B5/D5 are LETHAL)

DECISION PROCESS (follow this order):
1. Check "🚨 DANGER ANALYSIS" - is your current position safe? If "💀 LETHAL", ESCAPE IMMEDIATELY!
2. Check "⚡ LOOT ON BOARD" - is there Flash Radius nearby? PRIORITIZE COLLECTING IT!
3. Check your bomb status (💣0 or 💣1) - if 💣1, DON'T try to drop another!
4. Check "📊 Local Area Summary" for "Breakable Blocks: X adjacent" - if X > 0 AND you can escape diagonally, consider bombing!
5. Check "✅ VALID MOVES" - which directions are legal? (soft blocks 🟫 are NOT walkable!)
6. If loot (⚡) is within reach, MOVE TOWARD IT - it's extremely valuable!
7. If current position is safe AND 💣0 AND breakable blocks exist, DROP BOMB and move to diagonal safety
8. If current position is LETHAL or no breakable blocks, MOVE to safety (prioritize diagonal positions from bombs)
9. If no safe moves exist, you're trapped - choose least bad option and pray

STRATEGIC PLAY (CRITICAL):
- FIRST 1-2 MOVES: Get off the starting corner (move 1-2 steps away)
- COLLECT LOOT: Prioritize Flash Radius (⚡) power-ups to increase bomb range!
- THEN START BOMBING: If you see soft blocks nearby and can escape, DROP BOMB!
- You have 4 FULL ROUNDS to escape - that's plenty of time to move 3-4 tiles away
- With Flash Radius power-ups, you MUST escape further! Range 2 = 5 rounds needed, Range 3 = 6 rounds!
- Drop bombs early and often to score points and clear paths
- After dropping bomb: Move to safety, avoid dead ends
- Use your 7x7 vision to plan moves ahead
- Review your previous thought to avoid repeating mistakes
- Don't waste moves trying to place bombs when you already have one active!

⚠️ CRITICAL ESCAPE PLANNING:
- WHEN YOU DROP A BOMB: Your "thought" MUST specify WHERE to move next to escape
- DIAGONAL IS SAFE! If you drop bomb at C5, moving to D6 or B4 (diagonal) is immediately safe!
- Avoid being UP/DOWN/LEFT/RIGHT of ANY bomb (check all 💣1-4 in your 7x7 view)
- WITH HIGHER RANGE: Range 2 bomb affects 2 tiles in each direction! Plan accordingly!
- Consider positions of OTHER PLAYERS (P1-P4) - don't trap yourself or get trapped
- Plan escape route that uses DIAGONAL SAFETY when possible
- Example: "Dropped bomb at C5. Moving RIGHT then UP to D6 (diagonal = safe from my bomb at C5)"
- LOOT PRIORITY: If you see ⚡ in your 7x7 view, calculate if you can safely reach it!

BOMB PLACEMENT STRATEGY:
⚠️ ONLY DROP BOMBS WHEN THERE ARE BREAKABLE BLOCKS! ⚠️

✅ GOOD: Drop bomb when 1+ soft blocks (🟫) directly adjacent (up/down/left/right) AND diagonal escape exists
✅ GOOD: Check "📊 Local Area Summary" - it tells you EXACTLY how many breakable blocks are adjacent!
✅ GOOD: If summary says "Breakable Blocks: 2 adjacent (up, right)" - DROP BOMB and escape diagonally!
✅ GOOD: After bombing, move to diagonal position for instant safety

❌ BAD: Drop bomb when summary says "Breakable Blocks: None directly adjacent" - TOTAL WASTE!
❌ BAD: Drop bomb with no escape route (you'll die!)
❌ BAD: Drop bomb when 💣1 (you already have one active - wastes turn!)
❌ BAD: Drop bomb when NO soft blocks nearby - you get ZERO points!

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "direction": "up" | "down" | "left" | "right",
  "dropBomb": true | false,
  "memory": "Operational notes for next turn (50 words max)",
  "thought": "Tactical reasoning for THIS move (50 words max)"
}

🎯 3-LEVEL DECISION HIERARCHY:
1. **STRATEGY** (your corner prompt): High-level goal set by human - EXPLORE/AGGRESSIVE/DEFENSIVE (never changes)
2. **MEMORY** (operational): Updated each turn - patterns you notice, danger zones, loot locations, board control
3. **THOUGHT** (tactical): Reasoning for THIS specific move - why you chose this direction/bomb decision

⚠️ MEMORY vs THOUGHT:
- **MEMORY**: What you LEARNED this turn to remember for next turn (board patterns, threats, opportunities)
  Example: "Center has 3 soft blocks. P2 controls east. Loot at G6. My bomb range is 2 now."
- **THOUGHT**: Why you made THIS move right now (immediate tactical decision)
  Example: "Moving toward G6 loot - 2 tiles away. Bomb at C5 explodes in 2 rounds - staying diagonal."

EXAMPLES:
{"direction": "right", "dropBomb": false, "memory": "Started corner A11. No blocks here. Center is G6. Need to move 6 tiles right, 5 up.", "thought": "First move off edge. Going right to B11 to begin journey toward center."}
{"direction": "up", "dropBomb": true, "memory": "Found 2 soft blocks at C5 (up/right). Bomb range still 1. Diagonal escape to D6 works.", "thought": "Summary shows blocks adjacent! Dropping bomb at C5, moving UP then RIGHT to D6 (diagonal=safe)."}
{"direction": "down", "dropBomb": false, "memory": "My bomb at C5 has 2 rounds left. Currently C6 (adjacent=danger). D5 is diagonal=safe.", "thought": "Executing escape: moving DOWN-RIGHT to D5 (diagonal from my C5 bomb)."}
{"direction": "left", "dropBomb": false, "memory": "P2 bomb at D4 shows 1 round. I'm D5 (LETHAL position). C5 is diagonal safety.", "thought": "DANGER! P2 bomb directly above. Moving LEFT to C5 (diagonal=safe from D4)."}
{"direction": "right", "dropBomb": false, "memory": "Area D6: zero blocks adjacent. Must explore to find bombing targets.", "thought": "No blocks here - won't waste bomb. Moving right to explore and find soft blocks."}
{"direction": "up", "dropBomb": false, "memory": "Loot spotted at E7! Flash Radius gives +1 bomb range. Currently E5, 2 tiles south.", "thought": "⚡ PRIORITY! Loot at E7 is 2 tiles up. Moving toward it - range boost is crucial!"}

MEMORY & CONTINUITY:
Your previous MEMORY is shown each turn - it reflects what you knew WHEN you made your last move (intentionally outdated).
Current board state info is MORE ACCURATE for tactical decisions.
Use MEMORY for operational context (what patterns you've noticed), use current state for immediate survival.

WINNING: Last player alive. Play smart - get to center early, plan escapes before bombing, and understand the timing!`;
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        localStorage.setItem('system_prompt', prompt);
    }

    loadSystemPrompt() {
        const stored = localStorage.getItem('system_prompt');
        if (stored) {
            this.systemPrompt = stored;
        }
    }

    getSystemPrompt() {
        return this.systemPrompt;
    }

    resetSystemPrompt() {
        this.systemPrompt = this.getDefaultSystemPrompt();
        localStorage.removeItem('system_prompt');
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('openai_api_key', key);
    }

    loadApiKey() {
        const stored = localStorage.getItem('openai_api_key');
        if (stored) {
            this.apiKey = stored;
            return true;
        }
        return false;
    }

    setPrompt(playerId, prompt, turnNumber = 0) {
        this.prompts[playerId] = prompt;
        localStorage.setItem(`player_${playerId}_prompt`, prompt);

        // Record prompt change in history
        this.recordPromptChange(playerId, prompt, turnNumber);
    }

    loadPrompts() {
        for (let i = 1; i <= 4; i++) {
            const stored = localStorage.getItem(`player_${i}_prompt`);
            if (stored) {
                this.prompts[i] = stored;
            }
        }
    }

    getDefaultPrompt(playerId) {
        return this.defaultPrompts[playerId] || '';
    }

    resetPrompt(playerId, turnNumber = 0) {
        const defaultPrompt = this.defaultPrompts[playerId];
        if (defaultPrompt) {
            this.prompts[playerId] = defaultPrompt;
            localStorage.setItem(`player_${playerId}_prompt`, defaultPrompt);
            this.recordPromptChange(playerId, defaultPrompt, turnNumber);
            return defaultPrompt;
        }
        return null;
    }

    recordPromptChange(playerId, prompt, turnNumber = 0) {
        if (!this.promptHistory[playerId]) {
            this.promptHistory[playerId] = [];
        }

        const entry = {
            prompt: prompt,
            turnNumber: turnNumber,
            timestamp: Date.now()
        };

        this.promptHistory[playerId].push(entry);

        // Save to localStorage
        localStorage.setItem(`player_${playerId}_prompt_history`, JSON.stringify(this.promptHistory[playerId]));
    }

    loadPromptHistory() {
        for (let i = 1; i <= 10; i++) {
            const stored = localStorage.getItem(`player_${i}_prompt_history`);
            if (stored) {
                try {
                    this.promptHistory[i] = JSON.parse(stored);
                } catch (e) {
                    console.error(`Failed to parse prompt history for player ${i}:`, e);
                    this.promptHistory[i] = [];
                }
            }
        }
    }

    getPromptHistory(playerId) {
        return this.promptHistory[playerId] || [];
    }

    getPromptAtTurn(playerId, turnNumber) {
        const history = this.getPromptHistory(playerId);
        if (history.length === 0) {
            return this.prompts[playerId] || this.defaultPrompts[playerId] || '';
        }

        // Find the most recent prompt at or before the given turn
        let activePrompt = history[0].prompt;
        for (const entry of history) {
            if (entry.turnNumber <= turnNumber) {
                activePrompt = entry.prompt;
            } else {
                break;
            }
        }
        return activePrompt;
    }

    clearPromptHistory(playerId = null) {
        if (playerId) {
            this.promptHistory[playerId] = [];
            localStorage.removeItem(`player_${playerId}_prompt_history`);
        } else {
            // Clear all histories
            for (let i = 1; i <= 10; i++) {
                this.promptHistory[i] = [];
                localStorage.removeItem(`player_${i}_prompt_history`);
            }
        }
    }

    savePlayerMemory(playerId, thought) {
        // Limit to 50 words
        const words = thought.trim().split(/\s+/);
        const limited = words.slice(0, 50).join(' ');
        this.playerMemory[playerId] = limited;
        localStorage.setItem(`player_${playerId}_memory`, limited);
    }

    loadPlayerMemories() {
        for (let i = 1; i <= 10; i++) {
            const stored = localStorage.getItem(`player_${i}_memory`);
            if (stored) {
                this.playerMemory[i] = stored;
            }
        }
    }

    getPlayerMemory(playerId) {
        return this.playerMemory[playerId] || 'No previous thought';
    }

    clearAllMemories() {
        console.log('[AI] Clearing all player memories for new round');
        // Clear all player memories (dynamic range for NPCs)
        for (let i = 1; i <= 10; i++) {
            this.playerMemory[i] = '';
            this.playerThoughts[i] = '';
            localStorage.removeItem(`player_${i}_memory`);
        }
    }

    getPlayerThought(playerId) {
        return this.playerThoughts[playerId] || '';
    }

    // Convert grid coordinates (x,y) to chess notation (e.g., C5)
    coordsToChess(x, y) {
        const file = String.fromCharCode(65 + x); // A=65 in ASCII
        const rank = 11 - y; // Invert y: y=0 is rank 11, y=10 is rank 1
        return `${file}${rank}`;
    }

    // Generate 7x7 limited vision grid centered on player (markdown table format)
    generate7x7Grid(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        const VISION_RADIUS = 3; // 3 tiles in each direction = 7x7 grid
        let gridStr = '## 🔍 YOUR 7x7 LOCAL VIEW (centered on you):\n\n';

        // Build markdown table
        // Header row with column letters
        gridStr += '| Rank |';
        for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
            const x = player.x + dx;
            if (x >= 0 && x < 13) {
                gridStr += ` ${String.fromCharCode(65 + x)} |`;
            } else {
                gridStr += ' ❌ |'; // Out of bounds
            }
        }
        gridStr += '\n';

        // Separator row
        gridStr += '|------|';
        for (let i = 0; i < 7; i++) {
            gridStr += '---|';
        }
        gridStr += '\n';

        // Grid rows
        for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
            const y = player.y + dy;
            const rank = (y >= 0 && y < 11) ? (11 - y) : '❌';
            gridStr += `| **${rank.toString().padStart(2, ' ')}** |`;

            for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
                const x = player.x + dx;

                // Out of bounds
                if (x < 0 || x >= 13 || y < 0 || y >= 11) {
                    gridStr += ' ❌ |';
                    continue;
                }

                const cell = gameState.grid[y][x];
                let cellContent = '';

                // Check if this is the current player
                if (x === player.x && y === player.y) {
                    cellContent = '🎯'; // YOU ARE HERE
                }
                // Check if any other player is at this position
                else {
                    const playerHere = gameState.players.find(p => p.alive && p.x === x && p.y === y);
                    if (playerHere) {
                        cellContent = `P${playerHere.id}`;
                    }
                }

                // Check if bomb is here
                const bombHere = gameState.bombs.find(b => b.x === x && b.y === y);
                if (bombHere) {
                    const roundsLeft = bombHere.roundsUntilExplode;
                    cellContent = cellContent ? `${cellContent}💣${roundsLeft}` : `💣${roundsLeft}`;
                }

                // Check for loot (shows even with players/bombs)
                const lootHere = gameState.loot && gameState.loot.find(l => l.x === x && l.y === y);
                if (lootHere && !cellContent) {
                    // Show loot with terrain background
                    if (cell === 1) {
                        cellContent = '🟫⚡'; // Soft block with loot
                    } else {
                        cellContent = '⚡'; // Loot on empty
                    }
                } else if (!cellContent) {
                    // Cell type (only if no player/bomb/loot)
                    if (cell === 0) {
                        cellContent = '·'; // Empty
                    } else if (cell === 1) {
                        cellContent = '🟫'; // Soft block (breakable)
                    } else if (cell === 2) {
                        cellContent = '⬛'; // Hard block
                    } else {
                        cellContent = '?';
                    }
                }

                gridStr += ` ${cellContent} |`;
            }
            gridStr += '\n';
        }

        gridStr += '\n**Legend:** 🎯=YOU | P1-P4=Players | 💣1-4=Bomb (rounds left) | ⚡=Flash Radius Loot | ·=Empty | 🟫=Soft Block (breakable) | ⬛=Hard Block | ❌=Out of Bounds\n\n';

        // Add natural language summary
        gridStr += this.generateLocalSummary(gameState, playerId);

        return gridStr;
    }

    // Generate natural language summary of local area
    generateLocalSummary(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return '';

        let summary = '### 📊 Local Area Summary:\n\n';

        // Count adjacent breakable blocks
        const adjacentBlocks = [];
        const directions = [
            { dir: 'up', dx: 0, dy: -1 },
            { dir: 'down', dx: 0, dy: 1 },
            { dir: 'left', dx: -1, dy: 0 },
            { dir: 'right', dx: 1, dy: 0 }
        ];

        for (const {dir, dx, dy} of directions) {
            const x = player.x + dx;
            const y = player.y + dy;
            if (x >= 0 && x < 13 && y >= 0 && y < 11) {
                if (gameState.grid[y][x] === 1) {
                    adjacentBlocks.push(dir);
                }
            }
        }

        // Breakable blocks summary
        if (adjacentBlocks.length === 0) {
            summary += '**Breakable Blocks:** None directly adjacent to you.\n';
        } else {
            summary += `**Breakable Blocks:** ${adjacentBlocks.length} adjacent (${adjacentBlocks.join(', ')})\n`;
        }

        // Valid moves summary
        const validMoves = [];
        for (const {dir, dx, dy} of directions) {
            const x = player.x + dx;
            const y = player.y + dy;

            // Check bounds
            if (x < 0 || x >= 13 || y < 0 || y >= 11) {
                continue;
            }

            // Check if passable
            const cell = gameState.grid[y][x];
            if (cell === 0 || cell === 1) { // Empty or soft block
                // Can walk through empty, but NOT soft blocks
                if (cell === 0) {
                    validMoves.push(dir);
                }
            } else if (typeof cell === 'string' && cell.startsWith('bomb')) {
                validMoves.push(dir); // Can walk through bombs
            }
            // Check for other players (can walk through)
            const playerHere = gameState.players.find(p => p.alive && p.x === x && p.y === y);
            if (playerHere && cell === 0) {
                validMoves.push(dir);
            }
        }

        if (validMoves.length === 0) {
            summary += '**Valid Moves:** ⚠️ TRAPPED! No valid moves available.\n';
        } else {
            summary += `**Valid Moves:** You CAN move: ${validMoves.join(', ')}\n`;
            if (validMoves.length === 1) {
                summary += `⚠️ Only ONE escape route available!\n`;
            }
        }

        summary += '\n';
        return summary;
    }

    // Generate game state description for LLM with danger analysis
    generateGameStateDescription(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        // Use 7x7 limited vision grid
        const gridStr = this.generate7x7Grid(gameState, playerId);

        // Player info
        let playersInfo = 'PLAYERS:\n';
        for (const p of gameState.players) {
            const status = p.alive ? '✅ ALIVE' : '💀 DEAD';
            const bombStatus = p.hasBomb ? '💣1' : '💣0'; // Bomb symbol + count
            const pos = this.coordsToChess(p.x, p.y);
            playersInfo += `Player ${p.id} (${p.color}): ${pos} | ${status} | Score: ${p.score} | ${bombStatus}\n`;
        }

        // Bomb info with visual countdown
        let bombsInfo = '\n💣 ACTIVE BOMBS:\n';
        if (gameState.bombs.length === 0) {
            bombsInfo += 'None - no active bombs on the board\n';
        } else {
            for (const b of gameState.bombs) {
                const roundsLeft = b.roundsUntilExplode;
                const pos = this.coordsToChess(b.x, b.y);
                const range = b.range || 1;
                bombsInfo += `  💣 Bomb by P${b.playerId} at ${pos}: ${roundsLeft} rounds left | Range: ${range}\n`;
            }
        }

        // Loot info
        let lootInfo = '\n⚡ LOOT ON BOARD:\n';
        if (!gameState.loot || gameState.loot.length === 0) {
            lootInfo += 'None - no loot currently available\n';
        } else {
            for (const l of gameState.loot) {
                const pos = this.coordsToChess(l.x, l.y);
                lootInfo += `  ⚡ Flash Radius at ${pos} - Walk over to collect! +1 bomb range!\n`;
            }
        }

        // Game timing info
        let timingInfo = '\n⏰ GAME TIMING (IMPORTANT):\n';
        timingInfo += '  - Current round: ' + gameState.roundCount + '\n';
        timingInfo += '  - 1 ROUND = all 4 players move once\n';
        timingInfo += '  - Bombs explode after 4 rounds (not turns!)\n';
        timingInfo += '  - You have time to plan, but don\'t wait too long!\n';

        // VALID MOVES - check all 4 directions
        let validMovesInfo = '\n✅ VALID MOVES (check this FIRST):\n';
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            const destPos = this.coordsToChess(x, y);

            // Check bounds
            if (x < 0 || x >= 13 || y < 0 || y >= 11) {
                validMovesInfo += `  ${dir.toUpperCase()}: ❌ OUT OF BOUNDS\n`;
                continue;
            }

            // Check cell type
            const cell = gameState.grid[y][x];
            let cellType = '';
            let passable = false;

            if (cell === 0) {
                cellType = 'empty';
                passable = true;
            } else if (cell === 1) {
                cellType = 'soft block';
                passable = false; // CANNOT walk through soft blocks - they block movement!
            } else if (cell === 2) {
                cellType = 'hard block';
                passable = false;
            } else if (typeof cell === 'string' && cell.startsWith('bomb')) {
                cellType = 'bomb';
                passable = true; // Can walk through bombs
            }

            // Check for other players
            const playerHere = gameState.players.find(p => p.alive && p.x === x && p.y === y);
            if (playerHere) {
                cellType = `Player ${playerHere.id}`;
                passable = true; // Can walk through other players
            }

            if (passable) {
                validMovesInfo += `  ${dir.toUpperCase()} to ${destPos}: ✅ Legal (${cellType})\n`;
            } else {
                validMovesInfo += `  ${dir.toUpperCase()} to ${destPos}: ❌ BLOCKED (${cellType})\n`;
            }
        }

        // Danger analysis
        const safeMoves = game.getSafeMoves(playerId);
        const dangerousMoves = game.getDangerousMoves(playerId);
        const currentlySafe = !game.isPositionLethal(player.x, player.y, 1);

        let dangerInfo = '\n🚨 DANGER ANALYSIS:\n';
        const currentPos = this.coordsToChess(player.x, player.y);
        dangerInfo += `Current position ${currentPos}: ${currentlySafe ? '✅ SAFE' : '💀 LETHAL - YOU WILL DIE IF YOU STAY!'}\n\n`;

        dangerInfo += 'SAFE MOVES (will NOT kill you):\n';
        if (safeMoves.length === 0) {
            dangerInfo += '  ⚠️  NO SAFE MOVES AVAILABLE! All directions are lethal!\n';
        } else {
            for (const move of safeMoves) {
                const movePos = this.coordsToChess(move.x, move.y);
                dangerInfo += `  ✅ ${move.direction.toUpperCase()} to ${movePos} - SAFE\n`;
            }
        }

        dangerInfo += '\nLETHAL MOVES (will kill you in next round):\n';
        if (dangerousMoves.length === 0) {
            dangerInfo += '  None - all valid moves are safe\n';
        } else {
            for (const move of dangerousMoves) {
                const movePos = this.coordsToChess(move.x, move.y);
                dangerInfo += `  💀 ${move.direction.toUpperCase()} to ${movePos} - DEATH!\n`;
            }
        }

        // Your status
        const yourInfo = `\nYOU ARE PLAYER ${playerId}:\n`;
        const yourStatus = `Position: ${currentPos}\n`;
        const bombCount = player.hasBomb ? '💣1' : '💣0';
        const bombRange = player.bombRange || 1;
        const yourBomb = player.hasBomb ? `${bombCount} - You have a bomb placed - cannot place another until it explodes\n` : `${bombCount} - You can place a bomb (Range: ${bombRange} tile${bombRange > 1 ? 's' : ''})\n`;
        const yourScore = `Score: ${player.score}\n`;

        // Find nearby soft blocks for strategic info
        let nearbyBlocks = 0;
        const searchRadius = 3;
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const checkX = player.x + dx;
                const checkY = player.y + dy;
                if (checkX >= 0 && checkX < 13 && checkY >= 0 && checkY < 11) {
                    if (gameState.grid[checkY][checkX] === 1) {
                        nearbyBlocks++;
                    }
                }
            }
        }

        const blocksInfo = `Soft blocks within ${searchRadius} tiles: ${nearbyBlocks} (each worth +10 points)\n`;

        // Check for nearby loot
        let nearbyLoot = 0;
        let closestLoot = null;
        let closestLootDist = Infinity;
        if (gameState.loot && gameState.loot.length > 0) {
            for (const loot of gameState.loot) {
                const dist = Math.abs(loot.x - player.x) + Math.abs(loot.y - player.y);
                if (dist <= 6) { // Within 7x7 view
                    nearbyLoot++;
                    if (dist < closestLootDist) {
                        closestLootDist = dist;
                        closestLoot = loot;
                    }
                }
            }
        }

        const lootHintInfo = nearbyLoot > 0 ? `⚡ Flash Radius loot within view: ${nearbyLoot} | Closest: ${closestLootDist} tiles away\n` : '';

        // Strategic recommendation
        let strategyHint = '\n💡 STRATEGIC HINT:\n';

        // LOOT IS TOP PRIORITY
        if (closestLoot && closestLootDist <= 3) {
            const lootPos = this.coordsToChess(closestLoot.x, closestLoot.y);
            strategyHint += `⚡⚡⚡ FLASH RADIUS at ${lootPos} only ${closestLootDist} tiles away! PRIORITIZE COLLECTING IT!\n`;
        } else if (nearbyLoot > 0) {
            strategyHint += `⚡ ${nearbyLoot} Flash Radius loot in view - very valuable! Check 7x7 grid for ⚡ symbols.\n`;
        }

        if (player.x === 0 || player.x === 12 || player.y === 0 || player.y === 10) {
            strategyHint += '⚠️ You are ON THE EDGE! Move 1-2 steps toward center, then start bombing!\n';
        } else if (player.x === 1 || player.x === 11 || player.y === 1 || player.y === 9) {
            strategyHint += '✓ Good - off the edge! Now look for soft blocks to bomb.\n';
        } else {
            strategyHint += '✓ Excellent position! Aggressively bomb soft blocks and control the center.\n';
        }

        if (nearbyBlocks > 0 && !player.hasBomb) {
            strategyHint += `💣💣 ${nearbyBlocks} soft blocks nearby - DROP A BOMB NOW for ${nearbyBlocks * 10} points!\n`;
        } else if (!player.hasBomb) {
            strategyHint += `💣 No soft blocks nearby - move to find some, then bomb immediately!\n`;
        }

        // Previous memory (operational context from last turn)
        const previousMemory = this.getPlayerMemory(playerId);
        let memoryInfo = `\n🧠 YOUR PREVIOUS MEMORY (operational notes from last turn):\n"${previousMemory}"\n`;
        memoryInfo += '⚠️ This memory is OUTDATED - it reflects what you knew when you made your LAST move.\n';
        memoryInfo += '✅ Use current board state (DANGER ANALYSIS, LOOT, VALID MOVES) for immediate tactical decisions.\n';
        memoryInfo += '📝 Update your MEMORY with new patterns/learnings, and THOUGHT with reasoning for THIS move.\n';

        const fullDescription = gridStr + playersInfo + bombsInfo + lootInfo + timingInfo + validMovesInfo + dangerInfo + yourInfo + yourStatus + yourBomb + yourScore + blocksInfo + lootHintInfo + strategyHint + memoryInfo;
        return fullDescription;
    }

    // Get JSON schema for structured output
    getResponseFormat() {
        return {
            type: "json_schema",
            json_schema: {
                name: "bomberman_move",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        direction: {
                            type: "string",
                            enum: ["up", "down", "left", "right"],
                            description: "Direction to move"
                        },
                        dropBomb: {
                            type: "boolean",
                            description: "Whether to drop a bomb at current position before moving"
                        },
                        memory: {
                            type: "string",
                            description: "Operational notes about board patterns, danger zones, loot locations for next turn (max 50 words)"
                        },
                        thought: {
                            type: "string",
                            description: "Your tactical reasoning for THIS specific move (max 50 words)"
                        }
                    },
                    required: ["direction", "dropBomb", "memory", "thought"],
                    additionalProperties: false
                }
            }
        };
    }

    // Call OpenAI API to get AI move using structured output
    async getAIMove(gameState, playerId, game) {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return null;
        }

        const gameDescription = this.generateGameStateDescription(gameState, playerId, game);
        const playerStrategy = this.prompts[playerId] || 'You are a Bomberman AI player. Make smart moves to survive and win.';

        const userPrompt = `${gameDescription}

YOUR STRATEGY:
${playerStrategy}

Respond with JSON containing your move decision and strategic thought.`;

        try {
            console.log(`[AI P${playerId}] Sending request to ${this.model}`);
            // console.log(`[AI P${playerId}] === USER PROMPT ===\n${userPrompt}\n=== END USER PROMPT ===`);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: this.getResponseFormat(),
                    temperature: 0.7,
                    max_tokens: 200
                })
            });

            console.log(`[AI P${playerId}] Response status: ${response.status}`);

            if (!response.ok) {
                const error = await response.text();
                console.error(`[AI P${playerId}] API error ${response.status}:`, error);
                throw new Error(`API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            console.log(`[AI P${playerId}] Raw response:`, content);

            // Parse structured JSON output
            const move = JSON.parse(content);

            console.log(`[AI P${playerId}] Parsed move:`, move);

            // Validate direction
            if (!['up', 'down', 'left', 'right'].includes(move.direction)) {
                console.log(`[AI P${playerId}] Invalid direction: ${move.direction}, using random move`);
                return this.getRandomMove(gameState, playerId);
            }

            // Save memory (operational notes) for next turn
            if (move.memory) {
                this.savePlayerMemory(playerId, move.memory);
                console.log(`[AI P${playerId}] Saved memory: "${move.memory}"`);
            }

            // Save thought (tactical reasoning) for UI display
            if (move.thought) {
                this.playerThoughts[playerId] = move.thought;
                console.log(`[AI P${playerId}] Thought: "${move.thought}"`);
            }

            console.log(`[AI P${playerId}] Move: ${move.direction}, dropBomb: ${move.dropBomb}`);
            return {
                action: 'move',
                direction: move.direction,
                dropBomb: move.dropBomb,
                thought: move.thought || '' // Pass thought to UI for display
            };

        } catch (error) {
            console.error(`[AI P${playerId}] Exception:`, error);
            console.log(`[AI P${playerId}] Using random move fallback`);
            return this.getRandomMove(gameState, playerId);
        }
    }

    // Get AI moves for all alive players in parallel (one API call per player)
    async getAllPlayerMoves(gameState, game) {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        console.log('[BATCH AI] Requesting moves for all alive players in parallel');

        // Create array of promises for all alive players
        const movePromises = gameState.players
            .filter(p => p.alive)
            .map(p => this.getAIMove(gameState, p.id, game));

        // Execute all API calls in parallel
        const moves = await Promise.all(movePromises);

        // Build result object mapping playerId -> move
        const result = {};
        gameState.players.forEach((p, index) => {
            if (p.alive) {
                result[p.id] = moves[gameState.players.filter((p2, i) => i < index && p2.alive).length];
            }
        });

        console.log('[BATCH AI] All moves received:', result);
        return result;
    }

    // Fallback: generate random valid move (ALWAYS returns a move action)
    // Prioritizes moves that AVOID bombs
    getRandomMove(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return { action: 'move', direction: 'right', dropBomb: false };
        }

        const safeMoves = [];  // Moves that don't go onto a bomb
        const validMoves = []; // All valid moves (including onto bombs)

        // Check all 4 directions
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            // Check if valid (within bounds and passable)
            if (x >= 0 && x < 13 && y >= 0 && y < 11) {
                const cell = gameState.grid[y][x];
                // Can move through empty, soft blocks, bombs
                if (cell === 0 || cell === 1 || (typeof cell === 'string' && cell.startsWith('bomb'))) {
                    const move = { action: 'move', direction: dir, dropBomb: !player.hasBomb && Math.random() > 0.7 };
                    validMoves.push(move);

                    // Prioritize moves that DON'T go onto bombs
                    if (cell !== 'string' || !cell.startsWith('bomb')) {
                        safeMoves.push(move);
                    }
                }
            }
        }

        // Prefer safe moves (avoiding bombs), fall back to any valid move
        if (safeMoves.length > 0) {
            console.log(`[AI P${playerId}] Random move: choosing from ${safeMoves.length} safe moves`);
            return safeMoves[Math.floor(Math.random() * safeMoves.length)];
        } else if (validMoves.length > 0) {
            console.log(`[AI P${playerId}] Random move: no safe moves, choosing from ${validMoves.length} valid moves`);
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        // No valid moves - try any direction (will likely fail but that's ok)
        console.log(`[AI P${playerId}] Random move: no valid moves at all, picking any direction`);
        return {
            action: 'move',
            direction: directions[Math.floor(Math.random() * 4)],
            dropBomb: false
        };
    }
}
