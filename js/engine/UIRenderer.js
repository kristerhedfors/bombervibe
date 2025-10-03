// UIRenderer.js - Abstract rendering interface for game engines
// Game implementations provide their own renderer following this interface

/**
 * Abstract UIRenderer Interface
 * All game renderers must implement these methods
 */
class IUIRenderer {
    /**
     * Initialize renderer with game instance
     * @param {IGame} game - Game instance
     * @param {Object} config - Renderer configuration
     */
    initialize(game, config) {
        throw new Error('initialize() must be implemented by renderer');
    }

    /**
     * Render current game state
     * @param {Object} gameState - Current game state
     */
    render(gameState) {
        throw new Error('render() must be implemented by renderer');
    }

    /**
     * Show game over screen
     * @param {Object} winner - Winner data
     * @param {IGame} game - Game instance
     */
    showGameOver(winner, game) {
        throw new Error('showGameOver() must be implemented by renderer');
    }

    /**
     * Update UI info (turn counter, scores, etc.)
     * @param {Object} gameState - Current game state
     */
    updateInfo(gameState) {
        throw new Error('updateInfo() must be implemented by renderer');
    }

    /**
     * Clear/reset renderer
     */
    clear() {
        throw new Error('clear() must be implemented by renderer');
    }

    /**
     * Set up event listeners for manual controls
     * @param {Function} inputHandler - Callback for handling input
     */
    setupInputHandlers(inputHandler) {
        throw new Error('setupInputHandlers() must be implemented by renderer');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {Object} details - Error details
     */
    showError(message, details) {
        throw new Error('showError() must be implemented by renderer');
    }
}

/**
 * BaseUIRenderer - Provides common rendering utilities
 * Game-specific renderers can extend this class
 */
class BaseUIRenderer extends IUIRenderer {
    constructor() {
        super();
        this.game = null;
        this.config = null;
    }

    initialize(game, config = {}) {
        this.game = game;
        this.config = {
            containerId: config.containerId || 'gameContainer',
            gridId: config.gridId || 'grid',
            infoId: config.infoId || 'gameInfo',
            ...config
        };
    }

    /**
     * Log message to game log (if available)
     * @param {string} message
     * @param {string} type - 'info', 'error', 'success'
     */
    log(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        if (!logContent) return;

        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${timestamp}] ${message}`;

        // Color code by type
        if (type === 'error') {
            entry.style.color = '#ff3300';
        } else if (type === 'success') {
            entry.style.color = '#00ff00';
        }

        logContent.insertBefore(entry, logContent.firstChild);

        // Keep only last 20 messages
        while (logContent.children.length > 20) {
            logContent.removeChild(logContent.lastChild);
        }
    }

    /**
     * Show modal with message
     * @param {string} title
     * @param {string} message
     */
    showModal(title, message) {
        // Basic modal implementation - games can override
        alert(`${title}\n\n${message}`);
    }

    /**
     * Get element by ID with error checking
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`[UIRenderer] Element not found: ${id}`);
        }
        return element;
    }

    /**
     * Create element with classes and content
     * @param {string} tag - HTML tag
     * @param {string|string[]} classes - CSS class(es)
     * @param {string} content - Text content
     * @returns {HTMLElement}
     */
    createElement(tag, classes = [], content = '') {
        const element = document.createElement(tag);

        if (typeof classes === 'string') {
            element.className = classes;
        } else if (Array.isArray(classes)) {
            element.className = classes.join(' ');
        }

        if (content) {
            element.textContent = content;
        }

        return element;
    }

    /**
     * Request animation frame with fallback
     * @param {Function} callback
     * @returns {number} Animation frame ID
     */
    requestFrame(callback) {
        return window.requestAnimationFrame(callback);
    }

    /**
     * Cancel animation frame
     * @param {number} id - Animation frame ID
     */
    cancelFrame(id) {
        if (id) {
            window.cancelAnimationFrame(id);
        }
    }

    /**
     * Default error display
     */
    showError(message, details = null) {
        console.error('[UIRenderer Error]', message, details);
        this.log(`ERROR: ${message}`, 'error');

        if (details && typeof details === 'object') {
            console.error('Error details:', details);
        }
    }

    /**
     * Default game over screen
     */
    showGameOver(winner, game) {
        const container = this.getElement(this.config.containerId);
        if (!container) return;

        const overlay = this.createElement('div', 'game-over-overlay');
        overlay.innerHTML = `
            <div class="game-over-content">
                <h1>GAME OVER!</h1>
                <h2>Winner: ${winner ? winner.name : 'None'}</h2>
                <p>Score: ${winner ? winner.score : 0}</p>
                <button onclick="location.reload()">Play Again</button>
            </div>
        `;

        container.appendChild(overlay);
        this.log('Game Over!', 'info');
    }

    /**
     * Clear renderer
     */
    clear() {
        const grid = this.getElement(this.config.gridId);
        if (grid) {
            grid.innerHTML = '';
        }
    }

    /**
     * Default input handler setup
     */
    setupInputHandlers(inputHandler) {
        // Basic keyboard input - games can override
        document.addEventListener('keydown', (e) => {
            if (inputHandler) {
                inputHandler(e);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IUIRenderer, BaseUIRenderer };
}
