// AI.js - OpenAI API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4.1';
        this.prompts = {}; // Dynamic prompts for all players
        this.defaultPrompts = {
            1: 'You are Player 1 (cyan). EXPLORER: Move toward center (G6). Use your 7x7 vision to find soft blocks. Remember: 3 rounds per bomb is plenty of escape time!',
            2: 'You are Player 2 (magenta). AGGRESSIVE: Push toward center, destroy blocks, pressure opponents. Check VALID MOVES and DANGER ANALYSIS. Adapt each round!',
            3: 'You are Player 3 (yellow). DEFENSIVE: Stay safe, clear blocks methodically. Use DANGER ANALYSIS. Plan escape routes. Don\'t rush - 3 rounds is enough time!',
            4: 'You are Player 4 (green). TACTICAL: Balance risk/reward. Check timing info. Use 7x7 vision to plan 2-3 moves ahead. Control center territory!'
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
3. DESTROY BLOCKS - Soft blocks (#) give +10 points when destroyed
4. ELIMINATE - Trap opponents for +100 points

GAME RULES:
- You see a 7x7 grid centered on your position (limited vision)
- Grid uses chess notation: columns A-M, rows 1-11 (11=top, 1=bottom)
- You start in a corner, IMMEDIATELY MOVE toward center (G6)
- You CAN walk through: empty spaces (.), bombs (💣), and other players
- You CANNOT walk through: soft blocks (#) or hard blocks (X) - they block movement!
- ⚠️ IMPORTANT: You can only have ONE bomb active at a time! Check "can place bomb" status

⏰ CRITICAL TIMING RULES:
- 1 ROUND = all 4 players move once (not individual turns!)
- Bombs explode after 3 ROUNDS (plenty of time to escape)
- Bomb countdown shows: 💥💥💥 = 3 rounds left, 💥💥__ = 2 rounds left, etc.
- Each bomb destroys 1 tile in all 4 directions (up/down/left/right)
- Soft blocks (#) stop the explosion but get destroyed (+10 points to bomb owner)

DECISION PROCESS (follow this order):
1. Check if you already "has bomb placed" - if YES, DON'T try to drop another!
2. Check "✅ VALID MOVES" - which directions are legal? (soft blocks # are NOT walkable!)
3. Check "⏰ GAME TIMING" - what round is it? How many rounds until bombs explode?
4. Check "🚨 DANGER ANALYSIS" - is your current position safe?
5. If current position shows "💀 LETHAL", you MUST move to a SAFE square
6. ONLY choose moves that are both VALID and SAFE
7. If no safe moves exist, you're trapped - choose least bad option

STRATEGIC PLAY (CRITICAL):
- FIRST 1-2 MOVES: Get off the starting corner (move 1-2 steps away)
- THEN START BOMBING: If you see soft blocks nearby and can escape, DROP BOMB!
- You have 3 FULL ROUNDS to escape - that's plenty of time to move 2-3 tiles away
- Drop bombs early and often to score points and clear paths
- After dropping bomb: Move to safety, avoid dead ends
- Use your 7x7 vision to plan moves ahead
- Review your previous thought to avoid repeating mistakes
- Don't waste moves trying to place bombs when you already have one active!

BOMB PLACEMENT STRATEGY:
✅ GOOD: Drop bomb when 2+ soft blocks adjacent AND you have clear escape path
✅ GOOD: Drop bomb in position where blast will hit multiple blocks
❌ BAD: Drop bomb with no escape route (you'll die!)
❌ BAD: Drop bomb when you already have one active (wastes turn!)
❌ BAD: Drop bomb in corner or dead end

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "direction": "up" | "down" | "left" | "right",
  "dropBomb": true | false,
  "thought": "Your strategic plan in 50 words or less"
}

EXAMPLES:
{"direction": "right", "dropBomb": false, "thought": "In corner A11. Moving right to B11, one step off edge."}
{"direction": "up", "dropBomb": true, "thought": "At B11, off corner. 2 soft blocks adjacent! Dropping bomb for 20 points, moving up to B10. Can escape up/right for 3 rounds."}
{"direction": "down", "dropBomb": false, "thought": "Bomb active! Moving down to escape blast. Will bomb again once this explodes."}
{"direction": "left", "dropBomb": false, "thought": "Bomb explodes in 1 round! Position LETHAL. Escaping left to safety."}

MEMORY:
Your previous thought is shown each turn - USE IT to maintain continuity and adapt your strategy!

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
            localStorage.removeItem(`player_${i}_memory`);
        }
    }

    // Convert grid coordinates (x,y) to chess notation (e.g., C5)
    coordsToChess(x, y) {
        const file = String.fromCharCode(65 + x); // A=65 in ASCII
        const rank = 11 - y; // Invert y: y=0 is rank 11, y=10 is rank 1
        return `${file}${rank}`;
    }

    // Generate 7x7 limited vision grid centered on player
    generate7x7Grid(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        const VISION_RADIUS = 3; // 3 tiles in each direction = 7x7 grid
        let gridStr = 'LIMITED VISION (7x7 grid centered on you):\n';
        gridStr += '   ';

        // Column headers
        for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
            const x = player.x + dx;
            if (x >= 0 && x < 13) {
                gridStr += String.fromCharCode(65 + x) + '  ';
            } else {
                gridStr += '   '; // Out of bounds
            }
        }
        gridStr += '\n';

        // Grid rows
        for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
            const y = player.y + dy;
            const rank = (y >= 0 && y < 11) ? (11 - y) : '  ';
            gridStr += rank.toString().padStart(2, ' ') + ' ';

            for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
                const x = player.x + dx;

                // Out of bounds
                if (x < 0 || x >= 13 || y < 0 || y >= 11) {
                    gridStr += '   ';
                    continue;
                }

                const cell = gameState.grid[y][x];

                // Check if this is the current player
                if (x === player.x && y === player.y) {
                    gridStr += '@@  '; // YOU ARE HERE
                    continue;
                }

                // Check if any other player is at this position
                const playerHere = gameState.players.find(p => p.alive && p.x === x && p.y === y);
                if (playerHere) {
                    gridStr += 'P' + playerHere.id + ' ';
                    continue;
                }

                // Check if bomb is here
                const bombHere = gameState.bombs.find(b => b.x === x && b.y === y);
                if (bombHere) {
                    const roundsLeft = bombHere.roundsUntilExplode;
                    gridStr += 'B' + roundsLeft + ' '; // Show rounds until explosion
                    continue;
                }

                // Cell type
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

        gridStr += '\nLegend:\n';
        gridStr += ' @@ = YOU  P1-P4 = players  B1-B3 = bomb (number = rounds until explosion)\n';
        gridStr += ' . = empty  # = soft block (walk through, destroyable)  X = hard block (impassable)\n\n';

        return gridStr;
    }

    // Generate game state description for LLM with danger analysis
    generateGameStateDescription(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        // Use 7x7 limited vision grid
        const gridStr = this.generate7x7Grid(gameState, playerId, game);

        // Player info
        let playersInfo = 'PLAYERS:\n';
        for (const p of gameState.players) {
            const status = p.alive ? 'ALIVE' : 'DEAD';
            const hasBomb = p.hasBomb ? 'has bomb placed' : 'can place bomb';
            const pos = this.coordsToChess(p.x, p.y);
            playersInfo += `Player ${p.id} (${p.color}): pos=${pos} ${status} score=${p.score} ${hasBomb}\n`;
        }

        // Bomb info with visual countdown
        let bombsInfo = '\n💣 ACTIVE BOMBS:\n';
        if (gameState.bombs.length === 0) {
            bombsInfo += 'None - no active bombs on the board\n';
        } else {
            for (const b of gameState.bombs) {
                const roundsLeft = b.roundsUntilExplode;
                const pos = this.coordsToChess(b.x, b.y);
                const countdown = '💥'.repeat(roundsLeft) + '__'.repeat(Math.max(0, 3 - roundsLeft));
                bombsInfo += `  Bomb by P${b.playerId} at ${pos}: ${countdown} (${roundsLeft} rounds until explosion)\n`;
                bombsInfo += `    Will destroy: 1 tile in all 4 directions (up/down/left/right)\n`;
            }
        }

        // Game timing info
        let timingInfo = '\n⏰ GAME TIMING (IMPORTANT):\n';
        timingInfo += '  - Current round: ' + gameState.roundCount + '\n';
        timingInfo += '  - 1 ROUND = all 4 players move once\n';
        timingInfo += '  - Bombs explode after 3 rounds (not turns!)\n';
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

        // Previous thought/plan
        const previousThought = this.getPlayerMemory(playerId);
        let memoryInfo = `\n💭 YOUR PREVIOUS THOUGHT:\n"${previousThought}"\n`;
        memoryInfo += '⚡ UPDATE your thought based on new game state - don\'t repeat it! Adjust your strategy as the situation changes.\n';

        const fullDescription = gridStr + playersInfo + bombsInfo + timingInfo + validMovesInfo + dangerInfo + yourInfo + yourStatus + yourBomb + yourScore + blocksInfo + strategyHint + memoryInfo;
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
