// AI.js - OpenAI API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiProvider = null; // 'openai' or 'groq'
        this.apiUrl = null;
        this.tacticalModel = null;
        this.memoryModel = null;
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
        return `ELECTRIC BOOGALOO - AI Bomberman

RULES:
• Grid: 13x11, chess notation (A-M cols, 1-11 rows), 11x11 vision
• Walk through: empty (·), bombs (💣), players | BLOCKED by: soft (🟫), hard (⬛)
• ONE bomb at a time (💣0=can place, 💣1=already placed)
• Bombs: Explode after 4 ROUNDS in + pattern (cardinal only, NOT diagonal)
• Range: 1 base, +1 per Flash Radius (⚡) loot pickup
• Scoring: +10 per 🟫 destroyed, +100 per kill
• 1 ROUND = all 4 players move once

CRITICAL - BOMB MECHANICS:
1. Bombs drop at YOUR CURRENT POSITION, then you move (or stay)
2. "Breakable: 1 (up)" means soft block is UP from you - bomb will hit it from HERE
3. After dropping bomb, move to EMPTY space (or stay if safe!)
4. Example: At A2 with "Breakable: 1 (up)", block is at A3
   - ✅ CORRECT: dropBomb:true + direction:"down" (escape to A1)
   - ✅ CORRECT: dropBomb:true + direction:"stay" (if current position safe for 4 rounds)
   - ❌ WRONG: dropBomb:true + direction:"up" (BLOCKED by soft block at A3!)

SURVIVAL:
• DIAGONAL = SAFE from bombs (only cardinal directions lethal)
• If bomb at C5: C4/C6/B5/D5 = DEATH, D6/B4/D4/B6 = SAFE
• Higher range = escape further! Range 2 = 2 tiles, Range 3 = 3 tiles

STRATEGY:
1. Check DANGER - if lethal, pick SAFE move from list
2. Check LOOT (⚡) - move toward it if nearby
3. Check "Breakable: N (directions)" - these show ADJACENT soft blocks
4. To bomb adjacent block: dropBomb:true + move to DIFFERENT EMPTY direction (or stay if safe)
5. Check VALID MOVES - only these directions are legal
6. You can stand still ("stay") to drop a bomb without moving or to wait

BOMB PLACEMENT:
✅ Drop when: "Breakable: N (dir1,dir2)" shows blocks + you move/stay safe + 💣0
✅ Stand still: direction:"stay" to drop bomb at current position or just wait
❌ WRONG: Trying to move INTO the soft block direction
❌ WRONG: No breakable blocks nearby
❌ WRONG: Already have bomb (💣1)

RESPONSE (JSON):
{
  "direction": "up|down|left|right|stay",
  "dropBomb": true|false,
  "thought": "Why this move (50 words max)"
}`;
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

        // Detect API provider by key prefix
        if (key.startsWith('gsk_')) {
            this.apiProvider = 'groq';
            this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
            this.tacticalModel = 'moonshotai/kimi-k2-instruct-0905';
            this.memoryModel = 'moonshotai/kimi-k2-instruct-0905';
            console.log('[AI] Detected Groq Cloud API key - using Kimi K2 model');
        } else if (key.startsWith('sk-')) {
            this.apiProvider = 'openai';
            this.apiUrl = 'https://api.openai.com/v1/chat/completions';
            this.tacticalModel = 'gpt-4.1-mini';
            this.memoryModel = 'gpt-4.1-mini';
            console.log('[AI] Detected OpenAI API key - using GPT-4.1-mini model');
        } else {
            // Default to OpenAI for unknown prefixes
            this.apiProvider = 'openai';
            this.apiUrl = 'https://api.openai.com/v1/chat/completions';
            this.tacticalModel = 'gpt-4.1-mini';
            this.memoryModel = 'gpt-4.1-mini';
            console.log('[AI] Unknown API key format - defaulting to OpenAI');
        }

        localStorage.setItem('openai_api_key', key);
    }

    loadApiKey() {
        const stored = localStorage.getItem('openai_api_key');
        if (stored) {
            this.setApiKey(stored); // Use setApiKey to properly detect provider
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
        let gridStr = '## 7x7 VISION:\n\n';

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

        gridStr += '\n**Legend:** 🎯=YOU | P1-P4=Players | 💣=Bomb+rounds | ⚡=Loot | ·=Empty | 🟫=Soft | ⬛=Hard\n\n';

        // Add natural language summary
        gridStr += this.generateLocalSummary(gameState, playerId);

        return gridStr;
    }

    // Generate natural language summary of local area
    generateLocalSummary(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return '';

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

        let summary = '**Breakable blocks ADJACENT to you:** ';
        if (adjacentBlocks.length === 0) {
            summary += 'None (don\'t drop bomb here!)\n';
        } else {
            summary += `${adjacentBlocks.length} at: ${adjacentBlocks.join(',')}`;
            summary += '\n⚠️ To bomb them: dropBomb:true + move to DIFFERENT empty direction!\n';
        }

        return summary;
    }

    // Generate game state description for LLM with danger analysis
    generateGameStateDescription(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        // Use 7x7 limited vision grid
        const gridStr = this.generate7x7Grid(gameState, playerId);

        // Player info (compact)
        let playersInfo = 'PLAYERS: ';
        const playerStats = gameState.players.map(p => {
            const status = p.alive ? '✅' : '💀';
            const bomb = p.hasBomb ? '💣1' : '💣0';
            return `P${p.id}:${this.coordsToChess(p.x, p.y)}:${p.score}:${bomb}:${status}`;
        });
        playersInfo += playerStats.join(' | ') + '\n';

        // Bomb info (compact)
        let bombsInfo = '\nBOMBS: ';
        if (gameState.bombs.length === 0) {
            bombsInfo += 'None\n';
        } else {
            const bombStats = gameState.bombs.map(b => {
                const rounds = b.roundsUntilExplode !== undefined ? b.roundsUntilExplode : '?';
                return `P${b.playerId}@${this.coordsToChess(b.x, b.y)}:${rounds}r:R${b.range||1}`;
            });
            bombsInfo += bombStats.join(' | ') + '\n';
        }

        // Loot info (compact)
        let lootInfo = '\nLOOT: ';
        if (!gameState.loot || gameState.loot.length === 0) {
            lootInfo += 'None\n';
        } else {
            const lootStats = gameState.loot.map(l => `⚡${this.coordsToChess(l.x, l.y)}`);
            lootInfo += lootStats.join(' | ') + '\n';
        }

        // Round counter
        let roundInfo = `\nROUND: ${gameState.roundCount}\n`;

        // VALID MOVES (compact)
        let validMovesInfo = '\nVALID MOVES: ';
        const directions = ['up', 'down', 'left', 'right', 'stay'];
        const validMoves = [];
        const blockedMoves = [];

        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;
            // 'stay' keeps x,y unchanged

            const destPos = this.coordsToChess(x, y);

            // 'stay' is always valid
            if (dir === 'stay') {
                validMoves.push(`stay@${destPos}`);
                continue;
            }

            if (x < 0 || x >= 13 || y < 0 || y >= 11) {
                blockedMoves.push(`${dir}:OOB`);
                continue;
            }

            const cell = gameState.grid[y][x];
            let passable = false;

            if (cell === 0) {
                passable = true;
            } else if (cell === 1) {
                passable = false; // BLOCKED by soft
            } else if (cell === 2) {
                passable = false; // BLOCKED by hard
            } else if (typeof cell === 'string' && cell.startsWith('bomb')) {
                passable = true; // Can walk through bombs
            }

            const playerHere = gameState.players.find(p => p.alive && p.x === x && p.y === y);
            if (playerHere && cell === 0) {
                passable = true;
            }

            if (passable) {
                validMoves.push(`${dir}→${destPos}`);
            } else {
                const reason = cell === 1 ? 'soft' : cell === 2 ? 'hard' : '?';
                blockedMoves.push(`${dir}:${reason}`);
            }
        }

        validMovesInfo += validMoves.length > 0 ? validMoves.join(',') : 'NONE';
        if (blockedMoves.length > 0) {
            validMovesInfo += ` | BLOCKED: ${blockedMoves.join(',')}`;
        }
        validMovesInfo += '\n';

        // Danger analysis (compact)
        const safeMoves = game.getSafeMoves(playerId);
        const dangerousMoves = game.getDangerousMoves(playerId);
        const currentlySafe = !game.isPositionLethal(player.x, player.y, 1);

        const currentPos = this.coordsToChess(player.x, player.y);
        let dangerInfo = `\nDANGER: Current ${currentPos} is ${currentlySafe ? '✅SAFE' : '💀LETHAL'}\n`;

        if (safeMoves.length > 0) {
            const safeDirs = safeMoves.map(m => `${m.direction}→${this.coordsToChess(m.x, m.y)}`);
            dangerInfo += `SAFE: ${safeDirs.join(',')}`;
        } else {
            dangerInfo += 'SAFE: NONE!';
        }

        if (dangerousMoves.length > 0) {
            const lethalDirs = dangerousMoves.map(m => `${m.direction}→${this.coordsToChess(m.x, m.y)}`);
            dangerInfo += ` | LETHAL: ${lethalDirs.join(',')}`;
        }
        dangerInfo += '\n';

        // Your status (compact)
        const bombStatus = player.hasBomb ? '💣1' : '💣0';
        const bombRange = player.bombRange || 1;
        let yourInfo = `\nYOU (P${playerId}): ${currentPos} | Score:${player.score} | Bomb:${bombStatus} | Range:${bombRange}\n`;

        // Previous memory
        const previousMemory = this.getPlayerMemory(playerId);
        let memoryInfo = `\nMEMORY: "${previousMemory}"\n`;

        const fullDescription = gridStr + playersInfo + bombsInfo + lootInfo + roundInfo + validMovesInfo + dangerInfo + yourInfo + memoryInfo;
        return fullDescription;
    }

    // Get JSON schema for tactical move (no memory)
    getTacticalResponseFormat() {
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
                            enum: ["up", "down", "left", "right", "stay"],
                            description: "Direction to move or stay in place"
                        },
                        dropBomb: {
                            type: "boolean",
                            description: "Whether to drop a bomb at current position before moving/staying"
                        },
                        thought: {
                            type: "string",
                            description: "Your tactical reasoning for THIS specific move (max 50 words)"
                        }
                    },
                    required: ["direction", "dropBomb", "thought"],
                    additionalProperties: false
                }
            }
        };
    }

    // Get JSON schema for memory update
    getMemoryResponseFormat() {
        return {
            type: "json_schema",
            json_schema: {
                name: "memory_update",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        memory: {
                            type: "string",
                            description: "Operational notes for next turn: key patterns, threats, opportunities (max 50 words)"
                        }
                    },
                    required: ["memory"],
                    additionalProperties: false
                }
            }
        };
    }

    // Update player memory using smaller model with focused prompt
    async updatePlayerMemory(gameState, playerId, moveResult) {
        if (!this.apiKey) {
            return;
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return;
        }

        const pos = this.coordsToChess(player.x, player.y);

        // Count nearby resources
        let nearbyBlocks = 0;
        let nearbyLoot = 0;
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
        if (gameState.loot) {
            for (const loot of gameState.loot) {
                const dist = Math.abs(loot.x - player.x) + Math.abs(loot.y - player.y);
                if (dist <= searchRadius) {
                    nearbyLoot++;
                }
            }
        }

        // Compact situation summary for memory update
        const situationSummary = `Position: ${pos}
Round: ${gameState.roundCount}
Bomb Range: ${player.bombRange || 1}
Has Bomb: ${player.hasBomb ? 'Yes' : 'No'}
Nearby Blocks: ${nearbyBlocks}
Nearby Loot: ${nearbyLoot}
Active Bombs: ${gameState.bombs.length}
Last Move: ${moveResult.direction}${moveResult.dropBomb ? ' + bomb' : ''}
Last Thought: ${moveResult.thought}`;

        const memoryPrompt = `Summarize key operational notes for next turn (max 50 words):

${situationSummary}

Respond with JSON: {"memory":"your notes here"}`;

        try {
            console.log(`[Memory P${playerId}] Updating memory with ${this.memoryModel} (${this.apiProvider})`);

            const requestBody = {
                model: this.memoryModel,
                messages: [
                    { role: 'user', content: memoryPrompt }
                ],
                temperature: 0.3,
                max_tokens: 100,
                response_format: { type: "json_object" }
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                console.error(`[Memory P${playerId}] API error ${response.status}`);
                return;
            }

            const data = await response.json();
            const content = JSON.parse(data.choices[0].message.content);

            if (content.memory) {
                this.savePlayerMemory(playerId, content.memory);
                console.log(`[Memory P${playerId}] Updated: "${content.memory}"`);
            }

        } catch (error) {
            console.error(`[Memory P${playerId}] Failed to update memory:`, error);
        }
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
        const playerStrategy = this.prompts[playerId] || 'Make smart moves to survive and win.';

        const userPrompt = `${gameDescription}
STRATEGY: ${playerStrategy}

Respond with JSON: {"direction":"up|down|left|right|stay","dropBomb":true|false,"thought":"why (50 words max)"}`;

        try {
            console.log(`[AI P${playerId}] Sending tactical request to ${this.tacticalModel} (${this.apiProvider})`);

            // Log full prompt for analysis (only for first 3 rounds to reduce clutter)
            if (gameState.roundCount <= 3) {
                console.log(`\n[AI P${playerId}] === SYSTEM PROMPT ===\n${this.systemPrompt}\n=== END SYSTEM PROMPT ===`);
            }
            console.log(`[AI P${playerId}] === USER PROMPT ===\n${userPrompt}\n=== END USER PROMPT ===`);

            const requestBody = {
                model: this.tacticalModel,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 200
            };

            // Only add structured output for OpenAI (Groq doesn't support json_schema)
            if (this.apiProvider === 'openai') {
                requestBody.response_format = this.getTacticalResponseFormat();
            } else {
                // For Groq, use simple JSON mode
                requestBody.response_format = { type: "json_object" };
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
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
            if (!['up', 'down', 'left', 'right', 'stay'].includes(move.direction)) {
                console.log(`[AI P${playerId}] Invalid direction: ${move.direction}, using random move`);
                return this.getRandomMove(gameState, playerId);
            }

            // Save thought (tactical reasoning) for UI display
            if (move.thought) {
                this.playerThoughts[playerId] = move.thought;
                console.log(`[AI P${playerId}] Thought: "${move.thought}"`);
            }

            console.log(`[AI P${playerId}] Move: ${move.direction}, dropBomb: ${move.dropBomb}`);

            const moveResult = {
                action: 'move',
                direction: move.direction,
                dropBomb: move.dropBomb,
                thought: move.thought || '' // Pass thought to UI for display
            };

            // Asynchronously update memory using smaller model (don't wait for it)
            this.updatePlayerMemory(gameState, playerId, moveResult).catch(err => {
                console.error(`[Memory P${playerId}] Background update failed:`, err);
            });

            return moveResult;

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
            return { action: 'move', direction: 'stay', dropBomb: false };
        }

        const safeMoves = [];  // Moves that don't go onto a bomb
        const validMoves = []; // All valid moves (including onto bombs)

        // Check all 5 directions (including stay)
        const directions = ['up', 'down', 'left', 'right', 'stay'];
        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;
            // 'stay' keeps x,y unchanged

            // 'stay' is always valid
            if (dir === 'stay') {
                const move = { action: 'move', direction: dir, dropBomb: !player.hasBomb && Math.random() > 0.7 };
                validMoves.push(move);
                safeMoves.push(move);
                continue;
            }

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

        // No valid moves - default to stay
        console.log(`[AI P${playerId}] Random move: no valid moves at all, defaulting to stay`);
        return {
            action: 'move',
            direction: 'stay',
            dropBomb: false
        };
    }
}
