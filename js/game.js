// Game.js - Core game logic

class Game {
    constructor() {
        this.grid = [];
        this.players = [];
        this.bombs = [];
        this.explosions = [];
        this.turnCount = 0; // Individual player moves
        this.roundCount = 0; // Complete rounds (all players move once)
        this.currentPlayerIndex = 0;
        this.running = false;
        this.paused = false;
        this.turnDelay = 1000; // 1 second between turns

        this.GRID_WIDTH = 13;
        this.GRID_HEIGHT = 11;

        // Cell types:
        // 0 = empty
        // 1 = soft block (destructible)
        // 2 = hard block (indestructible)
        // 'bomb1', 'bomb2', etc = bombs
        // Player positions tracked separately
    }

    initialize() {
        this.createGrid();
        this.createPlayers();
    }

    createGrid() {
        // Initialize empty grid
        this.grid = [];
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                this.grid[y][x] = 0;
            }
        }

        // Place hard blocks (classic Bomberman pattern)
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (y % 2 === 1 && x % 2 === 1) {
                    this.grid[y][x] = 2; // Hard block
                }
            }
        }

        // Place random soft blocks (avoid corners and near corners)
        const safeZones = [
            [0, 0], [1, 0], [0, 1], // Top-left
            [12, 0], [11, 0], [12, 1], // Top-right
            [0, 10], [1, 10], [0, 9], // Bottom-left
            [12, 10], [11, 10], [12, 9] // Bottom-right
        ];

        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.grid[y][x] === 0) {
                    const isSafe = safeZones.some(([sx, sy]) => sx === x && sy === y);
                    if (!isSafe && Math.random() < 0.4) {
                        this.grid[y][x] = 1; // Soft block
                    }
                }
            }
        }
    }

    createPlayers() {
        // Create 4 players in corners
        this.players = [
            new Player(1, 0, 0, 'cyan', 'Player 1'),
            new Player(2, 12, 0, 'magenta', 'Player 2'),
            new Player(3, 0, 10, 'yellow', 'Player 3'),
            new Player(4, 12, 10, 'green', 'Player 4')
        ];
    }

    start() {
        this.running = true;
        this.paused = false;
    }

    pause() {
        this.paused = !this.paused;
    }

    reset() {
        this.running = false;
        this.paused = false;
        this.turnCount = 0;
        this.roundCount = 0;
        this.currentPlayerIndex = 0;
        this.bombs = [];
        this.explosions = [];
        this.initialize();
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

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

        // Increment round count when we cycle back to player 1 (or first alive player)
        if (this.currentPlayerIndex <= previousPlayerIndex) {
            this.roundCount++;
        }
    }

    // Move player in a direction
    movePlayer(playerId, direction) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return false;

        let newX = player.x;
        let newY = player.y;

        switch (direction) {
            case 'up':
                newY--;
                break;
            case 'down':
                newY++;
                break;
            case 'left':
                newX--;
                break;
            case 'right':
                newX++;
                break;
            default:
                return false;
        }

        return player.move(newX, newY, this.grid);
    }

    // Player places a bomb
    playerPlaceBomb(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return false;

        const success = player.placeBomb(this.grid, this.bombs);
        if (success) {
            // Set the round number when bomb was placed
            const bomb = this.bombs[this.bombs.length - 1];
            bomb.placedOnRound = this.roundCount;
        }
        return success;
    }

    // Update bombs and check for explosions (round-based)
    updateBombs() {
        const bombsToExplode = [];

        // Check bomb round countdown
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            const roundsSincePlaced = this.roundCount - bomb.placedOnRound;
            if (roundsSincePlaced >= bomb.roundsUntilExplode) {
                bombsToExplode.push(bomb);
                this.bombs.splice(i, 1);
            }
        }

        // Trigger explosions
        for (const bomb of bombsToExplode) {
            this.explodeBomb(bomb);
        }
    }

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

                // Check boundaries
                if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) {
                    break;
                }

                const cell = this.grid[y][x];

                // Hard block stops explosion
                if (cell === 2) {
                    break;
                }

                explosionCells.push({ x, y });

                // Soft block stops explosion and gets destroyed
                if (cell === 1) {
                    this.grid[y][x] = 0;
                    // Award points to bomb placer
                    if (player) {
                        player.addScore(10);
                    }
                    break;
                }

                // Chain reaction - other bombs explode
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
                    // Award kill points to bomb placer
                    if (player && player.id !== p.id) {
                        player.addScore(100);
                    }
                }
            }
        }

        // Store explosion for visual effect
        this.explosions.push({
            cells: explosionCells,
            timestamp: Date.now(),
            duration: 500
        });
    }

    // Clean up old explosions
    updateExplosions() {
        const now = Date.now();
        this.explosions = this.explosions.filter(exp =>
            now - exp.timestamp < exp.duration
        );
    }

    // Get game state for AI
    getGameState() {
        const state = {
            grid: this.grid.map(row => [...row]),
            players: this.players.map(p => p.getState()),
            bombs: this.bombs.map(b => ({
                x: b.x,
                y: b.y,
                playerId: b.playerId,
                roundsUntilExplode: Math.max(0, b.roundsUntilExplode - (this.roundCount - b.placedOnRound))
            })),
            turnCount: this.turnCount,
            roundCount: this.roundCount,
            currentPlayerId: this.getCurrentPlayer().id
        };

        return state;
    }

    // Check if game is over
    isGameOver() {
        const alivePlayers = this.players.filter(p => p.alive);
        return alivePlayers.length <= 1;
    }

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

    // Check if a position will be hit by explosion in the next round(s)
    isPositionLethal(x, y, afterRounds = 1) {
        for (const bomb of this.bombs) {
            const roundsLeft = Math.max(0, bomb.roundsUntilExplode - (this.roundCount - bomb.placedOnRound));

            // Will this bomb explode within the specified rounds?
            if (roundsLeft <= afterRounds) {
                // Check if position is in blast radius
                // Center of bomb
                if (bomb.x === x && bomb.y === y) {
                    return true;
                }

                // Check 4 directions
                const directions = [
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 },  // Down
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 }   // Right
                ];

                for (const dir of directions) {
                    for (let i = 1; i <= bomb.range; i++) {
                        const bx = bomb.x + dir.dx * i;
                        const by = bomb.y + dir.dy * i;

                        // Check if hard block blocks explosion
                        const blockX = bomb.x + dir.dx * (i - 1);
                        const blockY = bomb.y + dir.dy * (i - 1);
                        if (i > 1 && this.grid[blockY] && this.grid[blockY][blockX] === 2) {
                            break;
                        }

                        if (bx === x && by === y) {
                            return true;
                        }

                        // Stop at hard blocks
                        if (this.grid[by] && this.grid[by][bx] === 2) {
                            break;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Get all bombs adjacent (within range) to a position
    getAdjacentBombs(x, y, range = 2) {
        const adjacent = [];
        for (const bomb of this.bombs) {
            const distance = Math.abs(bomb.x - x) + Math.abs(bomb.y - y);
            if (distance <= range) {
                const roundsLeft = Math.max(0, bomb.roundsUntilExplode - (this.roundCount - bomb.placedOnRound));
                adjacent.push({
                    x: bomb.x,
                    y: bomb.y,
                    playerId: bomb.playerId,
                    roundsLeft: roundsLeft,
                    distance: distance
                });
            }
        }
        return adjacent;
    }

    // Get all safe moves for a player
    getSafeMoves(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return [];

        const safeMoves = [];
        const directions = ['up', 'down', 'left', 'right'];

        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            // Check bounds
            if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) {
                continue;
            }

            // Check if passable
            const cell = this.grid[y][x];
            if (cell === 2) { // Hard block
                continue;
            }

            // Check if lethal
            if (!this.isPositionLethal(x, y, 1)) {
                safeMoves.push({
                    direction: dir,
                    x: x,
                    y: y,
                    safe: true
                });
            }
        }

        return safeMoves;
    }

    // Get all dangerous moves for a player
    getDangerousMoves(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.alive) return [];

        const dangerousMoves = [];
        const directions = ['up', 'down', 'left', 'right'];

        for (const dir of directions) {
            let x = player.x;
            let y = player.y;

            if (dir === 'up') y--;
            else if (dir === 'down') y++;
            else if (dir === 'left') x--;
            else if (dir === 'right') x++;

            // Check bounds
            if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) {
                continue;
            }

            // Check if passable
            const cell = this.grid[y][x];
            if (cell === 2) { // Hard block
                continue;
            }

            // Check if lethal
            if (this.isPositionLethal(x, y, 1)) {
                dangerousMoves.push({
                    direction: dir,
                    x: x,
                    y: y,
                    lethal: true
                });
            }
        }

        return dangerousMoves;
    }
}
