// MockLLM.js - Fast deterministic LLM response simulation for testing
// Drop-in replacement for AIController with no API calls

class MockLLM {
    /**
     * Create mock LLM with configurable strategy
     * @param {string} strategy - 'random', 'aggressive', 'defensive', 'tactical', 'scripted'
     * @param {SeededRNG} rng - Seeded RNG for deterministic behavior
     * @param {Object} options - Additional options
     */
    constructor(strategy = 'tactical', rng = null, options = {}) {
        this.strategy = strategy;
        this.rng = rng || new SeededRNG(Date.now());
        this.options = options;

        // Track player memories for continuity
        this.playerMemory = {};
        this.playerThoughts = {};

        // Scripted move sequences (for testing specific scenarios)
        this.scriptedMoves = options.scriptedMoves || {}; // {playerId: [{direction, dropBomb}]}
        this.moveIndex = {}; // Track current index in scripted sequence per player

        // Response delay simulation (0 for instant in tests)
        this.responseDelay = options.responseDelay || 0;
    }

    /**
     * Get AI move - drop-in replacement for AIController.getAIMove()
     * @param {Object} gameState - Current game state
     * @param {number} playerId - Player ID
     * @param {Game} game - Game instance
     * @returns {Promise<Object>} Move decision
     */
    async getAIMove(gameState, playerId, game) {
        // Simulate response delay
        if (this.responseDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.responseDelay));
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return null;
        }

        let move;

        // Check if player has scripted moves
        if (this.scriptedMoves[playerId] && this.scriptedMoves[playerId].length > 0) {
            move = this.getScriptedMove(playerId);
        } else {
            // Generate move based on strategy
            switch (this.strategy) {
                case 'aggressive':
                    move = this.getAggressiveMove(gameState, playerId, game);
                    break;
                case 'defensive':
                    move = this.getDefensiveMove(gameState, playerId, game);
                    break;
                case 'tactical':
                    move = this.getTacticalMove(gameState, playerId, game);
                    break;
                case 'random':
                default:
                    move = this.getRandomMove(gameState, playerId, game);
                    break;
            }
        }

        // Store thought
        this.playerThoughts[playerId] = move.thought || '';

        return {
            action: 'move',
            direction: move.direction,
            dropBomb: move.dropBomb,
            thought: move.thought
        };
    }

    /**
     * Get all player moves in parallel - matches AIController interface
     * @param {Object} gameState - Current game state
     * @param {Game} game - Game instance
     * @returns {Promise<Object>} Map of playerId -> move
     */
    async getAllPlayerMoves(gameState, game) {
        const moves = {};
        for (const player of gameState.players) {
            if (player.alive) {
                moves[player.id] = await this.getAIMove(gameState, player.id, game);
            }
        }
        return moves;
    }

    /**
     * Get scripted move from pre-defined sequence
     * @param {number} playerId - Player ID
     * @returns {Object} Move
     */
    getScriptedMove(playerId) {
        if (!this.moveIndex[playerId]) {
            this.moveIndex[playerId] = 0;
        }

        const moves = this.scriptedMoves[playerId];
        const move = moves[this.moveIndex[playerId]];

        // Advance to next move (loop if at end)
        this.moveIndex[playerId] = (this.moveIndex[playerId] + 1) % moves.length;

        return {
            direction: move.direction || 'right',
            dropBomb: move.dropBomb || false,
            thought: move.thought || `Scripted move ${this.moveIndex[playerId]}`
        };
    }

    /**
     * Aggressive strategy - move toward center, drop bombs often
     */
    getAggressiveMove(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);
        const centerX = Math.floor(game.GRID_WIDTH / 2);
        const centerY = Math.floor(game.GRID_HEIGHT / 2);

        // Get safe moves
        const safeMoves = game.getSafeMoves(playerId);

        if (safeMoves.length === 0) {
            // Desperate - try any move
            return this.getRandomMove(gameState, playerId, game);
        }

        // Prefer moves toward center
        let bestMove = safeMoves[0];
        let bestDistance = Math.abs(bestMove.x - centerX) + Math.abs(bestMove.y - centerY);

        for (const move of safeMoves) {
            const distance = Math.abs(move.x - centerX) + Math.abs(move.y - centerY);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = move;
            }
        }

        // Drop bomb if blocks nearby and not already placed
        const dropBomb = !player.hasBomb && this.hasAdjacentBlocks(gameState, player, game);

        return {
            direction: bestMove.direction,
            dropBomb: dropBomb,
            thought: `AGGRESSIVE: Moving ${bestMove.direction} toward center${dropBomb ? ', dropping bomb' : ''}`
        };
    }

    /**
     * Defensive strategy - avoid danger, only bomb when very safe
     */
    getDefensiveMove(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);

        // Get safe moves
        const safeMoves = game.getSafeMoves(playerId);

        if (safeMoves.length === 0) {
            // Very dangerous - just try to survive
            return this.getRandomMove(gameState, playerId, game);
        }

        // Pick random safe move
        const move = this.rng.choice(safeMoves);

        // Only drop bomb if VERY safe (multiple escape routes) and blocks nearby
        const dropBomb = !player.hasBomb &&
                        safeMoves.length >= 3 &&
                        this.hasAdjacentBlocks(gameState, player, game);

        return {
            direction: move.direction,
            dropBomb: dropBomb,
            thought: `DEFENSIVE: Safe move ${move.direction}${dropBomb ? ', careful bomb placement' : ''}`
        };
    }

    /**
     * Tactical strategy - balance safety and aggression
     */
    getTacticalMove(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);

        // Check if current position is lethal
        const currentLethal = game.isPositionLethal(player.x, player.y, 1);

        if (currentLethal) {
            // ESCAPE MODE - find safe move immediately
            const safeMoves = game.getSafeMoves(playerId);
            if (safeMoves.length > 0) {
                const move = this.rng.choice(safeMoves);
                return {
                    direction: move.direction,
                    dropBomb: false,
                    thought: `ESCAPE: Current position lethal, moving ${move.direction}`
                };
            }
        }

        // Get safe moves
        const safeMoves = game.getSafeMoves(playerId);

        if (safeMoves.length === 0) {
            return this.getRandomMove(gameState, playerId, game);
        }

        // Check for loot nearby
        const nearbyLoot = this.findNearestLoot(gameState, player);
        if (nearbyLoot && nearbyLoot.distance <= 3) {
            // Try to move toward loot
            const moveTowardLoot = this.getMoveToward(player, nearbyLoot, safeMoves);
            if (moveTowardLoot) {
                return {
                    direction: moveTowardLoot.direction,
                    dropBomb: false,
                    thought: `TACTICAL: Moving toward loot at (${nearbyLoot.x},${nearbyLoot.y})`
                };
            }
        }

        // Check for blocks nearby and safe to bomb
        const hasBlocks = this.hasAdjacentBlocks(gameState, player, game);
        const canEscape = safeMoves.length >= 2;

        // Pick random safe move
        const move = this.rng.choice(safeMoves);

        // Drop bomb if conditions are good
        const dropBomb = !player.hasBomb && hasBlocks && canEscape && this.rng.random() > 0.5;

        return {
            direction: move.direction,
            dropBomb: dropBomb,
            thought: `TACTICAL: ${move.direction}${dropBomb ? ' + bomb' : ''}, ${safeMoves.length} safe moves`
        };
    }

    /**
     * Random strategy - pick random valid move
     */
    getRandomMove(gameState, playerId, game) {
        const player = gameState.players.find(p => p.id === playerId);
        const directions = ['up', 'down', 'left', 'right'];

        const validMoves = [];

        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            // Check bounds
            if (x < 0 || x >= game.GRID_WIDTH || y < 0 || y >= game.GRID_HEIGHT) {
                continue;
            }

            // Check if passable
            const cell = gameState.grid[y][x];
            if (cell === 0 || (typeof cell === 'string' && cell.startsWith('bomb'))) {
                validMoves.push(dir);
            }
        }

        if (validMoves.length === 0) {
            validMoves.push('right'); // Fallback
        }

        const direction = this.rng.choice(validMoves);
        const dropBomb = !player.hasBomb && this.rng.random() > 0.7;

        return {
            direction: direction,
            dropBomb: dropBomb,
            thought: `RANDOM: ${direction}${dropBomb ? ' + bomb' : ''}`
        };
    }

    // ===== HELPER METHODS =====

    /**
     * Check if player has adjacent breakable blocks
     */
    hasAdjacentBlocks(gameState, player, game) {
        const directions = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];

        for (const {dx, dy} of directions) {
            const x = player.x + dx;
            const y = player.y + dy;

            if (x >= 0 && x < game.GRID_WIDTH && y >= 0 && y < game.GRID_HEIGHT) {
                if (gameState.grid[y][x] === 1) { // Soft block
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Find nearest loot
     */
    findNearestLoot(gameState, player) {
        if (!gameState.loot || gameState.loot.length === 0) {
            return null;
        }

        let nearest = null;
        let minDistance = Infinity;

        for (const loot of gameState.loot) {
            const distance = Math.abs(loot.x - player.x) + Math.abs(loot.y - player.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = {...loot, distance};
            }
        }

        return nearest;
    }

    /**
     * Get move that goes toward target
     */
    getMoveToward(player, target, safeMoves) {
        const dx = target.x - player.x;
        const dy = target.y - player.y;

        // Prefer horizontal or vertical based on which is larger
        let preferredDir = null;
        if (Math.abs(dx) > Math.abs(dy)) {
            preferredDir = dx > 0 ? 'right' : 'left';
        } else {
            preferredDir = dy > 0 ? 'down' : 'up';
        }

        // Check if preferred direction is safe
        const safeMove = safeMoves.find(m => m.direction === preferredDir);
        if (safeMove) {
            return safeMove;
        }

        // Otherwise return any safe move
        return safeMoves.length > 0 ? safeMoves[0] : null;
    }

    /**
     * Get player thought (for UI display)
     */
    getPlayerThought(playerId) {
        return this.playerThoughts[playerId] || '';
    }

    /**
     * Reset mock LLM state
     */
    reset() {
        this.playerMemory = {};
        this.playerThoughts = {};
        this.moveIndex = {};
    }
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockLLM;
}
