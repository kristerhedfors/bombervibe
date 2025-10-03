// GameEngine.js - Generic turn-based game engine
// Provides core game loop functionality for any turn-based game with LLM players

/**
 * Abstract Game Interface
 * All game implementations must implement this interface
 */
class IGame {
    /**
     * Initialize game with configuration
     * @param {Object} config - Game-specific configuration
     */
    initialize(config) {
        throw new Error('initialize() must be implemented by game');
    }

    /**
     * Get current game state in format suitable for AI
     * @returns {Object} Game state
     */
    getGameState() {
        throw new Error('getGameState() must be implemented by game');
    }

    /**
     * Process a player move and update game state
     * @param {number} playerId - Player making the move
     * @param {Object} move - Move data from AI/player
     * @returns {boolean} Success of move execution
     */
    processMove(playerId, move) {
        throw new Error('processMove() must be implemented by game');
    }

    /**
     * Check if game is over
     * @returns {boolean}
     */
    isGameOver() {
        throw new Error('isGameOver() must be implemented by game');
    }

    /**
     * Get game winner (null if not over)
     * @returns {Object|null} Winner data
     */
    getWinner() {
        throw new Error('getWinner() must be implemented by game');
    }

    /**
     * Get LLM prompt for a player's turn
     * @param {Object} gameState - Current game state
     * @param {number} playerId - Player to generate prompt for
     * @returns {string} Prompt text
     */
    getLLMPrompt(gameState, playerId) {
        throw new Error('getLLMPrompt() must be implemented by game');
    }

    /**
     * Validate a move before execution
     * @param {Object} gameState - Current game state
     * @param {number} playerId - Player making move
     * @param {Object} move - Move to validate
     * @returns {Object} {valid: boolean, errors: string[]}
     */
    validateMove(gameState, playerId, move) {
        throw new Error('validateMove() must be implemented by game');
    }

    /**
     * Get next player (for turn rotation)
     * @returns {Object} Next player
     */
    getNextPlayer() {
        throw new Error('getNextPlayer() must be implemented by game');
    }

    /**
     * Advance to next turn
     */
    nextTurn() {
        throw new Error('nextTurn() must be implemented by game');
    }

    /**
     * Start the game
     */
    start() {
        throw new Error('start() must be implemented by game');
    }

    /**
     * Pause the game
     */
    pause() {
        throw new Error('pause() must be implemented by game');
    }

    /**
     * Reset the game
     */
    reset() {
        throw new Error('reset() must be implemented by game');
    }

    /**
     * Get current player
     * @returns {Object} Current player
     */
    getCurrentPlayer() {
        throw new Error('getCurrentPlayer() must be implemented by game');
    }
}

/**
 * GameEngine - Orchestrates game loop, AI integration, and rendering
 */
class GameEngine {
    /**
     * Create a game engine instance
     * @param {IGame} game - Game implementation
     * @param {LLMAdapter} llmAdapter - LLM integration adapter
     * @param {Object} renderer - Rendering interface
     */
    constructor(game, llmAdapter, renderer) {
        this.game = game;
        this.llm = llmAdapter;
        this.renderer = renderer;

        this.running = false;
        this.paused = false;
        this.turnInProgress = false;
        this.lastTurnTime = 0;
        this.animationFrameId = null;
    }

    /**
     * Initialize engine and game
     * @param {Object} config - Engine and game configuration
     */
    initialize(config = {}) {
        this.config = {
            turnDelay: config.turnDelay || 1000, // ms between turns
            autoPlay: config.autoPlay !== undefined ? config.autoPlay : true,
            parallelAI: config.parallelAI !== undefined ? config.parallelAI : true,
            ...config
        };

        this.game.initialize(config);
        this.renderer.initialize(this.game, config);
    }

    /**
     * Start game engine
     */
    start() {
        this.game.start();
        this.running = true;
        this.paused = false;
        this.gameLoop();
    }

