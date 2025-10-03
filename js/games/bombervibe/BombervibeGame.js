// BombervibeGame.js - Bomberman game implementation of IGame interface
// Implements all core game logic for the Bombervibe variant of Bomberman

class BombervibeGame {
    constructor(prompts, seed = null, options = {}) {
        // Store prompts manager
        this.prompts = prompts;

        // Initialize RNG with seed (null = random)
        this.rng = new SeededRNG(seed !== null ? seed : Date.now());
        this.seed = this.rng.getSeed();

        // Game options (merge with config defaults)
        this.options = {
            softBlockDensity: options.softBlockDensity || BombervibeConfig.SOFT_BLOCK_DENSITY,
            testingMode: options.testingMode || false,
            initialLoot: options.initialLoot || [],
            initialBombs: options.initialBombs || [],
            ...options
        };

        // Game state
        this.grid = [];
        this.players = [];
        this.bombs = [];
        this.explosions = [];
        this.loot = [];
        this.turnCount = 0;
        this.roundCount = 0;
        this.currentPlayerIndex = 0;
        this.running = false;
        this.paused = false;

        // Grid dimensions from config
        this.GRID_WIDTH = BombervibeConfig.GRID_WIDTH;
        this.GRID_HEIGHT = BombervibeConfig.GRID_HEIGHT;

        // Turn delay
        this.turnDelay = this.options.testingMode
            ? BombervibeConfig.TURN_DELAY_TEST
            : BombervibeConfig.TURN_DELAY;
    }

    /**
     * Initialize game (IGame interface)
     */
    initialize(config = {}) {
        // Merge any runtime config
        if (config.seed !== undefined) {
            this.rng = new SeededRNG(config.seed);
            this.seed = config.seed;
        }

        this.createGrid();
        this.createPlayers();
    }

