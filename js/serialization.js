// serialization.js - Save/load functionality for game state and history
// Enables position continuation and save/load features

/**
 * Serialization Manager
 *
 * Handles conversion of game data to/from various formats:
 * - JSON for save files
 * - Compressed format for sharing
 * - URL-safe format for links
 */
class SerializationManager {
    constructor() {
        this.version = '1.0.0';
    }

    /**
     * Serialize complete game session to JSON
     * @param {GameState} state
     * @param {GameHistory} history
     * @param {Object} metadata - Additional save data
     * @returns {Object}
     */
    serializeSession(state, history, metadata = {}) {
        return {
            version: this.version,
            type: 'game_session',
            timestamp: Date.now(),
            state: state.toJSON(),
            history: history.toJSON(),
            metadata: {
                playerNames: state.entities.players.map(p => p.name),
                totalTurns: state.metadata.turnCount,
                gameStartTime: state.metadata.gameStartTime,
                ...metadata
            }
        };
    }

    /**
     * Deserialize game session from JSON
     * @param {Object} json
     * @returns {Object} - {state, history, metadata}
     */
    deserializeSession(json) {
        if (json.version !== this.version) {
            console.warn(`Version mismatch: expected ${this.version}, got ${json.version}`);
        }

        if (json.type !== 'game_session') {
            throw new Error(`Invalid save file type: ${json.type}`);
        }

        return {
            state: GameState.fromJSON(json.state),
            history: GameHistory.fromJSON(json.history),
            metadata: json.metadata
        };
    }

    /**
     * Serialize only current state (for quick save)
     * @param {GameState} state
     * @returns {Object}
     */
    serializeState(state) {
        return {
            version: this.version,
            type: 'game_state',
            timestamp: Date.now(),
            state: state.toJSON()
        };
    }

    /**
     * Deserialize state
     * @param {Object} json
     * @returns {GameState}
     */
    deserializeState(json) {
        if (json.type !== 'game_state') {
            throw new Error(`Invalid type: expected game_state, got ${json.type}`);
        }

        return GameState.fromJSON(json.state);
    }

    /**
     * Serialize replay data (minimal format for sharing)
     * @param {GameHistory} history
     * @returns {Object}
     */
    serializeReplay(history) {
        return history.toReplayData();
    }

    /**
     * Export to downloadable JSON file
     * @param {Object} data - Serialized data
     * @param {string} filename
     */
    exportToFile(data, filename = 'bombervibe_save.json') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import from file
     * @param {File} file
     * @returns {Promise<Object>}
     */
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    resolve(json);
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Compress JSON data (simple compression)
     * @param {Object} data
     * @returns {string} - Base64 encoded compressed string
     */
    compress(data) {
        const json = JSON.stringify(data);

        // For browsers that support CompressionStream (modern browsers)
        if (typeof CompressionStream !== 'undefined') {
            // This would require async/stream handling
            // Simplified version: just base64 encode for now
            return btoa(json);
        }

        // Fallback: just base64 encode
        return btoa(json);
    }

    /**
     * Decompress data
     * @param {string} compressed - Base64 encoded string
     * @returns {Object}
     */
    decompress(compressed) {
        try {
            const json = atob(compressed);
            return JSON.parse(json);
        } catch (error) {
            throw new Error(`Failed to decompress data: ${error.message}`);
        }
    }

    /**
     * Create shareable URL with game state
     * @param {GameState} state
     * @returns {string}
     */
    createShareableURL(state) {
        const data = this.serializeState(state);
        const compressed = this.compress(data);

        // URL-safe base64
        const urlSafe = compressed
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const baseURL = window.location.origin + window.location.pathname;
        return `${baseURL}#state=${urlSafe}`;
    }

    /**
     * Load state from URL fragment
     * @returns {GameState|null}
     */
    loadFromURL() {
        const hash = window.location.hash.substring(1);
        if (!hash.startsWith('state=')) return null;

        const urlSafe = hash.substring(6);

        // Convert URL-safe back to base64
        let compressed = urlSafe
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        // Add padding if needed
        while (compressed.length % 4) {
            compressed += '=';
        }

        try {
            const data = this.decompress(compressed);
            return this.deserializeState(data);
        } catch (error) {
            console.error('Failed to load state from URL:', error);
            return null;
        }
    }
}

