// entities/item.js - Item/loot entity representation
// Foundation for powerups that spawn after destroying soft blocks

/**
 * Item Types Enum
 */
const ItemType = {
    // Movement powerups
    SPEED_BOOST: 'speed',

    // Bomb powerups
    BOMB_RANGE: 'bombRange',
    EXTRA_BOMB: 'extraBomb',
    REMOTE_DETONATOR: 'remoteDetonator',

    // Defensive powerups
    INVINCIBILITY: 'invincibility',
    SHIELD: 'shield',

    // Offensive powerups
    BOMB_KICK: 'bombKick',
    BOMB_THROW: 'bombThrow',

    // Utility powerups
    WALL_PASS: 'wallPass',
    BOMB_PASS: 'bombPass',

    // Score/points
    BONUS_POINTS: 'bonusPoints'
};

/**
 * Item Rarity Enum
 */
const ItemRarity = {
    COMMON: 'common',     // 50% spawn chance
    UNCOMMON: 'uncommon', // 30% spawn chance
    RARE: 'rare',         // 15% spawn chance
    EPIC: 'epic',         // 4% spawn chance
    LEGENDARY: 'legendary' // 1% spawn chance
};

/**
 * Item Entity
 *
 * Represents a powerup/loot item that can be picked up by players.
 * Items spawn when soft blocks are destroyed and provide temporary or permanent effects.
 */
class ItemEntity {
    /**
     * Create a new item entity
     * @param {string} id - Unique item ID
     * @param {string} type - Item type from ItemType enum
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} properties - Item-specific properties
     */
    constructor(id, type, x, y, properties = {}) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;

        // Default properties
        this.spawnedOnTurn = properties.spawnedOnTurn || 0;
        this.spawnTimestamp = properties.spawnTimestamp || Date.now();
        this.expiresOnTurn = properties.expiresOnTurn || null; // null = never expires
        this.rarity = properties.rarity || ItemRarity.COMMON;

        // Effect properties
        this.effectDuration = properties.effectDuration || null; // Turns effect lasts, null = permanent
        this.effectValue = properties.effectValue || 1; // Bonus value (e.g., +1 bomb range)

        // Visual properties
        this.emoji = properties.emoji || this.getDefaultEmoji();
        this.color = properties.color || this.getDefaultColor();

