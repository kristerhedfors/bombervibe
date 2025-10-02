// Block Configuration
// Centralized configuration for all block types in the game

/**
 * Block type enumeration
 * Use these constants instead of magic numbers throughout the codebase
 */
const BLOCK_TYPES = {
    EMPTY: {
        id: 0,
        name: 'empty',
        className: 'empty',
        emoji: null,
        color: '#2a4a2a',
        destructible: false,
        walkable: true,
        scoreValue: 0,
        description: 'Empty grass/ground tile'
    },
    SOFT: {
        id: 1,
        name: 'soft-block',
        className: 'soft-block',
        emoji: null, // Could use 🧱 if emoji-based rendering is desired
        // Brick pattern colors
        brickColor: '#888',
        mortarColor: '#aaa',
        destructible: true,
        walkable: false,
        scoreValue: 10,
        description: 'Destructible brick wall',
        // Visual pattern configuration
        pattern: 'brick',
        shadow: {
            insetLight: 'rgba(255, 255, 255, 0.3)',
            insetDark: 'rgba(0, 0, 0, 0.4)'
        }
    },
    HARD: {
        id: 2,
        name: 'hard-block',
        className: 'hard-block',
        emoji: null, // Could use 🗿 if emoji-based rendering is desired
        color: '#808080',
        destructible: false,
        walkable: false,
        scoreValue: 0,
        description: 'Indestructible stone block',
        // Visual pattern configuration
        pattern: 'stone',
        border: {
            width: 2,
            light: '#b0b0b0',
            dark: '#404040'
        },
        shadow: {
            insetLight: 'rgba(255, 255, 255, 0.3)',
            insetDark: 'rgba(0, 0, 0, 0.5)'
        }
    }
};

/**
 * Block helper functions
 */
const BlockUtils = {
    /**
     * Get block configuration by cell type ID
     * @param {number} cellType - Cell type ID (0, 1, 2)
     * @returns {Object} Block configuration object
     */
    getBlockConfig(cellType) {
        return Object.values(BLOCK_TYPES).find(block => block.id === cellType) || BLOCK_TYPES.EMPTY;
    },

    /**
     * Check if a block type is destructible
     * @param {number} cellType - Cell type ID
     * @returns {boolean}
     */
    isDestructible(cellType) {
        return this.getBlockConfig(cellType).destructible;
    },

    /**
     * Check if a block type is walkable
     * @param {number} cellType - Cell type ID
     * @returns {boolean}
     */
    isWalkable(cellType) {
        return this.getBlockConfig(cellType).walkable;
    },

    /**
     * Get score value for destroying a block
     * @param {number} cellType - Cell type ID
     * @returns {number} Score value
     */
    getScoreValue(cellType) {
        return this.getBlockConfig(cellType).scoreValue;
    },

    /**
     * Get CSS class name for a block type
     * @param {number} cellType - Cell type ID
     * @returns {string} CSS class name
     */
    getClassName(cellType) {
        return this.getBlockConfig(cellType).className;
    },

    /**
     * Get all block type IDs
     * @returns {Object} Object with EMPTY, SOFT, HARD properties
     */
    getTypeIds() {
        return {
            EMPTY: BLOCK_TYPES.EMPTY.id,
            SOFT: BLOCK_TYPES.SOFT.id,
            HARD: BLOCK_TYPES.HARD.id
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BLOCK_TYPES, BlockUtils };
}
