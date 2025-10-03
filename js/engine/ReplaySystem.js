// history.js - Game history and timeline management for replay functionality
// Enables time-travel, replay, and state restoration

/**
 * History Entry
 *
 * Represents a single point in the game timeline
 */
class HistoryEntry {
    constructor(state, action, turnNumber, timestamp = Date.now()) {
        this.state = state; // GameState snapshot
        this.action = action; // Action that led to this state (null for initial)
        this.turnNumber = turnNumber;
        this.timestamp = timestamp;
        this.id = `entry_${turnNumber}_${timestamp}`;
    }

    toJSON() {
        return {
            state: this.state.toJSON(),
            action: this.action ? this.action.toJSON() : null,
            turnNumber: this.turnNumber,
            timestamp: this.timestamp,
            id: this.id
        };
    }

    static fromJSON(json) {
        const state = GameState.fromJSON(json.state);
        const action = json.action ? Action.fromJSON(json.action) : null;
        return new HistoryEntry(state, action, json.turnNumber, json.timestamp);
    }
}

/**
 * GameHistory
 *
 * Manages complete game timeline for replay and time-travel functionality
 *
 * Features:
 * - Record all state changes and actions
 * - Rewind/fast-forward through history
 * - Jump to specific turns
 * - Export/import history for playback
 * - Branch timelines (for what-if scenarios)
 */
class GameHistory {
    constructor() {
        this.entries = []; // Array of HistoryEntry
        this.currentIndex = -1; // Current position in history
        this.maxEntries = 10000; // Maximum history size (prevent memory issues)
        this.branches = new Map(); // For alternative timelines
        this.checkpoints = new Map(); // Named save points
    }

    /**
     * Record initial state
     * @param {GameState} state
     */
    recordInitial(state) {
        const entry = new HistoryEntry(state, null, 0);
        this.entries = [entry];
        this.currentIndex = 0;
    }

    /**
     * Record state change with action
     * @param {GameState} newState
     * @param {Action} action
     */
    record(newState, action) {
        // If we're not at the end of history, we're creating a branch
        if (this.currentIndex < this.entries.length - 1) {
            // Truncate history after current point (overwrite future)
            this.entries = this.entries.slice(0, this.currentIndex + 1);
        }

        const entry = new HistoryEntry(
            newState,
            action,
            newState.metadata.turnCount,
            Date.now()
        );

        this.entries.push(entry);
        this.currentIndex++;

        // Enforce max size (remove oldest entries)
        if (this.entries.length > this.maxEntries) {
            const removeCount = this.entries.length - this.maxEntries;
            this.entries.splice(0, removeCount);
            this.currentIndex -= removeCount;
        }
    }

    /**
     * Get current state
     * @returns {GameState|null}
     */
    getCurrentState() {
        if (this.currentIndex < 0 || this.currentIndex >= this.entries.length) {
            return null;
        }
        return this.entries[this.currentIndex].state;
    }

    /**
     * Get current entry
     * @returns {HistoryEntry|null}
     */
    getCurrentEntry() {
        if (this.currentIndex < 0 || this.currentIndex >= this.entries.length) {
            return null;
        }
        return this.entries[this.currentIndex];
    }

    /**
     * Can we go back in history?
     * @returns {boolean}
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Can we go forward in history?
     * @returns {boolean}
     */
    canRedo() {
        return this.currentIndex < this.entries.length - 1;
    }

    /**
     * Go back one step
     * @returns {GameState|null}
     */
    undo() {
        if (!this.canUndo()) return null;
        this.currentIndex--;
        return this.getCurrentState();
    }

    /**
     * Go forward one step
     * @returns {GameState|null}
     */
    redo() {
        if (!this.canRedo()) return null;
        this.currentIndex++;
        return this.getCurrentState();
    }

    /**
     * Jump to specific turn
     * @param {number} turnNumber
     * @returns {GameState|null}
     */
    jumpToTurn(turnNumber) {
        const index = this.entries.findIndex(e => e.turnNumber === turnNumber);
        if (index === -1) return null;

        this.currentIndex = index;
        return this.getCurrentState();
    }

    /**
     * Jump to specific index
     * @param {number} index
     * @returns {GameState|null}
     */
    jumpToIndex(index) {
        if (index < 0 || index >= this.entries.length) return null;
        this.currentIndex = index;
        return this.getCurrentState();
    }

