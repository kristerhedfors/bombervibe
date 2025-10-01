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

YOUR ACTIONS (choose ONE per turn):
1. MOVE: Go up/down/left/right one square
2. BOMB: Place a bomb at your current position

MOVEMENT:
- You can move to adjacent squares (up, down, left, right)
- You CANNOT move through hard blocks (🗿)
- You CAN move through soft blocks (🌳), bombs (💣), and other players
- Moving off the grid edge is invalid
- IMPORTANT: You can move away from bombs! Drop bomb then move away immediately

BOMB MECHANICS:
- Each player can have only ONE active bomb at a time
- Bombs explode after 3 seconds automatically
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
- Drop bomb then MOVE AWAY immediately - you can walk through bombs!
- Trap opponents between bombs and walls
- Clear soft blocks to create escape routes
- Watch bomb timers to avoid your own explosions
- Corner opponents when they have a bomb active
- Control center area for tactical advantage
- With 3 second timers, you have 3 turns to escape (move at least 2 tiles away)

WINNING:
- Last player alive wins automatically
- If time runs out, highest score wins
- Being strategic > being aggressive

YOU MUST RESPOND WITH VALID JSON:
{"action": "move", "direction": "up"}
{"action": "move", "direction": "down"}
{"action": "move", "direction": "left"}
{"action": "move", "direction": "right"}
{"action": "bomb"}

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
                const timeLeft = (b.timeLeft / 1000).toFixed(1);
                bombsInfo += `Bomb ${b.playerId}: pos=(${b.x},${b.y}) explodes in ${timeLeft}s range=1\n`;
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

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();

            // Parse JSON response
            const jsonMatch = content.match(/\{[^}]+\}/);
            if (!jsonMatch) {
                console.error('No JSON found in response:', content);
                return this.getRandomMove(gameState, playerId);
            }

            const move = JSON.parse(jsonMatch[0]);

            // Validate move
            if (move.action === 'move' && ['up', 'down', 'left', 'right'].includes(move.direction)) {
                return move;
            } else if (move.action === 'bomb') {
                return move;
            }

            console.error('Invalid move format:', move);
            return this.getRandomMove(gameState, playerId);

        } catch (error) {
            console.error('AI move error:', error);
            // Fallback to random move
            return this.getRandomMove(gameState, playerId);
        }
    }

    // Fallback: generate random valid move
    getRandomMove(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) return null;

        const moves = [];

        // Check possible moves
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            // Check if valid
            if (x >= 0 && x < 13 && y >= 0 && y < 11) {
                const cell = gameState.grid[y][x];
                if (cell === 0 || (typeof cell === 'string' && cell.startsWith('bomb'))) {
                    moves.push({ action: 'move', direction: dir });
                }
            }
        }

        // Can place bomb?
        if (!player.hasBomb) {
            moves.push({ action: 'bomb' });
        }

        // Random choice
        if (moves.length > 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // No valid moves - stay in place
        return { action: 'move', direction: 'up' }; // Will fail but safe
    }
}