/**
 * LocalStorage Manager
 *
 * Handles persistent storage using browser localStorage
 */
class LocalStorageManager {
    constructor(keyPrefix = 'bombervibe_') {
        this.keyPrefix = keyPrefix;
    }

    /**
     * Save game session to localStorage
     * @param {string} slotName - Save slot identifier
     * @param {GameState} state
     * @param {GameHistory} history
     * @param {Object} metadata
     */
    saveSession(slotName, state, history, metadata = {}) {
        const serializer = new SerializationManager();
        const data = serializer.serializeSession(state, history, metadata);

        const key = `${this.keyPrefix}save_${slotName}`;
        localStorage.setItem(key, JSON.stringify(data));

        // Update save slot metadata
        this.updateSaveSlotMetadata(slotName, data);
    }

    /**
     * Load game session from localStorage
     * @param {string} slotName
     * @returns {Object|null} - {state, history, metadata}
     */
    loadSession(slotName) {
        const key = `${this.keyPrefix}save_${slotName}`;
        const json = localStorage.getItem(key);

        if (!json) return null;

        try {
            const data = JSON.parse(json);
            const serializer = new SerializationManager();
            return serializer.deserializeSession(data);
        } catch (error) {
            console.error(`Failed to load save slot ${slotName}:`, error);
            return null;
        }
    }

    /**
     * Quick save current state
     * @param {GameState} state
     */
    quickSave(state) {
        const serializer = new SerializationManager();
        const data = serializer.serializeState(state);

        localStorage.setItem(`${this.keyPrefix}quicksave`, JSON.stringify(data));
    }

    /**
     * Quick load
     * @returns {GameState|null}
     */
    quickLoad() {
        const json = localStorage.getItem(`${this.keyPrefix}quicksave`);
        if (!json) return null;

        try {
            const data = JSON.parse(json);
            const serializer = new SerializationManager();
            return serializer.deserializeState(data);
        } catch (error) {
            console.error('Failed to load quicksave:', error);
            return null;
        }
    }

    /**
     * Auto-save (called periodically)
     * @param {GameState} state
     * @param {GameHistory} history
     */
    autoSave(state, history) {
        const serializer = new SerializationManager();
        const data = serializer.serializeSession(state, history, {
            autoSave: true,
            savedAt: Date.now()
        });

        localStorage.setItem(`${this.keyPrefix}autosave`, JSON.stringify(data));
    }

    /**
     * Load auto-save
     * @returns {Object|null}
     */
    loadAutoSave() {
        const json = localStorage.getItem(`${this.keyPrefix}autosave`);
        if (!json) return null;

        try {
            const data = JSON.parse(json);
            const serializer = new SerializationManager();
            return serializer.deserializeSession(data);
        } catch (error) {
            console.error('Failed to load autosave:', error);
            return null;
        }
    }

    /**
     * List all save slots
     * @returns {Array<Object>}
     */
    listSaveSlots() {
        const metadataKey = `${this.keyPrefix}save_metadata`;
        const json = localStorage.getItem(metadataKey);

        if (!json) return [];

        try {
            return JSON.parse(json);
        } catch (error) {
            console.error('Failed to load save slot metadata:', error);
            return [];
        }
    }

    /**
     * Update save slot metadata
     * @param {string} slotName
     * @param {Object} saveData
     */
    updateSaveSlotMetadata(slotName, saveData) {
        const slots = this.listSaveSlots();

        // Find or create slot entry
        let slot = slots.find(s => s.name === slotName);
        if (!slot) {
            slot = {name: slotName};
            slots.push(slot);
        }

        // Update metadata
        slot.timestamp = saveData.timestamp;
        slot.turnCount = saveData.state.metadata.turnCount;
        slot.alivePlayers = saveData.state.entities.players.filter(p => p.alive).length;

        const metadataKey = `${this.keyPrefix}save_metadata`;
        localStorage.setItem(metadataKey, JSON.stringify(slots));
    }

