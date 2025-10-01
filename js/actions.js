// actions.js - Immutable action definitions for event sourcing and replay
// All game state changes flow through actions instead of direct mutations

/**
 * Action Types Enum
 */
const ActionType = {
    // Player actions
    PLAYER_MOVE: 'PLAYER_MOVE',
    PLAYER_PLACE_BOMB: 'PLAYER_PLACE_BOMB',
    PLAYER_DIE: 'PLAYER_DIE',
    PLAYER_RESPAWN: 'PLAYER_RESPAWN',
    PLAYER_PICKUP_ITEM: 'PLAYER_PICKUP_ITEM',
    PLAYER_ADD_SCORE: 'PLAYER_ADD_SCORE',

    // Bomb actions
    BOMB_TICK: 'BOMB_TICK',
    BOMB_EXPLODE: 'BOMB_EXPLODE',
    BOMB_CHAIN_REACTION: 'BOMB_CHAIN_REACTION',

    // Block actions
    BLOCK_DESTROY: 'BLOCK_DESTROY',

    // Item actions
    ITEM_SPAWN: 'ITEM_SPAWN',
    ITEM_DESPAWN: 'ITEM_DESPAWN',
    ITEM_ACTIVATE: 'ITEM_ACTIVATE',
    ITEM_EXPIRE: 'ITEM_EXPIRE',

    // Game actions
    GAME_START: 'GAME_START',
    GAME_PAUSE: 'GAME_PAUSE',
    GAME_RESUME: 'GAME_RESUME',
    GAME_END: 'GAME_END',
    GAME_RESET: 'GAME_RESET',
    GAME_NEXT_TURN: 'GAME_NEXT_TURN',

    // Explosion actions
    EXPLOSION_CREATE: 'EXPLOSION_CREATE',
    EXPLOSION_EXPIRE: 'EXPLOSION_EXPIRE',

    // Batch/compound actions
    BATCH_ACTIONS: 'BATCH_ACTIONS'
};

/**
 * Base Action class
 */
