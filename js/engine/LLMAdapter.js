// LLMAdapter.js - Generic LLM API integration for turn-based games
// Supports OpenAI, Groq, and other providers

/**
 * LLMAdapter - Generic interface for LLM API calls
 * Game-agnostic: Prompt generation is delegated to game implementation
 */
class LLMAdapter {
    constructor() {
        this.apiKey = null;
        this.apiProvider = null; // 'openai' or 'groq'
        this.apiUrl = null;
        this.tacticalModel = null;
        this.memoryModel = null;

        // Player memory/thoughts (game-agnostic storage)
        this.playerMemory = {}; // {playerId: "memory text"}
        this.playerThoughts = {}; // {playerId: "current thought"}

        this.errorCallback = null;
    }

    /**
     * Set error callback for UI notifications
     */
    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    /**
     * Set API key and auto-detect provider
     * @param {string} key - API key
     */
    setApiKey(key) {
        this.apiKey = key;

        // Detect API provider by key prefix
        if (key.startsWith('gsk_')) {
            this.apiProvider = 'groq';
            this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
            this.tacticalModel = 'moonshotai/kimi-k2-instruct-0905';
            this.memoryModel = 'moonshotai/kimi-k2-instruct-0905';
            console.log('[LLM] Detected Groq Cloud API key - using Kimi K2 model');
        } else if (key.startsWith('sk-')) {
            this.apiProvider = 'openai';
            this.apiUrl = 'https://api.openai.com/v1/chat/completions';
            this.tacticalModel = 'gpt-4.1-mini';
            this.memoryModel = 'gpt-4.1-mini';
            console.log('[LLM] Detected OpenAI API key - using GPT-4.1-mini model');
        } else {
            // Default to OpenAI for unknown prefixes
            this.apiProvider = 'openai';
            this.apiUrl = 'https://api.openai.com/v1/chat/completions';
            this.tacticalModel = 'gpt-4.1-mini';
            this.memoryModel = 'gpt-4.1-mini';
            console.log('[LLM] Unknown API key format - defaulting to OpenAI');
        }

        localStorage.setItem('openai_api_key', key);
    }

    /**
     * Load API key from storage
     * @returns {boolean} True if key was loaded
     */
    loadApiKey() {
        const stored = localStorage.getItem('openai_api_key');
        if (stored) {
            this.setApiKey(stored);
            return true;
        }
        return false;
    }

    /**
     * Get player memory
     * @param {number} playerId
     * @returns {string}
     */
    getPlayerMemory(playerId) {
        return this.playerMemory[playerId] || 'No previous memory';
    }

    /**
     * Save player memory
     * @param {number} playerId
     * @param {string} memory
     */
    savePlayerMemory(playerId, memory) {
        const words = memory.trim().split(/\s+/);
        const limited = words.slice(0, 50).join(' '); // Limit to 50 words
        this.playerMemory[playerId] = limited;
        localStorage.setItem(`player_${playerId}_memory`, limited);
    }

    /**
     * Load all player memories from storage
     */
    loadPlayerMemories() {
        for (let i = 1; i <= 10; i++) {
            const stored = localStorage.getItem(`player_${i}_memory`);
            if (stored) {
                this.playerMemory[i] = stored;
            }
        }
    }

    /**
     * Clear all player memories
     */
    clearAllMemories() {
        console.log('[LLM] Clearing all player memories');
        for (let i = 1; i <= 10; i++) {
            this.playerMemory[i] = '';
            this.playerThoughts[i] = '';
            localStorage.removeItem(`player_${i}_memory`);
        }
    }

    /**
     * Get player's current thought (for display)
     * @param {number} playerId
     * @returns {string}
     */
    getPlayerThought(playerId) {
        return this.playerThoughts[playerId] || '';
    }

    /**
     * Get AI move for a player
     * @param {Object} gameState - Current game state
     * @param {number} playerId - Player to get move for
     * @param {Object} game - Game instance (for prompt generation)
     * @returns {Promise<Object>} Move object
     */
    async getPlayerMove(gameState, playerId, game) {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.alive) {
            return null;
        }

