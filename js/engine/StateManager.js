// state.js - Immutable game state management
// Provides snapshots of complete game state for replay, serialization, and time-travel

/**
 * GameState - Immutable snapshot of complete game state
 *
 * Design principles:
 * - Immutable: Never modify state, always return new state
 * - Serializable: Can convert to/from JSON for save/load
 * - Complete: Contains all information needed to render and continue game
 * - Self-contained: No external dependencies on mutable objects
 */
class GameState {
    /**
     * Create a new game state
     * @param {Object} config - Game configuration
     * @param {Object} entities - Game entities (players, bombs, items, explosions)
     * @param {Array} grid - 2D array representing terrain
     * @param {Object} metadata - Turn count, running status, etc.
     */
    constructor(config, entities, grid, metadata) {
        // Configuration (immutable)
        this.config = Object.freeze({
            gridWidth: config.gridWidth || 13,
            gridHeight: config.gridHeight || 11,
            turnDelay: config.turnDelay || 1000,
            bombTimer: config.bombTimer || 10,
            bombRange: config.bombRange || 1,
            explosionDuration: config.explosionDuration || 500,
            maxPlayers: config.maxPlayers || 4,
            ...config
        });

        // Entities (frozen copies)
        this.entities = Object.freeze({
            players: Object.freeze([...entities.players].map(p => Object.freeze({...p}))),
            bombs: Object.freeze([...entities.bombs].map(b => Object.freeze({...b}))),
            items: Object.freeze([...entities.items].map(i => Object.freeze({...i}))),
            explosions: Object.freeze([...entities.explosions].map(e => Object.freeze({...e})))
        });

        // Grid (frozen deep copy)
        this.grid = Object.freeze(grid.map(row => Object.freeze([...row])));

        // Metadata (frozen)
        this.metadata = Object.freeze({
            turnCount: metadata.turnCount || 0,
            currentPlayerIndex: metadata.currentPlayerIndex || 0,
            running: metadata.running || false,
            paused: metadata.paused || false,
            gameStartTime: metadata.gameStartTime || null,
            gameEndTime: metadata.gameEndTime || null,
            winner: metadata.winner || null,
            ...metadata
        });

        // Freeze the entire state object
        Object.freeze(this);
    }

    /**
     * Create initial game state with default configuration
     * @param {Object} customConfig - Optional custom configuration
     * @returns {GameState}
     */
    static createInitial(customConfig = {}) {
        const config = {
            gridWidth: 13,
            gridHeight: 11,
            turnDelay: 1000,
            bombTimer: 10,
            bombRange: 1,
            explosionDuration: 500,
            maxPlayers: 4,
            ...customConfig
        };

        // Create initial grid
        const grid = [];
        for (let y = 0; y < config.gridHeight; y++) {
            grid[y] = [];
            for (let x = 0; x < config.gridWidth; x++) {
                grid[y][x] = 0; // Empty
            }
        }

        // Place hard blocks (classic Bomberman pattern)
        for (let y = 0; y < config.gridHeight; y++) {
            for (let x = 0; x < config.gridWidth; x++) {
                if (y % 2 === 1 && x % 2 === 1) {
                    grid[y][x] = 2; // Hard block
                }
            }
        }

        // Place random soft blocks (avoid corners)
        const safeZones = [
            [0, 0], [1, 0], [0, 1], // Top-left
            [12, 0], [11, 0], [12, 1], // Top-right
            [0, 10], [1, 10], [0, 9], // Bottom-left
            [12, 10], [11, 10], [12, 9] // Bottom-right
        ];

        for (let y = 0; y < config.gridHeight; y++) {
            for (let x = 0; x < config.gridWidth; x++) {
                if (grid[y][x] === 0) {
                    const isSafe = safeZones.some(([sx, sy]) => sx === x && sy === y);
                    if (!isSafe && Math.random() < 0.4) {
                        grid[y][x] = 1; // Soft block
                    }
                }
            }
        }

        // Create initial players
        const players = [
            {
                id: 1,
                x: 0,
                y: 0,
                color: 'cyan',
                name: 'Player 1',
                alive: true,
                score: 0,
                hasBomb: false,
                bombX: null,
                bombY: null,
                activeItems: [] // Array of {itemType, expiresOnTurn}
            },
            {
                id: 2,
                x: 12,
                y: 0,
                color: 'magenta',
                name: 'Player 2',
                alive: true,
                score: 0,
                hasBomb: false,
                bombX: null,
                bombY: null,
                activeItems: []
            },
            {
                id: 3,
                x: 0,
                y: 10,
                color: 'yellow',
                name: 'Player 3',
                alive: true,
                score: 0,
                hasBomb: false,
                bombX: null,
                bombY: null,
                activeItems: []
            },
            {
                id: 4,
                x: 12,
                y: 10,
                color: 'green',
                name: 'Player 4',
                alive: true,
                score: 0,
                hasBomb: false,
                bombX: null,
                bombY: null,
                activeItems: []
            }
        ];

        const entities = {
            players,
            bombs: [],
            items: [],
            explosions: []
        };

        const metadata = {
            turnCount: 0,
            currentPlayerIndex: 0,
            running: false,
            paused: false,
            gameStartTime: null,
            gameEndTime: null,
            winner: null
        };

        return new GameState(config, entities, grid, metadata);
    }