        // Metadata
        this.pickedUpBy = null; // Player ID who picked it up
        this.activatedOnTurn = null;
    }

    /**
     * Get default emoji for item type
     * @returns {string}
     */
    getDefaultEmoji() {
        const emojiMap = {
            [ItemType.SPEED_BOOST]: '⚡',
            [ItemType.BOMB_RANGE]: '💥',
            [ItemType.EXTRA_BOMB]: '💣',
            [ItemType.REMOTE_DETONATOR]: '📡',
            [ItemType.INVINCIBILITY]: '✨',
            [ItemType.SHIELD]: '🛡️',
            [ItemType.BOMB_KICK]: '👟',
            [ItemType.BOMB_THROW]: '🎯',
            [ItemType.WALL_PASS]: '👻',
            [ItemType.BOMB_PASS]: '🌀',
            [ItemType.BONUS_POINTS]: '💎'
        };
        return emojiMap[this.type] || '❓';
    }

    /**
     * Get default color for item type
     * @returns {string}
     */
    getDefaultColor() {
        const colorMap = {
            [ItemType.SPEED_BOOST]: '#ffff00',
            [ItemType.BOMB_RANGE]: '#ff6600',
            [ItemType.EXTRA_BOMB]: '#ff0000',
            [ItemType.REMOTE_DETONATOR]: '#00ffff',
            [ItemType.INVINCIBILITY]: '#ffffff',
            [ItemType.SHIELD]: '#0066ff',
            [ItemType.BOMB_KICK]: '#00ff00',
            [ItemType.BOMB_THROW]: '#ff00ff',
            [ItemType.WALL_PASS]: '#cccccc',
            [ItemType.BOMB_PASS]: '#9900ff',
            [ItemType.BONUS_POINTS]: '#ffcc00'
        };
        return colorMap[this.type] || '#ffffff';
    }

    /**
     * Check if item has expired
     * @param {number} currentTurn
     * @returns {boolean}
     */
    hasExpired(currentTurn) {
        return this.expiresOnTurn !== null && currentTurn >= this.expiresOnTurn;
    }

    /**
     * Check if effect should expire
     * @param {number} currentTurn
     * @returns {boolean}
     */
    shouldEffectExpire(currentTurn) {
        if (this.effectDuration === null) return false; // Permanent effect
        if (this.activatedOnTurn === null) return false; // Not activated yet
        return currentTurn >= (this.activatedOnTurn + this.effectDuration);
    }

    /**
     * Get remaining effect duration
     * @param {number} currentTurn
     * @returns {number|null}
     */
    getRemainingDuration(currentTurn) {
        if (this.effectDuration === null) return null; // Permanent
        if (this.activatedOnTurn === null) return this.effectDuration;
        return Math.max(0, this.effectDuration - (currentTurn - this.activatedOnTurn));
    }

    /**
     * Clone item with modifications
     * @param {Object} changes
     * @returns {ItemEntity}
     */
    clone(changes = {}) {
        const cloned = new ItemEntity(this.id, this.type, this.x, this.y, {
            spawnedOnTurn: this.spawnedOnTurn,
            spawnTimestamp: this.spawnTimestamp,
            expiresOnTurn: this.expiresOnTurn,
            rarity: this.rarity,
            effectDuration: this.effectDuration,
            effectValue: this.effectValue,
            emoji: this.emoji,
            color: this.color
        });
        cloned.pickedUpBy = this.pickedUpBy;
        cloned.activatedOnTurn = this.activatedOnTurn;
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
            type: this.type,
            x: this.x,
            y: this.y,
            spawnedOnTurn: this.spawnedOnTurn,
            spawnTimestamp: this.spawnTimestamp,
            expiresOnTurn: this.expiresOnTurn,
            rarity: this.rarity,
            effectDuration: this.effectDuration,
            effectValue: this.effectValue,
            emoji: this.emoji,
            color: this.color,
            pickedUpBy: this.pickedUpBy,
            activatedOnTurn: this.activatedOnTurn
        };
    }

    /**
     * Deserialize from JSON
     * @param {Object} json
     * @returns {ItemEntity}
     */
    static fromJSON(json) {
        const item = new ItemEntity(json.id, json.type, json.x, json.y, {
            spawnedOnTurn: json.spawnedOnTurn,
            spawnTimestamp: json.spawnTimestamp,
            expiresOnTurn: json.expiresOnTurn,
            rarity: json.rarity,
            effectDuration: json.effectDuration,
            effectValue: json.effectValue,
            emoji: json.emoji,
            color: json.color
        });
        item.pickedUpBy = json.pickedUpBy;
        item.activatedOnTurn = json.activatedOnTurn;
        return item;
    }

    /**
     * Debug representation
     * @returns {string}
     */
    toString() {
        return `Item(${this.type}, pos=(${this.x},${this.y}), rarity=${this.rarity})`;
    }
}

/**
 * Item Helper Functions
 * Pure utility functions for item spawning and management
 */
class ItemHelpers {
    /**
     * Generate unique item ID
     * @param {string} type
     * @param {number} sequenceNumber
     * @returns {string}
     */
    static generateId(type, sequenceNumber) {
        return `item_${type}_${sequenceNumber}_${Date.now()}`;
    }

    /**
     * Get random item type based on rarity weights
     * @returns {string}
     */
    static getRandomItemType() {
        const weightedTypes = [
            // Common (50%)
            ...Array(25).fill(ItemType.SPEED_BOOST),
            ...Array(25).fill(ItemType.BOMB_RANGE),

            // Uncommon (30%)
            ...Array(15).fill(ItemType.EXTRA_BOMB),
            ...Array(15).fill(ItemType.BONUS_POINTS),

            // Rare (15%)
            ...Array(8).fill(ItemType.BOMB_KICK),
            ...Array(7).fill(ItemType.SHIELD),

            // Epic (4%)
            ...Array(2).fill(ItemType.INVINCIBILITY),
            ...Array(2).fill(ItemType.WALL_PASS),

            // Legendary (1%)
            ItemType.REMOTE_DETONATOR
        ];

        return weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
    }

