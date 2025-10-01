// entities/explosion.js - Explosion entity representation
// Visual effect entity for bomb explosions

/**
 * Explosion Entity
 *
 * Represents a temporary visual effect when a bomb explodes.
 * Explosions are short-lived entities used only for rendering.
 */
class ExplosionEntity {
    /**
     * Create a new explosion entity
     * @param {string} id - Unique explosion ID
     * @param {Array} cells - Array of {x, y} positions affected
     * @param {number} createdOnTurn - Turn when explosion was created
     * @param {number} duration - Duration in turns (for turn-based) or ms (for time-based)
     * @param {Object} metadata - Additional explosion data
     */
    constructor(id, cells, createdOnTurn, duration, metadata = {}) {
        this.id = id;
        this.cells = cells; // Array of {x, y}
        this.createdOnTurn = createdOnTurn;
        this.duration = duration;
        this.timestamp = Date.now(); // For time-based visual effects

        // Metadata
        this.bombId = metadata.bombId || null;
        this.playerId = metadata.playerId || null; // Player who placed the bomb
        this.chainReaction = metadata.chainReaction || false;
        this.intensity = metadata.intensity || 1; // Visual intensity (for chain reactions)

        // Animation state
        this.animationFrame = 0;
        this.maxFrames = metadata.maxFrames || 5;
    }

    /**
     * Create explosion from bomb entity
     * @param {string} id
     * @param {BombEntity} bomb
     * @param {Array} cells
     * @param {number} currentTurn
     * @param {number} duration
     * @returns {ExplosionEntity}
     */
    static fromBomb(id, bomb, cells, currentTurn, duration = 500) {
        return new ExplosionEntity(id, cells, currentTurn, duration, {
            bombId: bomb.id,
            playerId: bomb.playerId,
            chainReaction: false
        });
    }

    /**
     * Create chain reaction explosion (enhanced visual)
     * @param {string} id
     * @param {BombEntity} bomb
     * @param {Array} cells
     * @param {number} currentTurn
     * @param {number} duration
     * @returns {ExplosionEntity}
     */
    static fromChainReaction(id, bomb, cells, currentTurn, duration = 500) {
        return new ExplosionEntity(id, cells, currentTurn, duration, {
            bombId: bomb.id,
            playerId: bomb.playerId,
            chainReaction: true,
            intensity: 1.5 // Brighter/larger visual effect
        });
    }

    /**
     * Check if explosion has expired
     * @param {number} currentTurn - Current turn number
     * @param {number} currentTime - Current timestamp (ms)
     * @param {boolean} turnBased - Whether to use turn-based or time-based expiration
     * @returns {boolean}
     */
    hasExpired(currentTurn, currentTime, turnBased = false) {
        if (turnBased) {
            return currentTurn >= (this.createdOnTurn + Math.ceil(this.duration / 250));
        } else {
            return currentTime >= (this.timestamp + this.duration);
        }
    }

    /**
     * Get animation progress (0.0 to 1.0)
     * @param {number} currentTime - Current timestamp
     * @returns {number}
     */
    getAnimationProgress(currentTime) {
        const elapsed = currentTime - this.timestamp;
        return Math.min(elapsed / this.duration, 1.0);
    }

    /**
     * Get current animation frame (0 to maxFrames-1)
     * @param {number} currentTime
     * @returns {number}
     */
    getCurrentFrame(currentTime) {
        const progress = this.getAnimationProgress(currentTime);
        return Math.floor(progress * this.maxFrames);
    }

    /**
     * Get visual intensity at current time (for fade effects)
     * @param {number} currentTime
     * @returns {number} - 0.0 to 1.0
     */
    getIntensity(currentTime) {
        const progress = this.getAnimationProgress(currentTime);

        // Fade in/out curve: ramp up quickly, fade out slowly
        if (progress < 0.2) {
            // Fade in (0.0 to 1.0 over first 20%)
            return (progress / 0.2) * this.intensity;
        } else if (progress > 0.7) {
            // Fade out (1.0 to 0.0 over last 30%)
            return ((1.0 - progress) / 0.3) * this.intensity;
        } else {
            // Full intensity in middle
            return this.intensity;
        }
    }

    /**
     * Check if position is in explosion
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    containsPosition(x, y) {
        return this.cells.some(cell => cell.x === x && cell.y === y);
    }

    /**
     * Get cell at position (with metadata)
     * @param {number} x
     * @param {number} y
     * @returns {Object|null}
     */
    getCellAt(x, y) {
        return this.cells.find(cell => cell.x === x && cell.y === y) || null;
    }

    /**
     * Clone explosion with modifications
     * @param {Object} changes
     * @returns {ExplosionEntity}
     */
    clone(changes = {}) {
        const cloned = new ExplosionEntity(
            this.id,
            [...this.cells],
            this.createdOnTurn,
            this.duration,
            {
                bombId: this.bombId,
                playerId: this.playerId,
                chainReaction: this.chainReaction,
                intensity: this.intensity,
                maxFrames: this.maxFrames
            }
        );
        cloned.timestamp = this.timestamp;
        cloned.animationFrame = this.animationFrame;
        Object.assign(cloned, changes);
        return cloned;
    }