class Action {
    constructor(type, payload = {}, timestamp = Date.now()) {
        this.type = type;
        this.payload = payload;
        this.timestamp = timestamp;
        this.id = `${type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Serialize action to JSON
     */
    toJSON() {
        return {
            type: this.type,
            payload: this.payload,
            timestamp: this.timestamp,
            id: this.id
        };
    }

    /**
     * Deserialize action from JSON
     */
    static fromJSON(json) {
        return new Action(json.type, json.payload, json.timestamp);
    }
}

/**
 * Action Creators - Factory functions for creating actions
 */
const ActionCreators = {
    // Player actions
    playerMove(playerId, fromX, fromY, toX, toY, direction) {
        return new Action(ActionType.PLAYER_MOVE, {
            playerId,
            fromX,
            fromY,
            toX,
            toY,
            direction
        });
    },

    playerPlaceBomb(playerId, x, y, bombId, turnsUntilExplode, range) {
        return new Action(ActionType.PLAYER_PLACE_BOMB, {
            playerId,
            x,
            y,
            bombId,
            turnsUntilExplode,
            range
        });
    },

    playerDie(playerId, x, y, killedBy) {
        return new Action(ActionType.PLAYER_DIE, {
            playerId,
            x,
            y,
            killedBy // playerId of killer, or null if environmental
        });
    },

    playerRespawn(playerId, x, y) {
        return new Action(ActionType.PLAYER_RESPAWN, {
            playerId,
            x,
            y
        });
    },

    playerPickupItem(playerId, itemId, itemType, x, y) {
        return new Action(ActionType.PLAYER_PICKUP_ITEM, {
            playerId,
            itemId,
            itemType,
            x,
            y
        });
    },

    playerAddScore(playerId, points, reason) {
        return new Action(ActionType.PLAYER_ADD_SCORE, {
            playerId,
            points,
            reason // 'block_destroyed', 'player_killed', etc.
        });
    },

    // Bomb actions
    bombTick(bombId, turnsRemaining) {
        return new Action(ActionType.BOMB_TICK, {
            bombId,
            turnsRemaining
        });
    },

    bombExplode(bombId, playerId, x, y, range, affectedCells) {
        return new Action(ActionType.BOMB_EXPLODE, {
            bombId,
            playerId,
            x,
            y,
            range,
            affectedCells // Array of {x, y, type: 'block'|'player'|'bomb'}
        });
    },

    bombChainReaction(triggerBombId, chainBombId) {
        return new Action(ActionType.BOMB_CHAIN_REACTION, {
            triggerBombId,
            chainBombId
        });
    },

    // Block actions
    blockDestroy(x, y, blockType, destroyedBy) {
        return new Action(ActionType.BLOCK_DESTROY, {
            x,
            y,
            blockType, // 1 = soft, 2 = hard
            destroyedBy // playerId who placed the bomb
        });
    },

    // Item actions
    itemSpawn(itemId, itemType, x, y, properties = {}) {
        return new Action(ActionType.ITEM_SPAWN, {
            itemId,
            itemType, // 'speed', 'bombRange', 'extraBomb', 'invincibility', etc.
            x,
            y,
            properties // Additional item-specific data
        });
    },

    itemDespawn(itemId, x, y, reason) {
        return new Action(ActionType.ITEM_DESPAWN, {
            itemId,
            x,
            y,
            reason // 'timeout', 'picked_up', etc.
        });
    },

    itemActivate(itemId, playerId, itemType, duration) {
        return new Action(ActionType.ITEM_ACTIVATE, {
            itemId,
            playerId,
            itemType,
            duration // Turns the effect lasts, or null for permanent
        });
    },

    itemExpire(itemId, playerId, itemType) {
        return new Action(ActionType.ITEM_EXPIRE, {
            itemId,
            playerId,
            itemType
        });
    },

    // Game actions
    gameStart() {
        return new Action(ActionType.GAME_START, {});
    },

    gamePause() {
        return new Action(ActionType.GAME_PAUSE, {});
    },

    gameResume() {
        return new Action(ActionType.GAME_RESUME, {});
    },

    gameEnd(winnerId, reason) {
        return new Action(ActionType.GAME_END, {
            winnerId,
            reason // 'last_alive', 'highest_score', etc.
        });
    },

    gameReset() {
        return new Action(ActionType.GAME_RESET, {});
    },

    gameNextTurn(turnCount, currentPlayerId) {
        return new Action(ActionType.GAME_NEXT_TURN, {
            turnCount,
            currentPlayerId
        });
    },

    // Explosion actions
    explosionCreate(explosionId, cells, duration) {
        return new Action(ActionType.EXPLOSION_CREATE, {
            explosionId,
            cells, // Array of {x, y}
            duration // Duration in ms or turns
        });
    },

    explosionExpire(explosionId) {
        return new Action(ActionType.EXPLOSION_EXPIRE, {
            explosionId
        });
    },

    // Batch actions
    batch(actions) {
        return new Action(ActionType.BATCH_ACTIONS, {
            actions: actions.map(a => a.toJSON())
        });
    }
};

/**
 * Action Validator - Ensures actions are valid before application
 */
class ActionValidator {
    /**
     * Validate an action against current game state
     * @param {Action} action - Action to validate
     * @param {GameState} state - Current game state
     * @returns {Object} {valid: boolean, errors: string[]}
     */
    static validate(action, state) {
        const errors = [];

        switch (action.type) {
            case ActionType.PLAYER_MOVE:
                const moveErrors = this.validatePlayerMove(action, state);
                errors.push(...moveErrors);
                break;

            case ActionType.PLAYER_PLACE_BOMB:
                const bombErrors = this.validatePlaceBomb(action, state);
                errors.push(...bombErrors);
                break;

            // Add validation for other action types as needed

            default:
                // Unknown action type
                break;
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validatePlayerMove(action, state) {
        const errors = [];
        const { playerId, toX, toY } = action.payload;

        // Validate player exists
        const player = state.entities.players.find(p => p.id === playerId);
        if (!player) {
            errors.push(`Player ${playerId} does not exist`);
            return errors;
        }

        // Validate player is alive
        if (!player.alive) {
            errors.push(`Player ${playerId} is dead`);
        }

        // Validate bounds
        if (toX < 0 || toX >= state.config.gridWidth || toY < 0 || toY >= state.config.gridHeight) {
            errors.push(`Target position (${toX}, ${toY}) is out of bounds`);
        }

        // Validate cell is passable (will be implemented in engine)
        // This is a placeholder - actual validation happens in engine

        return errors;
    }

    static validatePlaceBomb(action, state) {
        const errors = [];
        const { playerId, x, y } = action.payload;

        const player = state.entities.players.find(p => p.id === playerId);
        if (!player) {
            errors.push(`Player ${playerId} does not exist`);
            return errors;
        }

        if (!player.alive) {
            errors.push(`Player ${playerId} is dead`);
        }

        if (player.hasBomb) {
            errors.push(`Player ${playerId} already has a bomb placed`);
        }

        return errors;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ActionType,
        Action,
        ActionCreators,
        ActionValidator
    };
}