    /**
     * Pause/resume game
     */
    pause() {
        this.game.pause();
        this.paused = !this.paused;
        if (!this.paused && this.running) {
            this.gameLoop();
        }
    }

    /**
     * Stop and reset game
     */
    reset() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.running = false;
        this.paused = false;
        this.turnInProgress = false;
        this.lastTurnTime = 0;
        this.game.reset();
        this.renderer.render(this.game.getGameState());
    }

    /**
     * Main game loop
     */
    async gameLoop() {
        if (!this.running || this.paused) {
            return;
        }

        const now = Date.now();

        // Check for game over
        if (this.game.isGameOver()) {
            this.endGame();
            return;
        }

        // Execute turn if enough time has passed and not already in progress
        if (!this.turnInProgress && now - this.lastTurnTime >= this.config.turnDelay) {
            await this.executeTurn();
            this.lastTurnTime = now;
        }

        // Render current state (after turn execution so explosions are visible)
        const state = this.game.getGameState();
        this.renderer.render(state);

        // Continue loop
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Execute one turn (get AI moves and process)
     */
    async executeTurn() {
        this.turnInProgress = true;

        try {
            const gameState = this.game.getGameState();

            // Get move from current player (or all players in parallel mode)
            if (this.config.parallelAI) {
                await this.executeParallelTurn(gameState);
            } else {
                await this.executeSequentialTurn(gameState);
            }

            // Advance to next turn
            this.game.nextTurn();

        } catch (error) {
            console.error('[GameEngine] Turn execution error:', error);
            this.game.nextTurn(); // Advance even on error
        } finally {
            this.turnInProgress = false;
        }
    }

    /**
     * Execute turn with parallel AI requests (all players think simultaneously)
     */
    async executeParallelTurn(gameState) {
        // Get all AI moves in parallel
        const moves = await this.llm.getAllPlayerMoves(gameState, this.game);

        // Process moves sequentially in order
        for (const [playerId, move] of Object.entries(moves)) {
            if (move) {
                const player = gameState.players.find(p => p.id === parseInt(playerId));
                if (player && player.alive) {
                    this.game.processMove(parseInt(playerId), move);
                }
            }
        }
    }

    /**
     * Execute turn with sequential AI requests (one player at a time)
     */
    async executeSequentialTurn(gameState) {
        const currentPlayer = this.game.getCurrentPlayer();

        if (currentPlayer && currentPlayer.alive) {
            const move = await this.llm.getPlayerMove(gameState, currentPlayer.id, this.game);
            if (move) {
                this.game.processMove(currentPlayer.id, move);
            }
        }
    }

    /**
     * Handle game end
     */
    endGame() {
        this.running = false;
        const winner = this.game.getWinner();
        this.renderer.showGameOver(winner, this.game);
    }

    /**
     * Handle manual player input
     * @param {number} playerId - Player making manual move
     * @param {Object} move - Manual move data
     */
    handleManualMove(playerId, move) {
        if (!this.running || this.paused) {
            return false;
        }

        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer.id !== playerId) {
            return false; // Not this player's turn
        }

        // Validate and process move
        const validation = this.game.validateMove(this.game.getGameState(), playerId, move);
        if (!validation.valid) {
            console.warn('[GameEngine] Invalid manual move:', validation.errors);
            return false;
        }

        const success = this.game.processMove(playerId, move);
        if (success) {
            this.renderer.render(this.game.getGameState());
            this.game.nextTurn();
        }
        return success;
    }

    /**
     * Get current game state
     * @returns {Object}
     */
    getState() {
        return this.game.getGameState();
    }

    /**
     * Check if game is running
     * @returns {boolean}
     */
    isRunning() {
        return this.running;
    }

    /**
     * Check if game is paused
     * @returns {boolean}
     */
    isPaused() {
        return this.paused;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameEngine, IGame };
}