    /**
     * Jump to beginning
     * @returns {GameState}
     */
    jumpToStart() {
        this.currentIndex = 0;
        return this.getCurrentState();
    }

    /**
     * Jump to end
     * @returns {GameState}
     */
    jumpToEnd() {
        this.currentIndex = this.entries.length - 1;
        return this.getCurrentState();
    }

    /**
     * Get all turns (for timeline scrubbing)
     * @returns {Array<{turnNumber, timestamp, hasBombs, alivePlayers}>}
     */
    getTurns() {
        return this.entries.map(entry => ({
            turnNumber: entry.turnNumber,
            timestamp: entry.timestamp,
            hasBombs: entry.state.entities.bombs.length > 0,
            alivePlayers: entry.state.getAlivePlayers().length,
            hasExplosions: entry.state.entities.explosions.length > 0
        }));
    }

    /**
     * Get entries in range
     * @param {number} startTurn
     * @param {number} endTurn
     * @returns {Array<HistoryEntry>}
     */
    getRange(startTurn, endTurn) {
        return this.entries.filter(e =>
            e.turnNumber >= startTurn && e.turnNumber <= endTurn
        );
    }

    /**
     * Create checkpoint (named save point)
     * @param {string} name
     * @param {number} index - Optional, defaults to current
     */
    createCheckpoint(name, index = null) {
        const checkpointIndex = index !== null ? index : this.currentIndex;
        if (checkpointIndex < 0 || checkpointIndex >= this.entries.length) {
            throw new Error('Invalid checkpoint index');
        }

        this.checkpoints.set(name, {
            index: checkpointIndex,
            entry: this.entries[checkpointIndex],
            createdAt: Date.now()
        });
    }

    /**
     * Load checkpoint
     * @param {string} name
     * @returns {GameState|null}
     */
    loadCheckpoint(name) {
        const checkpoint = this.checkpoints.get(name);
        if (!checkpoint) return null;

        this.currentIndex = checkpoint.index;
        return this.getCurrentState();
    }

    /**
     * List all checkpoints
     * @returns {Array<{name, turnNumber, timestamp}>}
     */
    listCheckpoints() {
        const result = [];
        for (const [name, checkpoint] of this.checkpoints.entries()) {
            result.push({
                name,
                turnNumber: checkpoint.entry.turnNumber,
                timestamp: checkpoint.createdAt
            });
        }
        return result;
    }

    /**
     * Delete checkpoint
     * @param {string} name
     */
    deleteCheckpoint(name) {
        this.checkpoints.delete(name);
    }

