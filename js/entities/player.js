// entities/player.js - Player entity representation
// Decoupled from grid, pure data structure

/**
 * Player Entity
 *
 * Represents a player in the game. Unlike the legacy Player class,
 * this is a pure data structure with no methods that mutate state.
 * All state changes happen through actions in the engine.
 */
class PlayerEntity {
    /**
     * Create a new player entity
     * @param {number} id - Player ID (1-4)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} color - Player color ('cyan', 'magenta', 'yellow', 'green')
     * @param {string} name - Player name
     */
    constructor(id, x, y, color, name) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.name = name;
        this.alive = true;
        this.score = 0;
        this.hasBomb = false; // Can only place one bomb at a time (for now)
        this.bombX = null;
        this.bombY = null;

        // Powerup/item effects
        this.activeItems = []; // Array of {itemType, effectValue, expiresOnTurn}
        this.stats = {
            speed: 1, // Movement speed multiplier (for future use)
            bombRange: 1, // Bomb explosion range
            maxBombs: 1, // Maximum bombs that can be placed at once
            bombsPlaced: 0 // Current number of active bombs
        };
    }

    /**
     * Create initial player entities for standard game
     * @returns {Array<PlayerEntity>}
     */
    static createInitialPlayers() {
        return [
            new PlayerEntity(1, 0, 0, 'cyan', 'Player 1'),
            new PlayerEntity(2, 12, 0, 'magenta', 'Player 2'),
            new PlayerEntity(3, 0, 10, 'yellow', 'Player 3'),
            new PlayerEntity(4, 12, 10, 'green', 'Player 4')
        ];
    }

    /**
     * Clone player with modifications
     * @param {Object} changes - Properties to change
     * @returns {PlayerEntity}
     */
    clone(changes = {}) {
        const cloned = new PlayerEntity(this.id, this.x, this.y, this.color, this.name);
        Object.assign(cloned, {
            alive: this.alive,
            score: this.score,
            hasBomb: this.hasBomb,
            bombX: this.bombX,
            bombY: this.bombY,
            activeItems: [...this.activeItems],
            stats: {...this.stats}
        });
        Object.assign(cloned, changes);
        return cloned;
    }

    /**
     * Get player state for serialization
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            color: this.color,
            name: this.name,
            alive: this.alive,
            score: this.score,
            hasBomb: this.hasBomb,
            bombX: this.bombX,
            bombY: this.bombY,
            activeItems: this.activeItems,
            stats: this.stats
        };
    }

    /**
     * Create player from JSON
     * @param {Object} json
     * @returns {PlayerEntity}
     */
    static fromJSON(json) {
        const player = new PlayerEntity(json.id, json.x, json.y, json.color, json.name);
        player.alive = json.alive;
        player.score = json.score;
        player.hasBomb = json.hasBomb;
        player.bombX = json.bombX;
        player.bombY = json.bombY;
        player.activeItems = json.activeItems || [];
        player.stats = json.stats || {
            speed: 1,
            bombRange: 1,
            maxBombs: 1,
            bombsPlaced: 0
        };
        return player;
    }

    /**
     * Get emoji representation for UI
     * @returns {string}
     */
    getEmoji() {
        const emojis = ['⛷️', '🧑‍🌾', '🛒', '🧑‍🚀'];
        return emojis[this.id - 1] || '👤';
    }

    /**
     * Check if player can place a bomb (based on current stats)
     * @returns {boolean}
     */
    canPlaceBomb() {
        return this.alive && this.stats.bombsPlaced < this.stats.maxBombs;
    }

    /**
     * Get active item effect of a specific type
     * @param {string} itemType
     * @returns {Object|null}
     */
    getActiveItem(itemType) {
        return this.activeItems.find(item => item.itemType === itemType) || null;
    }

    /**
     * Check if player has an active item effect
     * @param {string} itemType
     * @returns {boolean}
     */
    hasActiveItem(itemType) {
        return this.activeItems.some(item => item.itemType === itemType);
    }

    /**
     * Get computed stat value (base + item bonuses)
     * @param {string} statName
     * @returns {number}
     */
    getComputedStat(statName) {
        let base = this.stats[statName] || 0;

        // Add bonuses from active items
        for (const item of this.activeItems) {
            if (item.itemType === statName + 'Boost') {
                base += item.effectValue || 1;
            }
        }

        return base;
    }

    /**
     * Debug representation
     * @returns {string}
     */
    toString() {
        return `Player${this.id}(${this.name}, pos=(${this.x},${this.y}), ${this.alive ? 'alive' : 'dead'}, score=${this.score})`;
    }
}

/**
 * Player Helper Functions
 * Pure utility functions for player-related calculations
 */
class PlayerHelpers {
    /**
     * Calculate Manhattan distance between two positions
     * @param {Object} pos1 - {x, y}
     * @param {Object} pos2 - {x, y}
     * @returns {number}
     */
    static distance(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    /**
     * Get direction from one position to another
     * @param {Object} from - {x, y}
     * @param {Object} to - {x, y}
     * @returns {string|null} - 'up', 'down', 'left', 'right', or null
     */
    static getDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        // Adjacent positions only
        if (Math.abs(dx) + Math.abs(dy) !== 1) {
            return null;
        }

        if (dy === -1) return 'up';
        if (dy === 1) return 'down';
        if (dx === -1) return 'left';
        if (dx === 1) return 'right';

        return null;
    }

    /**
     * Get new position after moving in a direction
     * @param {Object} pos - {x, y}
     * @param {string} direction - 'up', 'down', 'left', 'right'
     * @returns {Object} - {x, y}
     */
    static getNewPosition(pos, direction) {
        const result = {x: pos.x, y: pos.y};

        switch (direction) {
            case 'up':
                result.y--;
                break;
            case 'down':
                result.y++;
                break;
            case 'left':
                result.x--;
                break;
            case 'right':
                result.x++;
                break;
        }

        return result;
    }

    /**
     * Get all adjacent positions (4-directional)
     * @param {Object} pos - {x, y}
     * @returns {Array<{x, y, direction}>}
     */
    static getAdjacentPositions(pos) {
        return [
            {x: pos.x, y: pos.y - 1, direction: 'up'},
            {x: pos.x, y: pos.y + 1, direction: 'down'},
            {x: pos.x - 1, y: pos.y, direction: 'left'},
            {x: pos.x + 1, y: pos.y, direction: 'right'}
        ];
    }

    /**
     * Get positions in a cross pattern (for bomb explosions)
     * @param {Object} pos - {x, y}
     * @param {number} range - Explosion range
     * @returns {Array<{x, y}>}
     */
    static getCrossPattern(pos, range) {
        const positions = [{x: pos.x, y: pos.y}]; // Center

        const directions = [
            {dx: 0, dy: -1}, // Up
            {dx: 0, dy: 1},  // Down
            {dx: -1, dy: 0}, // Left
            {dx: 1, dy: 0}   // Right
        ];

        for (const dir of directions) {
            for (let i = 1; i <= range; i++) {
                positions.push({
                    x: pos.x + dir.dx * i,
                    y: pos.y + dir.dy * i
                });
            }
        }

        return positions;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlayerEntity,
        PlayerHelpers
    };
}