    /**
     * Create game grid with blocks
     */
    createGrid() {
        // Initialize empty grid
        this.grid = [];
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                this.grid[y][x] = BombervibeConfig.CELL_TYPES.EMPTY;
            }
        }

        // Place hard blocks using pattern from config
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (BombervibeConfig.HARD_BLOCK_PATTERN(x, y)) {
                    this.grid[y][x] = BombervibeConfig.CELL_TYPES.HARD;
                }
            }
        }

        // Place random soft blocks (avoid safe zones)
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.grid[y][x] === BombervibeConfig.CELL_TYPES.EMPTY) {
                    const isSafe = BombervibeConfig.SAFE_ZONES.some(([sx, sy]) => sx === x && sy === y);
                    if (!isSafe && this.rng.random() < this.options.softBlockDensity) {
                        this.grid[y][x] = BombervibeConfig.CELL_TYPES.SOFT;
                    }
                }
            }
        }

        // Place initial loot if specified (for testing)
        for (const lootSpec of this.options.initialLoot) {
            this.loot.push({
                type: lootSpec.type || 'flash_radius',
                x: lootSpec.x,
                y: lootSpec.y,
                spawnedRound: 0
            });
        }

        // Place initial bombs if specified (for testing)
        for (const bombSpec of this.options.initialBombs) {
            const bomb = {
                id: `bomb${bombSpec.playerId}_test`,
                playerId: bombSpec.playerId,
                x: bombSpec.x,
                y: bombSpec.y,
                roundsUntilExplode: bombSpec.stage || BombervibeConfig.BOMB_ROUNDS_UNTIL_EXPLODE,
                range: bombSpec.range || BombervibeConfig.INITIAL_BOMB_RANGE,
                placedOnRound: this.roundCount
            };
            this.bombs.push(bomb);
            this.grid[bombSpec.y][bombSpec.x] = bomb.id;
        }
    }

    /**
     * Create players at starting positions
     */
    createPlayers() {
        this.players = BombervibeConfig.PLAYER_POSITIONS.map(pos => {
            return new Player(pos.id, pos.x, pos.y, pos.color, pos.name);
        });
    }

    /**
     * Start game (IGame interface)
     */
    start() {
        this.running = true;
        this.paused = false;
    }

    /**
     * Pause/resume game (IGame interface)
     */
    pause() {
        this.paused = !this.paused;
    }

    /**
     * Reset game (IGame interface)
     */
    reset() {
        this.running = false;
        this.paused = false;
        this.turnCount = 0;
        this.roundCount = 0;
        this.currentPlayerIndex = 0;
        this.bombs = [];
        this.explosions = [];
        this.loot = [];
        this.initialize();
    }

    /**
     * Get current player (IGame interface)
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Get next player (IGame interface)
     */
    getNextPlayer() {
        const playerCount = this.players.length;
        let nextIndex = (this.currentPlayerIndex + 1) % playerCount;

        // Skip dead players
        let attempts = 0;
        while (attempts < playerCount && !this.players[nextIndex].alive) {
            nextIndex = (nextIndex + 1) % playerCount;
            attempts++;
        }

        return this.players[nextIndex];
    }

    /**
     * Advance to next turn (IGame interface)
     */
    nextTurn() {
        const playerCount = this.players.length;
        const previousPlayerIndex = this.currentPlayerIndex;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % playerCount;

        // Skip dead players
        let attempts = 0;
        while (!this.getCurrentPlayer().alive && attempts < playerCount) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % playerCount;
            attempts++;
        }

        this.turnCount++;

        // Increment round count when we cycle back
        if (this.currentPlayerIndex <= previousPlayerIndex) {
            this.roundCount++;
            // Update bombs at the end of each round
            this.updateBombs();
        }
    }

    /**
     * Process a player move (IGame interface)
     * @param {number} playerId - Player making move
     * @param {Object} move - Move object {action, direction, dropBomb, thought}
     * @returns {boolean} Success
     */
    processMove(playerId, move) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return false;
        }

        let success = false;

        // Handle different action types
        if (move.action === 'pickup') {
            success = this.playerPickupBomb(playerId);
        } else if (move.action === 'throw') {
            success = this.playerThrowBomb(playerId, move.direction);
        } else {
            // Default: move action
            // Drop bomb first if requested
            if (move.dropBomb) {
                this.playerPlaceBomb(playerId);
            }

            // Then move
            success = this.movePlayer(playerId, move.direction);
        }

        return success;
    }

    /**
     * Move player in a direction
     */
    movePlayer(playerId, direction) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return false;

        let newX = player.x;
        let newY = player.y;

        switch (direction) {
            case 'up': newY--; break;
            case 'down': newY++; break;
            case 'left': newX--; break;
            case 'right': newX++; break;
            case 'stay':
            case 'none':
                // Stand still - check for loot
                this.checkLootPickup(player);
                return true;
            default:
                return false;
        }

        const moved = player.move(newX, newY, this.grid);

        // Check for loot pickup after successful move
        if (moved) {
            this.checkLootPickup(player);
        }

        return moved;
    }

    /**
     * Check and process loot pickup
     */
    checkLootPickup(player) {
        const lootIndex = this.loot.findIndex(l => l.x === player.x && l.y === player.y);
        if (lootIndex !== -1) {
            const loot = this.loot[lootIndex];
            player.pickupLoot(loot.type);
            this.loot.splice(lootIndex, 1);
        }
    }

    /**
     * Player places a bomb
     */
    playerPlaceBomb(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return false;

        const success = player.placeBomb(this.grid, this.bombs);
        if (success) {
            const bomb = this.bombs[this.bombs.length - 1];
            bomb.placedOnRound = this.roundCount;
        }
        return success;
    }

    /**
     * Player picks up a bomb (requires power-up)
     */
    playerPickupBomb(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive || !player.canPickupBombs || player.carriedBomb) {
            return false;
        }

        const bomb = this.bombs.find(b => b.x === player.x && b.y === player.y && !b.isBeingCarried);
        if (!bomb) return false;

        player.carriedBomb = bomb;
        bomb.isBeingCarried = true;
        bomb.carriedByPlayerId = playerId;

        if (this.grid[bomb.y][bomb.x] === bomb.id) {
            this.grid[bomb.y][bomb.x] = 0;
        }

        console.log(`[P${playerId}] Picked up bomb`);
        return true;
    }

    /**
     * Player throws carried bomb
     */
    playerThrowBomb(playerId, direction) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive || !player.carriedBomb) {
            return false;
        }

        const bomb = player.carriedBomb;
        let dx = 0, dy = 0;

        switch (direction) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
            default: return false;
        }

        // Calculate throw trajectory with wrap-around
        let x = player.x;
        let y = player.y;

        while (true) {
            x += dx;
            y += dy;

            // Wrap-around
            if (x < 0) x = this.GRID_WIDTH - 1;
            else if (x >= this.GRID_WIDTH) x = 0;
            if (y < 0) y = this.GRID_HEIGHT - 1;
            else if (y >= this.GRID_HEIGHT) y = 0;

            // Check for obstacle
            const cell = this.grid[y][x];
            if (cell === BombervibeConfig.CELL_TYPES.SOFT || cell === BombervibeConfig.CELL_TYPES.HARD) {
                x -= dx;
                y -= dy;
                if (x < 0) x = this.GRID_WIDTH - 1;
                else if (x >= this.GRID_WIDTH) x = 0;
                if (y < 0) y = this.GRID_HEIGHT - 1;
                else if (y >= this.GRID_HEIGHT) y = 0;
                break;
            }

            // Safety check
            const traveled = Math.abs(x - player.x) + Math.abs(y - player.y);
            if (traveled > this.GRID_WIDTH + this.GRID_HEIGHT) break;
        }

        // Place bomb at final position
        bomb.x = x;
        bomb.y = y;
        bomb.isBeingCarried = false;
        bomb.carriedByPlayerId = null;
        this.grid[y][x] = bomb.id;
        player.carriedBomb = null;

        console.log(`[P${playerId}] Threw bomb to (${x}, ${y})`);
        return true;
    }

    /**
     * Update bombs and trigger explosions
     */
    updateBombs() {
        const bombsToExplode = [];

        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            const roundsSincePlaced = this.roundCount - bomb.placedOnRound;

            if (roundsSincePlaced >= bomb.roundsUntilExplode) {
                // Handle carried bombs
                if (bomb.isBeingCarried && bomb.carriedByPlayerId) {
                    const carrier = this.players.find(p => p.id === bomb.carriedByPlayerId);
                    if (carrier) {
                        bomb.x = carrier.x;
                        bomb.y = carrier.y;
                        bomb.isBeingCarried = false;
                        carrier.carriedBomb = null;
                    }
                }

                bombsToExplode.push(bomb);
                this.bombs.splice(i, 1);
            }
        }

        for (const bomb of bombsToExplode) {
            this.explodeBomb(bomb);
        }
    }

    /**
     * Explode a bomb
     */
    explodeBomb(bomb) {
        const explosionCells = [];

        // Remove bomb from grid
        if (this.grid[bomb.y][bomb.x] === bomb.id) {
            this.grid[bomb.y][bomb.x] = 0;
        }

        // Reset player bomb flag
        const player = this.players.find(p => p.id === bomb.playerId);
        if (player) {
            player.hasBomb = false;
            player.bombX = null;
            player.bombY = null;
        }

        // Center explosion
        explosionCells.push({ x: bomb.x, y: bomb.y });

        // Explosion in 4 directions
        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ];

        for (const dir of directions) {
            for (let i = 1; i <= bomb.range; i++) {
                const x = bomb.x + dir.dx * i;
                const y = bomb.y + dir.dy * i;

                if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) {
                    break;
                }

                const cell = this.grid[y][x];

                // Hard block stops explosion
                if (cell === BombervibeConfig.CELL_TYPES.HARD) {
                    break;
                }

                explosionCells.push({ x, y });

                // Soft block stops explosion and gets destroyed
                if (cell === BombervibeConfig.CELL_TYPES.SOFT) {
                    this.grid[y][x] = BombervibeConfig.CELL_TYPES.EMPTY;
                    if (player) {
                        player.addScore(BombervibeConfig.POINTS_PER_BLOCK);
                    }

                    // Spawn loot
                    if (this.rng.random() < BombervibeConfig.LOOT_DROP_CHANCE) {
                        this.spawnLootAt(x, y);
                    }
                    break;
                }

                // Chain reaction
                if (typeof cell === 'string' && cell.startsWith('bomb')) {
                    const chainBomb = this.bombs.find(b => b.id === cell);
                    if (chainBomb) {
                        this.bombs = this.bombs.filter(b => b.id !== cell);
                        this.explodeBomb(chainBomb);
                    }
                    break;
                }
            }
        }

        // Check for player hits
        for (const cell of explosionCells) {
            for (const p of this.players) {
                if (p.alive && p.x === cell.x && p.y === cell.y) {
                    p.die();
                    if (player && player.id !== p.id) {
                        player.addScore(BombervibeConfig.POINTS_PER_KILL);
                    }
                    this.spreadLoot(p.bombRange);
                }
            }
        }

        // Destroy loot in explosion
        for (const cell of explosionCells) {
            const lootIndex = this.loot.findIndex(l => l.x === cell.x && l.y === cell.y);
            if (lootIndex !== -1 && this.grid[cell.y][cell.x] !== BombervibeConfig.CELL_TYPES.SOFT) {
                this.loot.splice(lootIndex, 1);
            }
        }

        // Store explosion for visual
        this.explosions.push({
            cells: explosionCells,
            timestamp: Date.now(),
            duration: BombervibeConfig.EXPLOSION_DURATION
        });
    }

    /**
     * Spawn loot at position
     */
    spawnLootAt(x, y) {
        const hasLoot = this.loot.some(l => l.x === x && l.y === y);
        if (hasLoot) return;

        const totalWeight = BombervibeConfig.LOOT_TYPES.reduce((sum, item) => sum + item.weight, 0);
        const roll = this.rng.random() * totalWeight;
        let cumulative = 0;
        let selectedType = 'flash_radius';

        for (const item of BombervibeConfig.LOOT_TYPES) {
            cumulative += item.weight;
            if (roll < cumulative) {
                selectedType = item.type;
                break;
            }
        }

        this.loot.push({
            type: selectedType,
            x: x,
            y: y,
            spawnedRound: this.roundCount
        });
    }

    /**
     * Spread loot randomly on cleared squares
     */
    spreadLoot(count) {
        const clearedPositions = [];
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.grid[y][x] === 0) {
                    const hasLoot = this.loot.some(l => l.x === x && l.y === y);
                    const hasPlayer = this.players.some(p => p.alive && p.x === x && p.y === y);
                    if (!hasLoot && !hasPlayer) {
                        clearedPositions.push({ x, y });
                    }
                }
            }
        }

        const itemsToSpawn = Math.min(count, clearedPositions.length);
        for (let i = 0; i < itemsToSpawn; i++) {
            const pos = this.rng.choice(clearedPositions);
            this.spawnLootAt(pos.x, pos.y);
            const index = clearedPositions.findIndex(p => p.x === pos.x && p.y === pos.y);
            if (index !== -1) {
                clearedPositions.splice(index, 1);
            }
        }
    }

    /**
     * Clean up old explosions
     */
    updateExplosions() {
        const now = Date.now();
        this.explosions = this.explosions.filter(exp =>
            now - exp.timestamp < exp.duration
        );
    }

    /**
     * Check if game is over (IGame interface)
     */
    isGameOver() {
        const alivePlayers = this.players.filter(p => p.alive);
        return alivePlayers.length <= 1;
    }

    /**
     * Get winner (IGame interface)
     */
    getWinner() {
        const alivePlayers = this.players.filter(p => p.alive);
        if (alivePlayers.length === 1) {
            return alivePlayers[0];
        }
        // If all dead, highest score wins
        return this.players.reduce((max, p) =>
            p.score > max.score ? p : max
        , this.players[0]);
    }

    /**
     * Get game state for AI (IGame interface)
     */
    getGameState() {
        return {
            grid: this.grid.map(row => [...row]),
            players: this.players.map(p => p.getState()),
            bombs: this.bombs.map(b => {
                const roundsSincePlaced = this.roundCount - b.placedOnRound;
                const roundsRemaining = Math.max(0, b.roundsUntilExplode - roundsSincePlaced);
                return {
                    x: b.x,
                    y: b.y,
                    playerId: b.playerId,
                    range: b.range,
                    roundsUntilExplode: roundsRemaining
                };
            }),
            loot: this.loot.map(l => ({
                type: l.type,
                x: l.x,
                y: l.y
            })),
            turnCount: this.turnCount,
            roundCount: this.roundCount,
            currentPlayerId: this.getCurrentPlayer().id
        };
    }

    /**
     * Validate a move (IGame interface)
     */
    validateMove(gameState, playerId, move) {
        const errors = [];

        if (!move || typeof move !== 'object') {
            errors.push('Move must be an object');
            return { valid: false, errors };
        }

        if (!move.direction || !['up', 'down', 'left', 'right', 'stay'].includes(move.direction)) {
            errors.push('Invalid or missing direction');
        }

        if (move.dropBomb !== undefined && typeof move.dropBomb !== 'boolean') {
            errors.push('dropBomb must be boolean');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get LLM prompt for player (IGame interface)
     */
    getLLMPrompt(gameState, playerId) {
        const gameDescription = this.generateGameStateDescription(gameState, playerId);
        const playerStrategy = this.prompts.getPlayerPrompt(playerId);

        const userPrompt = `${gameDescription}
STRATEGY: ${playerStrategy}

Respond with JSON: {"direction":"up|down|left|right|stay","dropBomb":true|false,"thought":"why (50 words max)"}`;

        return {
            system: this.prompts.getSystemPrompt(),
            user: userPrompt,
            responseFormat: this.prompts.getTacticalResponseFormat()
        };
    }

    /**
     * Convert coordinates to chess notation
     */
    coordsToChess(x, y) {
        const file = String.fromCharCode(65 + x);
        const rank = 11 - y;
        return `${file}${rank}`;
    }

    /**
     * Generate 7x7 vision grid for LLM
     */
    generate7x7Grid(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        const VISION_RADIUS = BombervibeConfig.AI_VISION_RADIUS;
        let gridStr = '## 7x7 VISION:\n\n| Rank |';

        for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
            const x = player.x + dx;
            gridStr += (x >= 0 && x < this.GRID_WIDTH) ? ` ${String.fromCharCode(65 + x)} |` : ' ❌ |';
        }
        gridStr += '\n|------|---|---|---|---|---|---|---|\n';

        for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
            const y = player.y + dy;
            const rank = (y >= 0 && y < this.GRID_HEIGHT) ? (11 - y) : '❌';
            gridStr += `| **${rank.toString().padStart(2, ' ')}** |`;

            for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
                const x = player.x + dx;
                if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) {
                    gridStr += ' ❌ |';
                    continue;
                }

                const cell = gameState.grid[y][x];
                let cellContent = (x === player.x && y === player.y) ? '🎯' :
                    gameState.players.find(p => p.alive && p.x === x && p.y === y) ? `P${gameState.players.find(p => p.alive && p.x === x && p.y === y).id}` : '';

                const bombHere = gameState.bombs.find(b => b.x === x && b.y === y);
                if (bombHere) cellContent = cellContent ? `${cellContent}💣${bombHere.roundsUntilExplode}` : `💣${bombHere.roundsUntilExplode}`;

                const lootHere = gameState.loot && gameState.loot.find(l => l.x === x && l.y === y);
                if (lootHere && !cellContent) cellContent = cell === 1 ? '🟫⚡' : '⚡';
                else if (!cellContent) cellContent = cell === 0 ? '·' : cell === 1 ? '🟫' : cell === 2 ? '⬛' : '?';

                gridStr += ` ${cellContent} |`;
            }
            gridStr += '\n';
        }

        gridStr += '\n**Legend:** 🎯=YOU | P1-P4=Players | 💣=Bomb+rounds | ⚡=Loot | ·=Empty | 🟫=Soft | ⬛=Hard\n\n';
        gridStr += this.generateLocalSummary(gameState, playerId);
        return gridStr;
    }

    /**
     * Generate summary of adjacent blocks
     */
    generateLocalSummary(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return '';

        const adjacentBlocks = [];
        const directions = [{dir:'up',dx:0,dy:-1},{dir:'down',dx:0,dy:1},{dir:'left',dx:-1,dy:0},{dir:'right',dx:1,dy:0}];

        for (const {dir, dx, dy} of directions) {
            const x = player.x + dx, y = player.y + dy;
            if (x >= 0 && x < this.GRID_WIDTH && y >= 0 && y < this.GRID_HEIGHT && gameState.grid[y][x] === BombervibeConfig.CELL_TYPES.SOFT) {
                adjacentBlocks.push(dir);
            }
        }

        return adjacentBlocks.length === 0 ? '**Breakable blocks ADJACENT to you:** None\n' :
            `**Breakable blocks ADJACENT to you:** ${adjacentBlocks.length} at: ${adjacentBlocks.join(',')}\n⚠️ To bomb them: dropBomb:true + move to DIFFERENT empty direction!\n`;
    }

    /**
     * Generate complete game state description for LLM
     */
    generateGameStateDescription(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return null;

        let desc = this.generate7x7Grid(gameState, playerId);

        desc += 'PLAYERS: ' + gameState.players.map(p => `P${p.id}:${this.coordsToChess(p.x,p.y)}:${p.score}:${p.hasBomb?'💣1':'💣0'}:${p.alive?'✅':'💀'}`).join(' | ') + '\n';
        desc += '\nBOMBS: ' + (gameState.bombs.length === 0 ? 'None' : gameState.bombs.map(b => `P${b.playerId}@${this.coordsToChess(b.x,b.y)}:${b.roundsUntilExplode}r:R${b.range||1}`).join(' | ')) + '\n';
        desc += '\nLOOT: ' + (!gameState.loot || gameState.loot.length === 0 ? 'None' : gameState.loot.map(l => `⚡${this.coordsToChess(l.x,l.y)}`).join(' | ')) + '\n';
        desc += `\nROUND: ${gameState.roundCount}\n\nVALID MOVES: `;

        const validMoves = [], blockedMoves = [];
        for (const dir of ['up','down','left','right','stay']) {
            let x = player.x, y = player.y;
            if (dir === 'up') y--; else if (dir === 'down') y++; else if (dir === 'left') x--; else if (dir === 'right') x++;

            if (dir === 'stay') { validMoves.push(`stay@${this.coordsToChess(x,y)}`); continue; }
            if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) { blockedMoves.push(`${dir}:OOB`); continue; }

            const cell = gameState.grid[y][x];
            if (cell === 0 || (typeof cell === 'string' && cell.startsWith('bomb'))) validMoves.push(`${dir}→${this.coordsToChess(x,y)}`);
            else blockedMoves.push(`${dir}:${cell===1?'soft':cell===2?'hard':'?'}`);
        }

        desc += validMoves.join(',') + (blockedMoves.length > 0 ? ` | BLOCKED: ${blockedMoves.join(',')}` : '') + '\n';

        const safeMoves = this.getSafeMoves(playerId), dangerousMoves = this.getDangerousMoves(playerId);
        const currentPos = this.coordsToChess(player.x, player.y);
        desc += `\nDANGER: Current ${currentPos} is ${!this.isPositionLethal(player.x,player.y,1)?'✅SAFE':'💀LETHAL'}\n`;
        desc += safeMoves.length > 0 ? `SAFE: ${safeMoves.map(m=>`${m.direction}→${this.coordsToChess(m.x,m.y)}`).join(',')}` : 'SAFE: NONE!';
        if (dangerousMoves.length > 0) desc += ` | LETHAL: ${dangerousMoves.map(m=>`${m.direction}→${this.coordsToChess(m.x,m.y)}`).join(',')}`;
        desc += `\n\nYOU (P${playerId}): ${currentPos} | Score:${player.score} | Bomb:${player.hasBomb?'💣1':'💣0'} | Range:${player.bombRange||1}\n`;

        return desc;
    }

    /**
     * Check if position will be lethal
     */
    isPositionLethal(x, y, afterRounds = 1) {
        for (const bomb of this.bombs) {
            const roundsLeft = Math.max(0, bomb.roundsUntilExplode - (this.roundCount - bomb.placedOnRound));
            if (bomb.x === x && bomb.y === y && roundsLeft <= 3) return true;
            if (roundsLeft <= afterRounds) {
                for (const dir of [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}]) {
                    for (let i = 1; i <= bomb.range; i++) {
                        const bx = bomb.x + dir.dx * i, by = bomb.y + dir.dy * i;
                        const blockX = bomb.x + dir.dx * (i-1), blockY = bomb.y + dir.dy * (i-1);
                        if (i > 1 && this.grid[blockY]?.[blockX] === BombervibeConfig.CELL_TYPES.HARD) break;
                        if (bx === x && by === y) return true;
                        if (this.grid[by]?.[bx] === BombervibeConfig.CELL_TYPES.HARD) break;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Get safe moves for player
     */
    getSafeMoves(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return [];

        const safeMoves = [];
        for (const dir of ['up','down','left','right','stay']) {
            let x = player.x, y = player.y;
            if (dir === 'up') y--; else if (dir === 'down') y++; else if (dir === 'left') x--; else if (dir === 'right') x++;
            if (dir !== 'stay' && (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT)) continue;
            if (dir !== 'stay') {
                const cell = this.grid[y][x];
                if (cell === BombervibeConfig.CELL_TYPES.SOFT || cell === BombervibeConfig.CELL_TYPES.HARD) continue;
            }
            if (!this.isPositionLethal(x, y, 1)) safeMoves.push({direction:dir,x,y,safe:true});
        }
        return safeMoves;
    }

    /**
     * Get dangerous moves for player
     */
    getDangerousMoves(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return [];

        const dangerousMoves = [];
        for (const dir of ['up','down','left','right','stay']) {
            let x = player.x, y = player.y;
            if (dir === 'up') y--; else if (dir === 'down') y++; else if (dir === 'left') x--; else if (dir === 'right') x++;
            if (dir !== 'stay' && (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT)) continue;
            if (dir !== 'stay') {
                const cell = this.grid[y][x];
                if (cell === BombervibeConfig.CELL_TYPES.SOFT || cell === BombervibeConfig.CELL_TYPES.HARD) continue;
            }
            if (this.isPositionLethal(x, y, 1)) dangerousMoves.push({direction:dir,x,y,lethal:true});
        }
        return dangerousMoves;
    }

    /**
     * Get random valid move (for LLM fallback)
     */
    getRandomMove(gameState, playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return { action: 'move', direction: 'stay', dropBomb: false };
        }

        const validMoves = [];
        const directions = ['up', 'down', 'left', 'right', 'stay'];

        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            if (dir === 'stay' || (x >= 0 && x < this.GRID_WIDTH && y >= 0 && y < this.GRID_HEIGHT)) {
                const cell = dir === 'stay' ? 0 : gameState.grid[y][x];
                if (cell === 0 || (typeof cell === 'string' && cell.startsWith('bomb'))) {
                    validMoves.push({
                        action: 'move',
                        direction: dir,
                        dropBomb: !player.hasBomb && Math.random() > 0.7
                    });
                }
            }
        }

        if (validMoves.length > 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        return { action: 'move', direction: 'stay', dropBomb: false };
    }

    /**
     * Get memory update prompt (for LLM)
     */
    getMemoryUpdatePrompt(gameState, playerId, moveResult) {
        // Will be implemented in Part 3
        return "Memory update prompt";
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombervibeGame };
}
