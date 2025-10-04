// config.js - Bombervibe game configuration
// All game-specific constants and settings

const BombervibeConfig = {
    // Grid settings
    GRID_WIDTH: 13,
    GRID_HEIGHT: 11,

    // Gameplay settings
    SOFT_BLOCK_DENSITY: 0.4,
    INITIAL_BOMB_RANGE: 1,
    BOMB_TURNS_UNTIL_EXPLODE: 4, // Player turns (each player gets 4 moves before bomb explodes)
    EXPLOSION_DURATION: 500, // milliseconds

    // Scoring
    POINTS_PER_BLOCK: 10,
    POINTS_PER_KILL: 100,

    // Power-ups
    LOOT_DROP_CHANCE: 0.333, // 33.3% chance (1/3) when soft block breaks

    // Loot types with equal weights (33.33% each)
    LOOT_TYPES: [
        { type: 'flash_radius', weight: 33 }, // Blast range increase
        { type: 'bomb_pickup', weight: 33 },  // Pickup/throw bombs
        { type: 'extra_bomb', weight: 34 }    // Place multiple bombs simultaneously
    ],

    // Player starting positions (corners)
    PLAYER_POSITIONS: [
        { id: 1, x: 0, y: 0, color: 'cyan', name: 'Player 1', emoji: '⛷️' },
        { id: 2, x: 12, y: 0, color: 'magenta', name: 'Player 2', emoji: '🥷' },
        { id: 3, x: 0, y: 10, color: 'yellow', name: 'Player 3', emoji: '🛒' },
        { id: 4, x: 12, y: 10, color: 'green', name: 'Player 4', emoji: '🧑\u200d🚀' }
    ],

    // Safe zones (no soft blocks near spawn)
    SAFE_ZONES: [
        [0, 0], [1, 0], [0, 1], // Top-left
        [12, 0], [11, 0], [12, 1], // Top-right
        [0, 10], [1, 10], [0, 9], // Bottom-left
        [12, 10], [11, 10], [12, 9] // Bottom-right
    ],

    // Turn/timing settings
    TURN_DELAY: 1000, // milliseconds between turns
    TURN_DELAY_TEST: 0, // For testing mode

    // Cell types (match BLOCK_TYPES from blocks.js)
    CELL_TYPES: {
        EMPTY: 0,
        SOFT: 1,
        HARD: 2
    },

    // Hard block pattern (classic Bomberman)
    HARD_BLOCK_PATTERN: (x, y) => y % 2 === 1 && x % 2 === 1,

    // Vision radius for AI (7x7 grid)
    AI_VISION_RADIUS: 3,

    // Default AI prompts
    DEFAULT_PROMPTS: {
        1: 'You are Player 1 (cyan). EXPLORER: Move toward center (G6). Collect loot (⚡ range, 💣 extra bombs)! ⚠️ CRITICAL: When placing bombs, escape must avoid ALL active bombs (yours + others). Check DANGER ANALYSIS for all bomb blast zones!',
        2: 'You are Player 2 (magenta). AGGRESSIVE: Push toward center, destroy blocks, collect loot, pressure opponents. ⚠️ Multi-bomb escape: Check ALL bombs before placing new one! Use DANGER ANALYSIS to verify escape is safe from every blast.',
        3: 'You are Player 3 (yellow). DEFENSIVE: Stay safe, clear blocks methodically, grab power-ups (💣 extra bombs = more control!). ⚠️ SURVIVAL: When you place a bomb, verify escape avoids ALL active bombs (check every position + range). Use DANGER ANALYSIS!',
        4: 'You are Player 4 (green). TACTICAL: Balance risk/reward. Prioritize loot (⚡ range, 💣 extra bombs)! ⚠️ Critical escape logic: Placing a bomb? Check EVERY active bomb position + range. Your move must dodge ALL blasts, not just your new bomb!'
    },

    // Rendering settings
    RENDER: {
        PLAYER_EMOJIS: ['⛷️', '🥷', '🛒', '🧑\u200d🚀'],
        SOFT_BLOCK_EMOJI: '🟫',
        HARD_BLOCK_EMOJI: '⬛',
        EMPTY_EMOJI: '·',
        BOMB_EMOJI: '💣',
        EXPLOSION_EMOJI: '💥',
        LOOT_EMOJIS: {
            flash_radius: '⚡',
            bomb_pickup: '🧤',
            extra_bomb: '💣'
        }
    }
};

// Freeze config to prevent modifications
Object.freeze(BombervibeConfig);
Object.freeze(BombervibeConfig.PLAYER_POSITIONS);
Object.freeze(BombervibeConfig.SAFE_ZONES);
Object.freeze(BombervibeConfig.LOOT_TYPES);
Object.freeze(BombervibeConfig.CELL_TYPES);
Object.freeze(BombervibeConfig.RENDER);
Object.freeze(BombervibeConfig.DEFAULT_PROMPTS);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombervibeConfig };
}