        // Get game-specific prompt
        const prompt = game.getLLMPrompt(gameState, playerId);

        try {
            console.log(`[LLM P${playerId}] Requesting move from ${this.tacticalModel} (${this.apiProvider})`);

            const requestBody = {
                model: this.tacticalModel,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user }
                ],
                temperature: 0.7,
                max_tokens: 200
            };

            // Add structured output for OpenAI (Groq doesn't support json_schema)
            if (this.apiProvider === 'openai' && prompt.responseFormat) {
                requestBody.response_format = prompt.responseFormat;
            } else {
                requestBody.response_format = { type: "json_object" };
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error(`[LLM P${playerId}] API error ${response.status}:`, error);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            const move = JSON.parse(content);

            // Validate move using game's validator
            const validation = game.validateMove(gameState, playerId, move);
            if (!validation.valid) {
                console.warn(`[LLM P${playerId}] Invalid move from AI:`, validation.errors);
                return this.getRandomMove(gameState, playerId, game);
            }

            // Save thought for display
            if (move.thought) {
                this.playerThoughts[playerId] = move.thought;
            }

            console.log(`[LLM P${playerId}] Move:`, move);
            return move;

        } catch (error) {
            console.error(`[LLM P${playerId}] Exception:`, error);
            return this.getRandomMove(gameState, playerId, game);
        }
    }

    /**
     * Get moves for all alive players in parallel
     * @param {Object} gameState - Current game state
     * @param {Object} game - Game instance
     * @returns {Promise<Object>} Map of playerId -> move
     */
    async getAllPlayerMoves(gameState, game) {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        console.log('[LLM] Requesting moves for all alive players in parallel');

        // Create promises for all alive players
        const movePromises = gameState.players
            .filter(p => p.alive)
            .map(p => this.getPlayerMove(gameState, p.id, game));

        // Execute in parallel
        const moves = await Promise.all(movePromises);

        // Build result map
        const result = {};
        gameState.players.forEach((p, index) => {
            if (p.alive) {
                const aliveIndex = gameState.players
                    .filter((p2, i) => i < index && p2.alive)
                    .length;
                result[p.id] = moves[aliveIndex];
            }
        });

        console.log('[LLM] All moves received:', result);
        return result;
    }

    /**
     * Fallback: get random valid move from game
     * @param {Object} gameState
     * @param {number} playerId
     * @param {Object} game - Game instance
     * @returns {Object} Random valid move
     */
    getRandomMove(gameState, playerId, game) {
        console.log(`[LLM P${playerId}] Using random move fallback`);

        // Delegate to game to generate random valid move
        if (typeof game.getRandomMove === 'function') {
            return game.getRandomMove(gameState, playerId);
        }

        // Default fallback if game doesn't implement getRandomMove
        console.warn(`[LLM P${playerId}] Game does not implement getRandomMove()`);
        return { direction: 'stay', dropBomb: false };
    }

    /**
     * Update player memory using smaller model (async background task)
     * @param {Object} gameState
     * @param {number} playerId
     * @param {Object} moveResult
     * @param {Object} game - Game instance for memory prompt generation
     */
    async updatePlayerMemory(gameState, playerId, moveResult, game) {
        if (!this.apiKey) {
            return;
        }

        try {
            // Get game-specific memory update prompt
            const memoryPrompt = game.getMemoryUpdatePrompt(gameState, playerId, moveResult);

            const requestBody = {
                model: this.memoryModel,
                messages: [
                    { role: 'user', content: memoryPrompt }
                ],
                temperature: 0.3,
                max_tokens: 100,
                response_format: { type: "json_object" }
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                console.error(`[LLM Memory P${playerId}] API error ${response.status}`);
                return;
            }

            const data = await response.json();
            const content = JSON.parse(data.choices[0].message.content);

            if (content.memory) {
                this.savePlayerMemory(playerId, content.memory);
                console.log(`[LLM Memory P${playerId}] Updated: "${content.memory}"`);
            }

        } catch (error) {
            console.error(`[LLM Memory P${playerId}] Failed to update:`, error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLMAdapter };
}