    /**
     * Clone this state with modifications
     * @param {Object} changes - Changes to apply {entities, grid, metadata}
     * @returns {GameState} New state with changes applied
     */
    clone(changes = {}) {
        return new GameState(
            this.config,
            changes.entities || this.entities,
            changes.grid || this.grid,
            changes.metadata || this.metadata
        );
    }

    /**
     * Get player by ID
     * @param {number} playerId
     * @returns {Object|null}
     */
    getPlayer(playerId) {
        return this.entities.players.find(p => p.id === playerId) || null;
    }

    /**
     * Get current player
     * @returns {Object}
     */
    getCurrentPlayer() {
        return this.entities.players[this.metadata.currentPlayerIndex];
    }

    /**
     * Get alive players
     * @returns {Array}
     */
    getAlivePlayers() {
        return this.entities.players.filter(p => p.alive);
    }

    /**
     * Get bomb by ID
     * @param {string} bombId
     * @returns {Object|null}
     */
    getBomb(bombId) {
        return this.entities.bombs.find(b => b.id === bombId) || null;
    }

    /**
     * Get item by ID
     * @param {string} itemId
     * @returns {Object|null}
     */
    getItem(itemId) {
        return this.entities.items.find(i => i.id === itemId) || null;
    }

    /**
     * Get entity at position
     * @param {number} x
     * @param {number} y
     * @param {string} entityType - 'player', 'bomb', 'item', 'explosion'
     * @returns {Object|null}
     */
    getEntityAt(x, y, entityType) {
        switch (entityType) {
            case 'player':
                return this.entities.players.find(p => p.alive && p.x === x && p.y === y) || null;
            case 'bomb':
                return this.entities.bombs.find(b => b.x === x && b.y === y) || null;
            case 'item':
                return this.entities.items.find(i => i.x === x && i.y === y) || null;
            case 'explosion':
                return this.entities.explosions.find(e =>
                    e.cells.some(c => c.x === x && c.y === y)
                ) || null;
            default:
                return null;
        }
    }

    /**
     * Check if position is in bounds
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isInBounds(x, y) {
        return x >= 0 && x < this.config.gridWidth && y >= 0 && y < this.config.gridHeight;
    }

    /**
     * Check if position is passable (can walk through)
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isPassable(x, y) {
        if (!this.isInBounds(x, y)) return false;

        const cell = this.grid[y][x];
        // Can move through: empty (0), soft blocks (1), bombs
        // Cannot move through: hard blocks (2)
        return cell === 0 || cell === 1 || (typeof cell === 'string' && cell.startsWith('bomb'));
    }

    /**
     * Check if game is over
     * @returns {boolean}
     */
    isGameOver() {
        const alivePlayers = this.getAlivePlayers();
        return alivePlayers.length <= 1;
    }

    /**
     * Get winner (null if game not over)
     * @returns {Object|null}
     */
    getWinner() {
        const alivePlayers = this.getAlivePlayers();
        if (alivePlayers.length === 1) {
            return alivePlayers[0];
        }
        // If all dead, highest score wins
        if (alivePlayers.length === 0) {
            return this.entities.players.reduce((max, p) =>
                p.score > max.score ? p : max
            , this.entities.players[0]);
        }
        return null;
    }

    /**
     * Serialize state to JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            version: '1.0.0',
            config: this.config,
            entities: {
                players: this.entities.players,
                bombs: this.entities.bombs,
                items: this.entities.items,
                explosions: this.entities.explosions
            },
            grid: this.grid,
            metadata: this.metadata
        };
    }

    /**
     * Deserialize state from JSON
     * @param {Object} json
     * @returns {GameState}
     */
    static fromJSON(json) {
        return new GameState(
            json.config,
            json.entities,
            json.grid,
            json.metadata
        );
    }

    /**
     * Get compact representation for AI (similar to old getGameState)
     * @returns {Object}
     */
    toAIFormat() {
        return {
            grid: this.grid.map(row => [...row]),
            players: this.entities.players.map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                color: p.color,
                name: p.name,
                alive: p.alive,
                score: p.score,
                hasBomb: p.hasBomb
            })),
            bombs: this.entities.bombs.map(b => ({
                x: b.x,
                y: b.y,
                playerId: b.playerId,
                turnsUntilExplode: Math.max(0, b.turnsUntilExplode - (this.metadata.turnCount - b.placedOnTurn))
            })),
            items: this.entities.items.map(i => ({
                x: i.x,
                y: i.y,
                type: i.type
            })),
            turnCount: this.metadata.turnCount,
            currentPlayerId: this.getCurrentPlayer().id
        };
    }

    /**
     * Debug: Print state summary
     */
    toString() {
        const alive = this.getAlivePlayers().length;
        return `GameState(turn=${this.metadata.turnCount}, alive=${alive}/${this.entities.players.length}, bombs=${this.entities.bombs.length}, items=${this.entities.items.length})`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
}
