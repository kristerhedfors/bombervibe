// AI.js - OpenAI API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4o-mini';
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
- Survive longer than other players (TOP PRIORITY!)
- Eliminate opponents by trapping them in bomb explosions
- Destroy soft blocks for points
- Win by being the last player alive or having the highest score

GAME RULES:
- 13x11 grid (coordinates: x=0-12, y=0-10)
- 4 players compete simultaneously
- Turn-based: each player makes ONE move per turn sequentially
- Bombs explode after 10 TURNS with 1-tile blast radius in all directions

CRITICAL SURVIVAL RULES:
- YOU WILL RECEIVE CLEAR DANGER ANALYSIS showing which moves are SAFE vs LETHAL
- ALWAYS prioritize SAFE moves over LETHAL moves
- If current position is LETHAL, you MUST move immediately
- NEVER choose a move marked as "💀 LETHAL" unless absolutely necessary
- Always check "⚠️ ADJACENT BOMBS WARNING" section

FUNCTION CALLING:
You must use the provided functions to make your move. Available functions:
- move_up() - Move up (no bomb)
- move_down() - Move down (no bomb)
- move_left() - Move left (no bomb)
- move_right() - Move right (no bomb)
- move_up_with_bomb() - Move up AND drop bomb at current position
- move_down_with_bomb() - Move down AND drop bomb
- move_left_with_bomb() - Move left AND drop bomb
- move_right_with_bomb() - Move right AND drop bomb
- set_next_thought(thought: string) - Save your plan for next turn (MAX 50 words)

THOUGHT/MEMORY SYSTEM:
- ALWAYS call set_next_thought() to record your current plan/strategy
- Keep it under 50 words - be concise!
- Examples:
  * "Escaping south from my bomb, then circling back to trap Player 2"
  * "Moving to center area to control space and box in Player 3"
  * "Avoiding bombs, clearing blocks on east side for escape routes"
- Your previous thought will be shown to you each turn - use it to maintain strategy continuity

STRATEGY TIPS:
- PAY ATTENTION to the DANGER ANALYSIS - it tells you exactly which moves are safe!
- Drop bomb WHILE MOVING for no penalty
- Trap opponents between bombs and walls
- Reference your previous thought to follow through on plans
- Smart play: Drop bomb, move to safety, follow your plan

WINNING: Last player alive wins. Don't die!`;
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

        // Previous thought/plan
        const previousThought = this.getPlayerMemory(playerId);
        const memoryInfo = `\n💭 YOUR LAST THOUGHT/PLAN:\n"${previousThought}"\n`;

        const fullDescription = gridStr + playersInfo + bombsInfo + adjacentInfo + dangerInfo + yourInfo + yourStatus + yourBomb + yourScore + memoryInfo;
        return fullDescription;
    }

    // Define function calling tools for OpenAI API
    getFunctionTools() {
        return [
            {
                type: 'function',
                function: {
                    name: 'move_up',
                    description: 'Move up one tile (no bomb dropped)'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_down',
                    description: 'Move down one tile (no bomb dropped)'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_left',
                    description: 'Move left one tile (no bomb dropped)'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_right',
                    description: 'Move right one tile (no bomb dropped)'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_up_with_bomb',
                    description: 'Drop bomb at current position, then move up'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_down_with_bomb',
                    description: 'Drop bomb at current position, then move down'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_left_with_bomb',
                    description: 'Drop bomb at current position, then move left'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'move_right_with_bomb',
                    description: 'Drop bomb at current position, then move right'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'set_next_thought',
                    description: 'Save your thought/plan for the next turn (max 50 words)',
                    parameters: {
                        type: 'object',
                        properties: {
                            thought: {
                                type: 'string',
                                description: 'Your current plan or strategy (max 50 words)'
                            }
                        },
                        required: ['thought']
                    }
                }
            }
        ];
    }

    // Call OpenAI API to get AI move using function calling
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

Use the function calls to make your move. You MUST call one movement function (move_up, move_down, move_left, move_right, or their _with_bomb variants). You SHOULD also call set_next_thought to record your plan.`;

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
                    tools: this.getFunctionTools(),
                    tool_choice: 'auto',
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
            const message = data.choices[0].message;

            console.log(`[AI P${playerId}] Response:`, message);

            // Process function calls
            let direction = null;
            let dropBomb = false;
            let thought = null;

            if (message.tool_calls && message.tool_calls.length > 0) {
                for (const toolCall of message.tool_calls) {
                    const funcName = toolCall.function.name;
                    console.log(`[AI P${playerId}] Function called: ${funcName}`);

                    // Parse movement functions
                    if (funcName === 'move_up') {
                        direction = 'up';
                    } else if (funcName === 'move_down') {
                        direction = 'down';
                    } else if (funcName === 'move_left') {
                        direction = 'left';
                    } else if (funcName === 'move_right') {
                        direction = 'right';
                    } else if (funcName === 'move_up_with_bomb') {
                        direction = 'up';
                        dropBomb = true;
                    } else if (funcName === 'move_down_with_bomb') {
                        direction = 'down';
                        dropBomb = true;
                    } else if (funcName === 'move_left_with_bomb') {
                        direction = 'left';
                        dropBomb = true;
                    } else if (funcName === 'move_right_with_bomb') {
                        direction = 'right';
                        dropBomb = true;
                    } else if (funcName === 'set_next_thought') {
                        // Parse arguments
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            thought = args.thought;
                        } catch (e) {
                            console.warn(`[AI P${playerId}] Failed to parse thought arguments`);
                        }
                    }
                }
            }

            // Save thought if provided
            if (thought) {
                this.savePlayerMemory(playerId, thought);
                console.log(`[AI P${playerId}] Saved thought: "${thought}"`);
            }

            // If we got a valid direction, return it
            if (direction) {
                console.log(`[AI P${playerId}] Move: ${direction}, dropBomb: ${dropBomb}`);
                return {
                    action: 'move',
                    direction: direction,
                    dropBomb: dropBomb
                };
            }

            // No valid function call found - fallback
            console.log(`[AI P${playerId}] No valid move function called, using random move`);
            return this.getRandomMove(gameState, playerId);

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