    /**
     * Determine if item should spawn when block is destroyed
     * @param {Object} options - {spawnChance, blockType, turnCount}
     * @returns {boolean}
     */
    static shouldSpawnItem(options = {}) {
        const {
            spawnChance = 0.3, // 30% chance by default
            blockType = 1,     // Soft block
            turnCount = 0
        } = options;

        // Only spawn from soft blocks
        if (blockType !== 1) return false;

        // Increasing spawn rate in late game
        const lateGameBonus = turnCount > 100 ? 0.1 : 0;
        const finalChance = Math.min(spawnChance + lateGameBonus, 0.5);

        return Math.random() < finalChance;
    }

    /**
     * Get item configuration for a specific type
     * @param {string} itemType
     * @returns {Object}
     */
    static getItemConfig(itemType) {
        const configs = {
            [ItemType.SPEED_BOOST]: {
                effectDuration: 20, // 20 turns
                effectValue: 1,     // +1 speed
                rarity: ItemRarity.COMMON
            },
            [ItemType.BOMB_RANGE]: {
                effectDuration: null, // Permanent
                effectValue: 1,       // +1 range
                rarity: ItemRarity.COMMON
            },
            [ItemType.EXTRA_BOMB]: {
                effectDuration: null, // Permanent
                effectValue: 1,       // +1 max bombs
                rarity: ItemRarity.UNCOMMON
            },
            [ItemType.REMOTE_DETONATOR]: {
                effectDuration: null,
                effectValue: 1,
                rarity: ItemRarity.LEGENDARY
            },
            [ItemType.INVINCIBILITY]: {
                effectDuration: 10, // 10 turns
                effectValue: 1,
                rarity: ItemRarity.EPIC
            },
            [ItemType.SHIELD]: {
                effectDuration: 15, // 15 turns
                effectValue: 1,
                rarity: ItemRarity.RARE
            },
            [ItemType.BOMB_KICK]: {
                effectDuration: null,
                effectValue: 1,
                rarity: ItemRarity.RARE
            },
            [ItemType.BOMB_THROW]: {
                effectDuration: null,
                effectValue: 1,
                rarity: ItemRarity.EPIC
            },
            [ItemType.WALL_PASS]: {
                effectDuration: 15,
                effectValue: 1,
                rarity: ItemRarity.EPIC
            },
            [ItemType.BOMB_PASS]: {
                effectDuration: null,
                effectValue: 1,
                rarity: ItemRarity.RARE
            },
            [ItemType.BONUS_POINTS]: {
                effectDuration: null,
                effectValue: 50, // +50 points
                rarity: ItemRarity.UNCOMMON
            }
        };

        return configs[itemType] || {
            effectDuration: null,
            effectValue: 1,
            rarity: ItemRarity.COMMON
        };
    }

    /**
     * Create a random item at position
     * @param {number} x
     * @param {number} y
     * @param {number} currentTurn
     * @param {number} sequenceNumber
     * @returns {ItemEntity}
     */
    static createRandomItem(x, y, currentTurn, sequenceNumber) {
        const type = this.getRandomItemType();
        const config = this.getItemConfig(type);
        const id = this.generateId(type, sequenceNumber);

        return new ItemEntity(id, type, x, y, {
            spawnedOnTurn: currentTurn,
            expiresOnTurn: currentTurn + 100, // Items disappear after 100 turns
            ...config
        });
    }

    /**
     * Get description of item effect
     * @param {string} itemType
     * @returns {string}
     */
    static getItemDescription(itemType) {
        const descriptions = {
            [ItemType.SPEED_BOOST]: 'Temporarily increases movement speed',
            [ItemType.BOMB_RANGE]: 'Permanently increases bomb explosion range',
            [ItemType.EXTRA_BOMB]: 'Allows placing one more bomb at a time',
            [ItemType.REMOTE_DETONATOR]: 'Control when bombs explode',
            [ItemType.INVINCIBILITY]: 'Temporary immunity to explosions',
            [ItemType.SHIELD]: 'Blocks one explosion hit',
            [ItemType.BOMB_KICK]: 'Kick bombs to push them away',
            [ItemType.BOMB_THROW]: 'Throw bombs over obstacles',
            [ItemType.WALL_PASS]: 'Temporarily walk through soft blocks',
            [ItemType.BOMB_PASS]: 'Walk through bombs',
            [ItemType.BONUS_POINTS]: 'Instant score bonus'
        };

        return descriptions[itemType] || 'Unknown item';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ItemType,
        ItemRarity,
        ItemEntity,
        ItemHelpers
    };
}
