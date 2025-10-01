// entities/bomb.js - Bomb entity representation
// Pure data structure for bombs, decoupled from grid

/**
 * Bomb Entity
 *
 * Represents a bomb placed by a player.
 * Bombs explode after a certain number of turns and affect cells in a cross pattern.
 */
class BombEntity {
    /**
     * Create a new bomb entity
     * @param {string} id - Unique bomb ID (e.g., 'bomb1')
     * @param {number} playerId - ID of player who placed the bomb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} turnsUntilExplode - Turns remaining until explosion
     * @param {number} range - Explosion range in tiles
     * @param {number} placedOnTurn - Turn number when bomb was placed
     */
    constructor(id, playerId, x, y, turnsUntilExplode, range, placedOnTurn) {
        this.id = id;
        this.playerId = playerId;
        this.x = x;
        this.y = y;
        this.turnsUntilExplode = turnsUntilExplode;
        this.range = range;
        this.placedOnTurn = placedOnTurn;
        this.timestamp = Date.now(); // For visual effects
    }

    /**
     * Create a standard bomb with default settings
     * @param {string} id
     * @param {number} playerId
     * @param {number} x
     * @param {number} y
     * @param {number} currentTurn
     * @param {Object} customSettings - {turnsUntilExplode, range}
     * @returns {BombEntity}
     */
    static createStandard(id, playerId, x, y, currentTurn, customSettings = {}) {
        return new BombEntity(
            id,
            playerId,
            x,
            y,
            customSettings.turnsUntilExplode || 10,
            customSettings.range || 1,
            currentTurn
        );
    }

    /**
     * Clone bomb with modifications
     * @param {Object} changes
     * @returns {BombEntity}
     */
    clone(changes = {}) {
        const cloned = new BombEntity(
            this.id,
            this.playerId,
            this.x,
            this.y,
            this.turnsUntilExplode,
            this.range,
            this.placedOnTurn
        );
        cloned.timestamp = this.timestamp;
        Object.assign(cloned, changes);
        return cloned;
    }

    /**
     * Get turns remaining based on current turn
     * @param {number} currentTurn
     * @returns {number}
     */
    getTurnsRemaining(currentTurn) {
        return Math.max(0, this.turnsUntilExplode - (currentTurn - this.placedOnTurn));
    }

    /**
     * Check if bomb should explode this turn
     * @param {number} currentTurn
     * @returns {boolean}
     */
    shouldExplode(currentTurn) {
        return this.getTurnsRemaining(currentTurn) <= 0;
    }

    /**
     * Get all cells affected by explosion (without collision detection)
     * Returns raw cross pattern - collision detection happens in engine
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @returns {Array<{x, y, direction, distance}>}
     */
    getExplosionPattern(gridWidth, gridHeight) {
        const cells = [];

        // Center
        cells.push({
            x: this.x,
            y: this.y,
            direction: 'center',
            distance: 0
        });

        // Four directions
        const directions = [
            {dx: 0, dy: -1, name: 'up'},
            {dx: 0, dy: 1, name: 'down'},
            {dx: -1, dy: 0, name: 'left'},
            {dx: 1, dy: 0, name: 'right'}
        ];

        for (const dir of directions) {
            for (let i = 1; i <= this.range; i++) {
                const x = this.x + dir.dx * i;
                const y = this.y + dir.dy * i;

                // Only include cells within bounds
                // Collision detection (walls, blocks) happens in engine
                if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                    cells.push({
                        x,
                        y,
                        direction: dir.name,
                        distance: i
                    });
                }
            }
        }

        return cells;
    }

    /**
     * Get visual representation for time-based effects
     * @param {number} currentTurn
     * @returns {string}
     */
    getVisualState(currentTurn) {
        const turnsLeft = this.getTurnsRemaining(currentTurn);

        if (turnsLeft <= 1) return 'critical'; // About to explode
        if (turnsLeft <= 3) return 'warning';  // Getting dangerous
        return 'safe'; // Still safe
    }

    /**
     * Serialize to JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            playerId: this.playerId,
            x: this.x,
            y: this.y,
            turnsUntilExplode: this.turnsUntilExplode,
            range: this.range,
            placedOnTurn: this.placedOnTurn,
            timestamp: this.timestamp
        };
    }

    /**
     * Deserialize from JSON
     * @param {Object} json
     * @returns {BombEntity}
     */
    static fromJSON(json) {
        const bomb = new BombEntity(
            json.id,
            json.playerId,
            json.x,
            json.y,
            json.turnsUntilExplode,
            json.range,
            json.placedOnTurn
        );
        bomb.timestamp = json.timestamp;
        return bomb;
    }

    /**
     * Debug representation
     * @returns {string}
     */
    toString() {
        return `Bomb(id=${this.id}, player=${this.playerId}, pos=(${this.x},${this.y}), explode=${this.turnsUntilExplode}, range=${this.range})`;
    }
}