    /**
     * Delete save slot
     * @param {string} slotName
     */
    deleteSaveSlot(slotName) {
        const key = `${this.keyPrefix}save_${slotName}`;
        localStorage.removeItem(key);

        // Update metadata
        const slots = this.listSaveSlots();
        const filtered = slots.filter(s => s.name !== slotName);

        const metadataKey = `${this.keyPrefix}save_metadata`;
        localStorage.setItem(metadataKey, JSON.stringify(filtered));
    }

    /**
     * Clear all saves
     */
    clearAllSaves() {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith(this.keyPrefix)) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Get storage usage estimate
     * @returns {Object} - {used, available, percentage}
     */
    getStorageUsage() {
        // Calculate size of all bombervibe data
        let totalSize = 0;
        const keys = Object.keys(localStorage);

        for (const key of keys) {
            if (key.startsWith(this.keyPrefix)) {
                const value = localStorage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
            }
        }

        // localStorage typically has 5-10MB limit
        const estimatedLimit = 5 * 1024 * 1024; // 5MB

        return {
            used: totalSize,
            available: estimatedLimit - totalSize,
            percentage: (totalSize / estimatedLimit) * 100,
            usedMB: (totalSize / (1024 * 1024)).toFixed(2),
            availableMB: ((estimatedLimit - totalSize) / (1024 * 1024)).toFixed(2)
        };
    }
}

/**
 * Checkpoint Manager
 *
 * Manages game checkpoints for "continue from position" feature
 */
class CheckpointManager {
    constructor() {
        this.storage = new LocalStorageManager();
        this.maxCheckpoints = 10;
    }

    /**
     * Create checkpoint at current position
     * @param {string} name
     * @param {GameState} state
     * @param {GameHistory} history
     * @param {Object} metadata
     */
    createCheckpoint(name, state, history, metadata = {}) {
        const serializer = new SerializationManager();
        const data = serializer.serializeSession(state, history, {
            checkpointName: name,
            ...metadata
        });

        const key = `checkpoint_${name}`;
        localStorage.setItem(`bombervibe_${key}`, JSON.stringify(data));

        // Add to checkpoint list
        this.addToCheckpointList(name, state);
    }

    /**
     * Load checkpoint
     * @param {string} name
     * @returns {Object|null}
     */
    loadCheckpoint(name) {
        const key = `checkpoint_${name}`;
        const json = localStorage.getItem(`bombervibe_${key}`);

        if (!json) return null;

        try {
            const data = JSON.parse(json);
            const serializer = new SerializationManager();
            return serializer.deserializeSession(data);
        } catch (error) {
            console.error(`Failed to load checkpoint ${name}:`, error);
            return null;
        }
    }

    /**
     * List all checkpoints
     * @returns {Array<Object>}
     */
    listCheckpoints() {
        const json = localStorage.getItem('bombervibe_checkpoints');
        if (!json) return [];

        try {
            return JSON.parse(json);
        } catch (error) {
            return [];
        }
    }

    /**
     * Add checkpoint to list
     * @param {string} name
     * @param {GameState} state
     */
    addToCheckpointList(name, state) {
        const checkpoints = this.listCheckpoints();

        // Remove if exists
        const filtered = checkpoints.filter(cp => cp.name !== name);

        // Add new
        filtered.push({
            name,
            turnCount: state.metadata.turnCount,
            alivePlayers: state.getAlivePlayers().length,
            createdAt: Date.now()
        });

        // Keep only last N checkpoints
        if (filtered.length > this.maxCheckpoints) {
            const removed = filtered.shift();
            this.deleteCheckpoint(removed.name);
        }

        localStorage.setItem('bombervibe_checkpoints', JSON.stringify(filtered));
    }

    /**
     * Delete checkpoint
     * @param {string} name
     */
    deleteCheckpoint(name) {
        const key = `checkpoint_${name}`;
        localStorage.removeItem(`bombervibe_${key}`);

        const checkpoints = this.listCheckpoints();
        const filtered = checkpoints.filter(cp => cp.name !== name);
        localStorage.setItem('bombervibe_checkpoints', JSON.stringify(filtered));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SerializationManager,
        LocalStorageManager,
        CheckpointManager
    };
}
