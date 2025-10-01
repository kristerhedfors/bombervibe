// AI.js - OpenAI API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4.1-mini';
        this.prompts = {
            1: '',
            2: '',
            3: '',
            4: ''
        };
        this.playerMemory = {
            1: '',
            2: '',
            3: '',
            4: ''
        };
        this.systemPrompt = this.getDefaultSystemPrompt();
        this.errorCallback = null; // Callback to show error modal
        this.loadPlayerMemories();
    }

    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    getDefaultSystemPrompt() {
        return `You are playing ELECTRIC BOOGALOO, an AI-powered Bomberman game.

GAME OBJECTIVE:
1. SURVIVE - Don't die to bombs (most important!)
2. EXPLORE - Move around the board, don't stay in corners
3. DESTROY BLOCKS - Soft blocks (#) give +10 points when destroyed
4. ELIMINATE - Trap opponents for +100 points

GAME RULES:
- 13x11 grid (x=0-12, y=0-10). You start in a corner, MOVE AWAY from edges!
- Bombs explode after 10 TURNS with 1-tile blast radius in all directions
- You can walk through soft blocks (#) and bombs (💣)
- Hard blocks (X) are indestructible and block movement

CRITICAL SURVIVAL RULES - READ CAREFULLY:
1. Check "🚨 DANGER ANALYSIS" section FIRST
2. If current position shows "💀 LETHAL", you WILL DIE if you don't move
3. ONLY choose moves marked "✅ SAFE"
4. If "⚠️ NO SAFE MOVES", you're trapped - try to minimize damage
5. NEVER move back to where you just were (causes repetitive behavior)

STRATEGIC PLAY:
- DON'T just move up/down repeatedly on the edge!
- EXPLORE toward the CENTER of the board (around x=6, y=5)
- DROP BOMBS near soft blocks (#) to destroy them for points
- After dropping a bomb, ENSURE you can escape to a safe position (not blocked)
- Use your previous thought to avoid repeating failed strategies

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "direction": "up" | "down" | "left" | "right",
  "dropBomb": true | false,
  "thought": "Your strategic plan in 50 words or less"
}

EXAMPLES:
{"direction": "right", "dropBomb": true, "thought": "Dropping bomb at corner (0,0), moving right to escape. Safe move to (1,0). Will circle back to trap Player 2."}
{"direction": "up", "dropBomb": false, "thought": "Moving toward center (6,5) to control territory and find soft blocks to destroy for points."}
{"direction": "down", "dropBomb": false, "thought": "Player 3 approaching from north. Moving south to avoid confrontation and position for counter-attack."}
{"direction": "left", "dropBomb": true, "thought": "Soft block cluster at (4,5). Dropping bomb then escaping left. Will destroy 3+ blocks for 30+ points."}

THOUGHT/MEMORY:
Your previous thought is shown each turn - USE IT to maintain continuity and avoid repeating the same move forever!

BOMB SAFETY:
If dropBomb is true, VERIFY your direction move leads to a position that:
1. Is not blocked by walls or hard blocks
2. Is not lethal (check DANGER ANALYSIS)
3. Allows you to escape the bomb's blast radius (1 tile in all directions)

WINNING: Last player alive. Play smart, explore the board, and don't get stuck in repetitive patterns!`;
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

    savePlayerMemory(playerId, thought) {
        // Limit to 50 words
        const words = thought.trim().split(/\s+/);
        const limited = words.slice(0, 50).join(' ');
        this.playerMemory[playerId] = limited;
        localStorage.setItem(`player_${playerId}_memory`, limited);
    }

    loadPlayerMemories() {
        for (let i = 1; i <= 4; i++) {
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
        for (let i = 1; i <= 4; i++) {
            this.playerMemory[i] = '';
            localStorage.removeItem(`player_${i}_memory`);
        }
    }

    // Generate game state description for LLM with danger analysis
    generateGameStateDescription(gameState, playerId, game) {
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

        // Adjacent bombs warning
        const adjacentBombs = game.getAdjacentBombs(player.x, player.y, 2);
        let adjacentInfo = '\n⚠️  ADJACENT BOMBS WARNING:\n';
        if (adjacentBombs.length === 0) {
            adjacentInfo += 'No bombs nearby - you are safe from immediate danger\n';
        } else {
            adjacentInfo += `${adjacentBombs.length} bomb(s) within 2 tiles of you:\n`;
            for (const bomb of adjacentBombs) {
                adjacentInfo += `  - Bomb at (${bomb.x},${bomb.y}) by Player ${bomb.playerId}: ${bomb.turnsLeft} turns left, ${bomb.distance} tiles away\n`;
            }
        }

        // Danger analysis
        const safeMoves = game.getSafeMoves(playerId);
        const dangerousMoves = game.getDangerousMoves(playerId);
        const currentlySafe = !game.isPositionLethal(player.x, player.y, 1);

        let dangerInfo = '\n🚨 DANGER ANALYSIS:\n';
        dangerInfo += `Current position (${player.x},${player.y}): ${currentlySafe ? '✅ SAFE' : '💀 LETHAL - YOU WILL DIE IF YOU STAY!'}\n\n`;

        dangerInfo += 'SAFE MOVES (will NOT kill you):\n';
        if (safeMoves.length === 0) {
            dangerInfo += '  ⚠️  NO SAFE MOVES AVAILABLE! All directions are lethal!\n';
        } else {
            for (const move of safeMoves) {
                dangerInfo += `  ✅ ${move.direction.toUpperCase()} to (${move.x},${move.y}) - SAFE\n`;
            }
        }

        dangerInfo += '\nLETHAL MOVES (will kill you next turn):\n';
        if (dangerousMoves.length === 0) {
            dangerInfo += '  None - all valid moves are safe\n';
        } else {
            for (const move of dangerousMoves) {
                dangerInfo += `  💀 ${move.direction.toUpperCase()} to (${move.x},${move.y}) - DEATH!\n`;
            }
        }

        // Your status
        const yourInfo = `\nYOU ARE PLAYER ${playerId}:\n`;
        const yourStatus = `Position: (${player.x}, ${player.y})\n`;
        const yourBomb = player.hasBomb ? 'You have a bomb placed - cannot place another until it explodes\n' : 'You can place a bomb\n';
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

        // Strategic recommendation
        let strategyHint = '\n💡 STRATEGIC HINT:\n';
        if (player.x <= 2 || player.x >= 10 || player.y <= 2 || player.y >= 8) {
            strategyHint += '⚠️ You are near the EDGE! Move toward CENTER (6,5) for better positioning.\n';
        } else {
            strategyHint += '✓ Good position. Look for soft blocks to destroy or opponents to trap.\n';
        }

        if (nearbyBlocks > 0 && !player.hasBomb) {
            strategyHint += `💣 ${nearbyBlocks} soft blocks nearby - consider dropping a bomb!\n`;
        }

        // Previous thought/plan
        const previousThought = this.getPlayerMemory(playerId);
        let memoryInfo = `\n💭 YOUR LAST THOUGHT/PLAN:\n"${previousThought}"\n`;
        memoryInfo += 'Use this to avoid repeating the same moves! If your plan isn\'t working, try something different.\n';

        const fullDescription = gridStr + playersInfo + bombsInfo + adjacentInfo + dangerInfo + yourInfo + yourStatus + yourBomb + yourScore + blocksInfo + strategyHint + memoryInfo;
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
                        thought: {
                            type: "string",
                            description: "Your strategic thought/plan for next turn (max 50 words)"
                        }
                    },
                    required: ["direction", "dropBomb", "thought"],
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

            // Save thought
            if (move.thought) {
                this.savePlayerMemory(playerId, move.thought);
                console.log(`[AI P${playerId}] Saved thought: "${move.thought}"`);
            }

            console.log(`[AI P${playerId}] Move: ${move.direction}, dropBomb: ${move.dropBomb}`);
            return {
                action: 'move',
                direction: move.direction,
                dropBomb: move.dropBomb
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