/**
 * Bomb Helper Functions
 * Pure utility functions for bomb-related calculations
 */
class BombHelpers {
    /**
     * Generate unique bomb ID
     * @param {number} playerId
     * @param {number} sequenceNumber
     * @returns {string}
     */
    static generateId(playerId, sequenceNumber) {
        return `bomb${playerId}_${sequenceNumber}`;
    }

    /**
     * Check if two bombs will chain react
     * @param {BombEntity} bomb1
     * @param {BombEntity} bomb2
     * @returns {boolean}
     */
    static willChainReact(bomb1, bomb2) {
        // Get explosion pattern of bomb1
        const explosion = bomb1.getExplosionPattern(100, 100); // Use large grid for check

        // Check if bomb2 is in explosion range
        return explosion.some(cell => cell.x === bomb2.x && cell.y === bomb2.y);
    }

    /**
     * Get all bombs in explosion range of a position
     * @param {Array<BombEntity>} bombs
     * @param {number} x
     * @param {number} y
     * @param {number} range
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @returns {Array<BombEntity>}
     */
    static getBombsInExplosionRange(bombs, x, y, range, gridWidth, gridHeight) {
        // Create a temporary bomb to get explosion pattern
        const tempBomb = new BombEntity('temp', 0, x, y, 1, range, 0);
        const pattern = tempBomb.getExplosionPattern(gridWidth, gridHeight);

        // Find bombs at any of these positions
        return bombs.filter(bomb =>
            pattern.some(cell => cell.x === bomb.x && cell.y === bomb.y)
        );
    }

    /**
     * Calculate Manhattan distance from bomb to position
     * @param {BombEntity} bomb
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static distanceToPosition(bomb, x, y) {
        return Math.abs(bomb.x - x) + Math.abs(bomb.y - y);
    }

    /**
     * Sort bombs by explosion time (soonest first)
     * @param {Array<BombEntity>} bombs
     * @param {number} currentTurn
     * @returns {Array<BombEntity>}
     */
    static sortByExplosionTime(bombs, currentTurn) {
        return [...bombs].sort((a, b) => {
            const aRemaining = a.getTurnsRemaining(currentTurn);
            const bRemaining = b.getTurnsRemaining(currentTurn);
            return aRemaining - bRemaining;
        });
    }

    /**
     * Get bombs that will explode on specific turn
     * @param {Array<BombEntity>} bombs
     * @param {number} turn
     * @returns {Array<BombEntity>}
     */
    static getBombsExplodingOnTurn(bombs, turn) {
        return bombs.filter(bomb => bomb.shouldExplode(turn));
    }

    /**
     * Calculate chain reaction cascade
     * Returns array of {bomb, turn} indicating when each bomb will explode
     * @param {Array<BombEntity>} bombs
     * @param {BombEntity} triggerBomb
     * @param {number} currentTurn
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @returns {Array<{bomb: BombEntity, turn: number}>}
     */
    static calculateChainReaction(bombs, triggerBomb, currentTurn, gridWidth, gridHeight) {
        const explosionSchedule = [];
        const exploded = new Set();
        const queue = [{bomb: triggerBomb, turn: currentTurn}];

        while (queue.length > 0) {
            const {bomb, turn} = queue.shift();

            if (exploded.has(bomb.id)) continue;
            exploded.add(bomb.id);
            explosionSchedule.push({bomb, turn});

            // Find bombs in explosion range
            const chainBombs = this.getBombsInExplosionRange(
                bombs,
                bomb.x,
                bomb.y,
                bomb.range,
                gridWidth,
                gridHeight
            ).filter(b => !exploded.has(b.id));

            // Chain bombs explode on next turn
            for (const chainBomb of chainBombs) {
                queue.push({bomb: chainBomb, turn: turn + 1});
            }
        }

        return explosionSchedule;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BombEntity,
        BombHelpers
    };
}