    /**
     * Get statistics about history
     * @returns {Object}
     */
    getStats() {
        const current = this.getCurrentEntry();

        return {
            totalEntries: this.entries.length,
            currentIndex: this.currentIndex,
            currentTurn: current ? current.turnNumber : 0,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            checkpointCount: this.checkpoints.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage in bytes
     * @returns {number}
     */
    estimateMemoryUsage() {
        // Rough estimate: each entry ~2KB
        return this.entries.length * 2048;
    }

    /**
     * Clear history (keep only current state)
     */
    clear() {
        if (this.currentIndex >= 0 && this.currentIndex < this.entries.length) {
            const currentEntry = this.entries[this.currentIndex];
            this.entries = [currentEntry];
            this.currentIndex = 0;
        } else {
            this.entries = [];
            this.currentIndex = -1;
        }
        this.checkpoints.clear();
    }

    /**
     * Export history to JSON (for save/load)
     * @param {Object} options - {includeCheckpoints, startTurn, endTurn}
     * @returns {Object}
     */
    toJSON(options = {}) {
        const {
            includeCheckpoints = true,
            startTurn = null,
            endTurn = null
        } = options;

        let entries = this.entries;

        // Filter by turn range if specified
        if (startTurn !== null || endTurn !== null) {
            entries = entries.filter(e => {
                if (startTurn !== null && e.turnNumber < startTurn) return false;
                if (endTurn !== null && e.turnNumber > endTurn) return false;
                return true;
            });
        }

        const result = {
            version: '1.0.0',
            entries: entries.map(e => e.toJSON()),
            currentIndex: this.currentIndex,
            maxEntries: this.maxEntries
        };

        if (includeCheckpoints) {
            result.checkpoints = {};
            for (const [name, checkpoint] of this.checkpoints.entries()) {
                result.checkpoints[name] = {
                    index: checkpoint.index,
                    turnNumber: checkpoint.entry.turnNumber,
                    createdAt: checkpoint.createdAt
                };
            }
        }

        return result;
    }

    /**
     * Import history from JSON
     * @param {Object} json
     * @returns {GameHistory}
     */
    static fromJSON(json) {
        const history = new GameHistory();
        history.entries = json.entries.map(e => HistoryEntry.fromJSON(e));
        history.currentIndex = json.currentIndex;
        history.maxEntries = json.maxEntries || 10000;

        if (json.checkpoints) {
            for (const [name, checkpoint] of Object.entries(json.checkpoints)) {
                const entry = history.entries[checkpoint.index];
                if (entry) {
                    history.checkpoints.set(name, {
                        index: checkpoint.index,
                        entry,
                        createdAt: checkpoint.createdAt
                    });
                }
            }
        }

        return history;
    }

    /**
     * Export replay data (compressed, action-only format)
     * @returns {Object}
     */
    toReplayData() {
        // For replay, we only need initial state + actions
        // This is much more compact than storing all states

        if (this.entries.length === 0) return null;

        const initialState = this.entries[0].state;
        const actions = this.entries
            .slice(1)
            .map(e => e.action ? e.action.toJSON() : null)
            .filter(a => a !== null);

        return {
            version: '1.0.0',
            type: 'replay',
            initialState: initialState.toJSON(),
            actions,
            metadata: {
                totalTurns: this.entries[this.entries.length - 1].turnNumber,
                recordedAt: Date.now(),
                playerCount: initialState.entities.players.length
            }
        };
    }

    /**
     * Debug output
     * @returns {string}
     */
    toString() {
        return `GameHistory(entries=${this.entries.length}, index=${this.currentIndex}, checkpoints=${this.checkpoints.size})`;
    }
}

/**
 * Replay Player
 *
 * Plays back recorded game history
 */
class ReplayPlayer {
    constructor(history) {
        this.history = history;
        this.playing = false;
        this.speed = 1.0; // Playback speed multiplier
        this.loop = false;
        this.onStateChange = null; // Callback when state changes
    }

    /**
     * Start playback from current position
     */
    play() {
        this.playing = true;
    }

    /**
     * Pause playback
     */
    pause() {
        this.playing = false;
    }

    /**
     * Stop and reset to beginning
     */
    stop() {
        this.playing = false;
        this.history.jumpToStart();
        if (this.onStateChange) {
            this.onStateChange(this.history.getCurrentState());
        }
    }

    /**
     * Step forward one turn
     */
    stepForward() {
        const state = this.history.redo();
        if (state && this.onStateChange) {
            this.onStateChange(state);
        }
        return state;
    }

    /**
     * Step backward one turn
     */
    stepBackward() {
        const state = this.history.undo();
        if (state && this.onStateChange) {
            this.onStateChange(state);
        }
        return state;
    }

    /**
     * Update (call this in game loop during playback)
     * @param {number} deltaTime - Time since last update (ms)
     * @returns {boolean} - True if still playing
     */
    update(deltaTime) {
        if (!this.playing) return false;

        // Auto-advance based on speed
        // At speed=1.0, advance every 1000ms (1 turn per second)
        const msPerTurn = 1000 / this.speed;

        // This is simplified - real implementation would need timing logic
        const shouldAdvance = true; // Placeholder

        if (shouldAdvance && this.history.canRedo()) {
            this.stepForward();
            return true;
        } else {
            // Reached end
            if (this.loop) {
                this.history.jumpToStart();
                if (this.onStateChange) {
                    this.onStateChange(this.history.getCurrentState());
                }
                return true;
            } else {
                this.playing = false;
                return false;
            }
        }
    }

    /**
     * Set playback speed
     * @param {number} speed - 0.1 to 10.0
     */
    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(speed, 10.0));
    }

    /**
     * Jump to progress (0.0 to 1.0)
     * @param {number} progress
     */
    seekToProgress(progress) {
        const index = Math.floor(progress * (this.history.entries.length - 1));
        const state = this.history.jumpToIndex(index);
        if (state && this.onStateChange) {
            this.onStateChange(state);
        }
    }

    /**
     * Get current progress (0.0 to 1.0)
     * @returns {number}
     */
    getProgress() {
        if (this.history.entries.length <= 1) return 0;
        return this.history.currentIndex / (this.history.entries.length - 1);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HistoryEntry,
        GameHistory,
        ReplayPlayer
    };
}
