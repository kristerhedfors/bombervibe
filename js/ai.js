// AI.js - Groq Cloud API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'moonshotai/kimi-k2-instruct-0905';
        this.prompts = {
            1: '',
            2: '',
            3: '',
            4: ''
        };
        this.systemPrompt = this.getDefaultSystemPrompt();
        this.errorCallback = null; // Callback to show error modal
    }

    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    getDefaultSystemPrompt() {
        return `You are playing ELECTRIC BOOGALOO, an AI-powered Bomberman game.

GAME OBJECTIVE:
- Survive longer than other players
- Eliminate opponents by trapping them in bomb explosions
- Destroy soft blocks for points
- Win by being the last player alive or having the highest score

GAME RULES:
- 13x11 grid (coordinates: x=0-12, y=0-10)
- 4 players compete simultaneously
- Turn-based: each player makes ONE move per turn sequentially
- Players can occupy the same square

YOUR ACTIONS (per turn):
You MUST ALWAYS MOVE. You can optionally drop a bomb while moving.
- EVERY turn you must pick a direction: up/down/left/right
- You can set dropBomb: true to place a bomb at your CURRENT position BEFORE moving
- If you already have a bomb placed, the dropBomb will fail but you'll still move

MOVEMENT:
- You can move to adjacent squares (up, down, left, right)
- You CANNOT move through hard blocks (🗿)
- You CAN move through soft blocks (🌳), bombs (💣), and other players
- Moving off the grid edge is invalid
- IMPORTANT: You can move away from bombs! Drop bomb then move away immediately

BOMB MECHANICS:
- Each player can have only ONE active bomb at a time
- Bombs explode after 10 TURNS (turn-based countdown, NOT time-based)
- With 4 players taking turns sequentially, 10 turns = 2.5 full rounds through all players
- Explosion range: 1 tile in all 4 directions (cross pattern)
- Explosions destroy soft blocks (🌳) but NOT hard blocks (🗿)
- Explosions kill any player in the blast radius
- Chain reactions: bombs can trigger other bombs
- You can walk through bombs to escape!

GRID SYMBOLS:
- . (dot) = empty space
- # (hash) = soft block 🌳 (destructible, +10 points)
- X = hard block 🗿 (indestructible, blocks explosions)
- P1, P2, P3, P4 = player positions
- B1, B2, B3, B4 = bombs (number indicates which player placed it)

SCORING:
- Destroy soft block: +10 points
- Kill opponent: +100 points
- Getting killed: you're out of the game

STRATEGY TIPS:
- Avoid bomb blast radiuses (1 tile in cross pattern)
- Drop bomb WHILE MOVING - no speed penalty! Move and drop simultaneously
- Trap opponents between bombs and walls
- Clear soft blocks to create escape routes
- Watch bomb turn countdown to avoid your own explosions
- Corner opponents when they have a bomb active
- Control center area for tactical advantage
- With 10-turn timers, you get 2 full moves before your own bomb explodes (at least 2 tiles away)
- Smart play: Drop bomb, move away immediately, move again to be safe!
- NEVER move back onto your own bomb after escaping!

WINNING:
- Last player alive wins automatically
- If time runs out, highest score wins
- Being strategic > being aggressive

YOU MUST RESPOND WITH VALID JSON (MOVE IS REQUIRED):
{"action": "move", "direction": "up", "dropBomb": false}
{"action": "move", "direction": "down", "dropBomb": true}
{"action": "move", "direction": "left", "dropBomb": false}
{"action": "move", "direction": "right", "dropBomb": true}

IMPORTANT:
- "action" MUST be "move"
- "direction" MUST be one of: "up", "down", "left", "right"
- "dropBomb" is optional (defaults to false)
- NO other action types allowed

DO NOT include explanations, only the JSON action.`;
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
        localStorage.setItem('groq_api_key', key);
    }

    loadApiKey() {
        const stored = localStorage.getItem('groq_api_key');
        if (stored) {
            this.apiKey = stored;
            return true;
        }
        return false;
    }

    setPrompt(playerId, prompt) {
        this.prompts[playerId] = prompt;
        localStorage.setItem(`player_${playerId}_prompt`, prompt);
    }

    loadPrompts() {
        for (let i = 1; i <= 4; i++) {
            const stored = localStorage.getItem(`player_${i}_prompt`);
            if (stored) {
                this.prompts[i] = stored;
            }
        }
    }

    // Generate game state description for LLM
    generateGameStateDescription(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        // Build grid representation
        let gridStr = 'GRID (13x11):\n';
        gridStr += '  ';
        for (let x = 0; x < 13; x++) {
            gridStr += x.toString().padStart(2, ' ') + ' ';
        }
        gridStr += '\n';

        for (let y = 0; y < 11; y++) {
            gridStr += y.toString().padStart(2, ' ') + ' ';
            for (let x = 0; x < 13; x++) {
                const cell = gameState.grid[y][x];

                // Check if any player is at this position
                const playerHere = gameState.players.find(p => p.alive && p.x === x && p.y === y);
                if (playerHere) {
                    gridStr += 'P' + playerHere.id + ' ';
                    continue;
                }

                // Check if bomb is here
                const bombHere = gameState.bombs.find(b => b.x === x && b.y === y);
                if (bombHere) {
                    gridStr += 'B' + bombHere.playerId + ' ';
                    continue;
                }

                // Check cell type
                if (cell === 0) {
                    gridStr += ' . ';
                } else if (cell === 1) {
                    gridStr += ' # ';
                } else if (cell === 2) {
                    gridStr += ' X ';
                } else {
                    gridStr += ' ? ';
                }
            }
            gridStr += '\n';
        }

        // Legend
        gridStr += '\nLegend:\n';
        gridStr += ' . = empty  # = soft block (destructible)  X = hard block\n';
        gridStr += ' P1-P4 = players  B1-B4 = bombs\n\n';

        // Player info
        let playersInfo = 'PLAYERS:\n';
        for (const p of gameState.players) {
            const status = p.alive ? 'ALIVE' : 'DEAD';
            const hasBomb = p.hasBomb ? 'has bomb placed' : 'can place bomb';
            playersInfo += `Player ${p.id} (${p.color}): pos=(${p.x},${p.y}) ${status} score=${p.score} ${hasBomb}\n`;
        }

        // Bomb info
        let bombsInfo = '\nACTIVE BOMBS:\n';
        if (gameState.bombs.length === 0) {
            bombsInfo += 'None\n';
        } else {
            for (const b of gameState.bombs) {
                const turnsLeft = b.turnsUntilExplode;
                bombsInfo += `Bomb ${b.playerId}: pos=(${b.x},${b.y}) explodes in ${turnsLeft} turns, range=1\n`;
            }
        }

        // Your status
        const yourInfo = `\nYOU ARE PLAYER ${playerId}:\n`;
        const yourStatus = `Position: (${player.x}, ${player.y})\n`;
        const yourBomb = player.hasBomb ? 'You have a bomb placed - cannot place another until it explodes\n' : 'You can place a bomb\n';
        const yourScore = `Score: ${player.score}\n`;

        const fullDescription = gridStr + playersInfo + bombsInfo + yourInfo + yourStatus + yourBomb + yourScore;
        return fullDescription;
    }

    // Call Groq API to get AI move
    async getAIMove(gameState, playerId) {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return null;
        }

        const gameDescription = this.generateGameStateDescription(gameState, playerId);
        const playerStrategy = this.prompts[playerId] || 'You are a Bomberman AI player. Make smart moves to survive and win.';

        const userPrompt = `${gameDescription}

YOUR STRATEGY:
${playerStrategy}

Now choose your action (JSON only):`;

        try {
            console.log(`[AI P${playerId}] Sending request to ${this.model}`);
            console.log(`[AI P${playerId}] User prompt length: ${userPrompt.length} chars`);

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
                    temperature: 0.7,
                    max_tokens: 100
                })
            });

            console.log(`[AI P${playerId}] Response status: ${response.status}`);

            if (!response.ok) {
                const error = await response.text();
                console.error(`[AI P${playerId}] API error ${response.status}:`, error);
                throw new Error(`API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            console.log(`[AI P${playerId}] Raw response:`, content);

            // Parse JSON response - SUPER PERMISSIVE parsing
            const jsonMatch = content.match(/\{[^}]+\}/);
            if (!jsonMatch) {
                console.log(`[AI P${playerId}] No JSON found, using random move`);
                return this.getRandomMove(gameState, playerId);
            }

            let move;
            try {
                move = JSON.parse(jsonMatch[0]);
            } catch (e) {
                // Try to fix common JSON errors (single quotes)
                try {
                    const fixed = jsonMatch[0].replace(/'/g, '"');
                    move = JSON.parse(fixed);
                } catch (e2) {
                    console.log(`[AI P${playerId}] JSON parse failed, using random move`);
                    return this.getRandomMove(gameState, playerId);
                }
            }

            console.log(`[AI P${playerId}] Parsed move:`, move);

            // SUPER PERMISSIVE keyword search - look for direction and bomb keywords anywhere
            const contentLower = JSON.stringify(move).toLowerCase();
            let direction = null;

            // Search for direction keywords (case-insensitive) - prioritize full words
            if (contentLower.includes('up')) direction = 'up';
            else if (contentLower.includes('down')) direction = 'down';
            else if (contentLower.includes('left')) direction = 'left';
            else if (contentLower.includes('right')) direction = 'right';

            // Search for bomb keyword - if "bomb" appears anywhere, drop a bomb
            let dropBomb = false;
            if (contentLower.includes('bomb') || contentLower.includes('true')) {
                dropBomb = true;
            }

            // If no direction found, pick a VALID random direction
            if (!direction) {
                const player = gameState.players.find(p => p.id === playerId);
                const validDirections = [];

                // Check each direction for validity
                const checkDir = [
                    {name: 'up', dx: 0, dy: -1},
                    {name: 'down', dx: 0, dy: 1},
                    {name: 'left', dx: -1, dy: 0},
                    {name: 'right', dx: 1, dy: 0}
                ];

                for (const d of checkDir) {
                    const newX = player.x + d.dx;
                    const newY = player.y + d.dy;

                    // Check bounds
                    if (newX >= 0 && newX < 13 && newY >= 0 && newY < 11) {
                        const cell = gameState.grid[newY][newX];
                        // Valid if empty, soft block, or bomb (can pass through)
                        if (cell === 0 || cell === 1 || (typeof cell === 'string' && cell.startsWith('bomb'))) {
                            validDirections.push(d.name);
                        }
                    }
                }

                // Pick random from valid directions, or any direction if none valid
                if (validDirections.length > 0) {
                    direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                    console.log(`[AI P${playerId}] No direction found, randomized from valid: ${direction}`);
                } else {
                    const allDirs = ['up', 'down', 'left', 'right'];
                    direction = allDirs[Math.floor(Math.random() * 4)];
                    console.log(`[AI P${playerId}] No valid moves, picked random: ${direction}`);
                }
            }

            console.log(`[AI P${playerId}] Extracted: direction=${direction}, dropBomb=${dropBomb}`);
            return {
                action: 'move',
                direction: direction,
                dropBomb: dropBomb
            };

        } catch (error) {
            console.error(`[AI P${playerId}] Exception:`, error);
            // Fallback to random move
            console.log(`[AI P${playerId}] Using random move fallback`);
            return this.getRandomMove(gameState, playerId);
        }
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