    /**
     * Serialize to JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            cells: this.cells,
            createdOnTurn: this.createdOnTurn,
            duration: this.duration,
            timestamp: this.timestamp,
            bombId: this.bombId,
            playerId: this.playerId,
            chainReaction: this.chainReaction,
            intensity: this.intensity,
            animationFrame: this.animationFrame,
            maxFrames: this.maxFrames
        };
    }

    /**
     * Deserialize from JSON
     * @param {Object} json
     * @returns {ExplosionEntity}
     */
    static fromJSON(json) {
        const explosion = new ExplosionEntity(
            json.id,
            json.cells,
            json.createdOnTurn,
            json.duration,
            {
                bombId: json.bombId,
                playerId: json.playerId,
                chainReaction: json.chainReaction,
                intensity: json.intensity,
                maxFrames: json.maxFrames
            }
        );
        explosion.timestamp = json.timestamp;
        explosion.animationFrame = json.animationFrame;
        return explosion;
    }

    /**
     * Debug representation
     * @returns {string}
     */
    toString() {
        return `Explosion(id=${this.id}, cells=${this.cells.length}, chain=${this.chainReaction})`;
    }
}

/**
 * Explosion Helper Functions
 * Pure utility functions for explosion management
 */
class ExplosionHelpers {
    /**
     * Generate unique explosion ID
     * @param {string} bombId
     * @returns {string}
     */
    static generateId(bombId) {
        return `explosion_${bombId}_${Date.now()}`;
    }

    /**
     * Clean up expired explosions
     * @param {Array<ExplosionEntity>} explosions
     * @param {number} currentTurn
     * @param {number} currentTime
     * @param {boolean} turnBased
     * @returns {Array<ExplosionEntity>}
     */
    static removeExpired(explosions, currentTurn, currentTime, turnBased = false) {
        return explosions.filter(exp => !exp.hasExpired(currentTurn, currentTime, turnBased));
    }

    /**
     * Get all positions affected by active explosions
     * @param {Array<ExplosionEntity>} explosions
     * @returns {Array<{x, y}>}
     */
    static getAllAffectedPositions(explosions) {
        const positions = new Map();

        for (const explosion of explosions) {
            for (const cell of explosion.cells) {
                const key = `${cell.x},${cell.y}`;
                if (!positions.has(key)) {
                    positions.set(key, {x: cell.x, y: cell.y});
                }
            }
        }

        return Array.from(positions.values());
    }

    /**
     * Get explosion intensity at position (combines multiple explosions)
     * @param {Array<ExplosionEntity>} explosions
     * @param {number} x
     * @param {number} y
     * @param {number} currentTime
     * @returns {number}
     */
    static getIntensityAt(explosions, x, y, currentTime) {
        let totalIntensity = 0;

        for (const explosion of explosions) {
            if (explosion.containsPosition(x, y)) {
                totalIntensity += explosion.getIntensity(currentTime);
            }
        }

        return Math.min(totalIntensity, 2.0); // Cap at 2x intensity
    }

    /**
     * Check if position is currently in any explosion
     * @param {Array<ExplosionEntity>} explosions
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    static isPositionExploding(explosions, x, y) {
        return explosions.some(exp => exp.containsPosition(x, y));
    }

    /**
     * Get visual effect data for rendering
     * @param {ExplosionEntity} explosion
     * @param {number} currentTime
     * @returns {Object}
     */
    static getVisualData(explosion, currentTime) {
        return {
            id: explosion.id,
            cells: explosion.cells,
            intensity: explosion.getIntensity(currentTime),
            frame: explosion.getCurrentFrame(currentTime),
            progress: explosion.getAnimationProgress(currentTime),
            chainReaction: explosion.chainReaction,
            playerId: explosion.playerId
        };
    }

    /**
     * Merge overlapping explosion cells (for optimization)
     * @param {Array<ExplosionEntity>} explosions
     * @returns {Map<string, Object>}
     */
    static mergeExplosionCells(explosions) {
        const merged = new Map();

        for (const explosion of explosions) {
            for (const cell of explosion.cells) {
                const key = `${cell.x},${cell.y}`;
                if (!merged.has(key)) {
                    merged.set(key, {
                        x: cell.x,
                        y: cell.y,
                        explosions: []
                    });
                }
                merged.get(key).explosions.push(explosion);
            }
        }

        return merged;
    }

    /**
     * Calculate screen shake intensity for visual effects
     * @param {Array<ExplosionEntity>} activeExplosions
     * @param {number} currentTime
     * @returns {number}
     */
    static calculateScreenShake(activeExplosions, currentTime) {
        let shake = 0;

        for (const explosion of activeExplosions) {
            const intensity = explosion.getIntensity(currentTime);
            const cellCount = explosion.cells.length;

            // More cells = bigger shake
            shake += intensity * Math.min(cellCount / 10, 1.0);
        }

        return Math.min(shake, 5.0); // Cap at 5px shake
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ExplosionEntity,
        ExplosionHelpers
    };
}
