// AI.js - Groq Cloud API integration for AI players

class AIController {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'gpt-oss-20b';
        this.prompts = {
            1: '',
            2: '',
            3: '',
            4: ''
        };
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
                bombsInfo += `Bomb ${b.playerId}: pos=(${b.x},${b.y}) explodes in ${timeLeft}s range=2\n`;
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
        const systemPrompt = this.prompts[playerId] || 'You are a Bomberman AI player. Make smart moves to survive and win.';

        const userPrompt = `${gameDescription}

RULES:
- You can move UP, DOWN, LEFT, or RIGHT (one cell at a time)
- You can place a BOMB at your current position
- You can only have ONE bomb active at a time
- Bombs explode after 3 seconds with range of 2 cells
- Avoid bomb explosions or you die
- Destroy soft blocks (#) for points
- Eliminate other players for points

RESPOND WITH JSON ONLY:
Valid actions:
{"action": "move", "direction": "up"}
{"action": "move", "direction": "down"}
{"action": "move", "direction": "left"}
{"action": "move", "direction": "right"}
{"action": "bomb"}

Your move:`;

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
                        { role: 'system', content: systemPrompt },
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
