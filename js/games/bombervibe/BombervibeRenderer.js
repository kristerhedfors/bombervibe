// BombervibeRenderer.js - Bomberman-specific rendering implementation
// Extends BaseUIRenderer to provide Bombervibe visual rendering

class BombervibeRenderer extends BaseUIRenderer {
    constructor() {
        super();
        this.game = null;
        this.llm = null; // Reference to LLM adapter for thoughts
        this.animationFrameId = null;
    }

    /**
     * Initialize renderer (IUIRenderer interface)
     */
    initialize(game, config = {}) {
        super.initialize(game, config);

        this.config = {
            containerId: config.containerId || 'gameContainer',
            gridId: config.gridId || 'grid',
            infoId: config.infoId || 'gameInfo',
            ...config
        };

        this.initializeCoordinateLabels();
    }

    /**
     * Set LLM adapter reference (for accessing player thoughts)
     */
    setLLMAdapter(llm) {
        this.llm = llm;
    }

    /**
     * Initialize coordinate labels (chess notation)
     */
    initializeCoordinateLabels() {
        // Row labels: 11 down to 1
        const rowLabels = document.getElementById('rowLabels');
        if (rowLabels) {
            rowLabels.innerHTML = '';
            for (let i = this.game.GRID_HEIGHT; i >= 1; i--) {
                const label = this.createElement('div', 'coord-label', i.toString());
                rowLabels.appendChild(label);
            }
        }

        // Column labels: A through M
        const colLabels = document.getElementById('colLabels');
        if (colLabels) {
            colLabels.innerHTML = '';
            for (let i = 0; i < this.game.GRID_WIDTH; i++) {
                const label = this.createElement('div', 'coord-label', String.fromCharCode(65 + i));
                colLabels.appendChild(label);
            }
        }
    }

    /**
     * Main render method (IUIRenderer interface)
     */
    render(gameState) {
        this.renderGrid(gameState);
        this.updateScores(gameState);
        this.updateInfo(gameState);
    }

    /**
     * Render game grid with terrain, bombs, explosions
     */
    renderGrid(gameState) {
        const gridElement = this.getElement(this.config.gridId);
        if (!gridElement) return;

        // Clear only non-player elements
        const existingCells = gridElement.querySelectorAll('.cell');
        existingCells.forEach(cell => cell.remove());
        const existingThoughts = gridElement.querySelectorAll('.floating-thought');
        existingThoughts.forEach(thought => thought.remove());

        // Render cells (terrain, bombs, explosions)
        for (let y = 0; y < gameState.grid.length; y++) {
            for (let x = 0; x < gameState.grid[y].length; x++) {
                const cell = this.createElement('div', 'cell');

                const bomb = gameState.bombs.find(b => b.x === x && b.y === y);
                const explosion = gameState.explosions ? gameState.explosions.find(exp =>
                    exp.cells.some(c => c.x === x && c.y === y)
                ) : null;

                // Priority: Explosion > Bomb > Terrain
                if (explosion) {
                    cell.classList.add('explosion');
                    gridElement.appendChild(cell);
                    continue;
                }

                if (bomb) {
                    cell.classList.add('bomb');
                    gridElement.appendChild(cell);
                    continue;
                }

                // Terrain - use block configuration
                const cellType = gameState.grid[y][x];
                const blockConfig = BlockUtils.getBlockConfig(cellType);
                cell.classList.add(blockConfig.className);
                cell.setAttribute('data-block-type', blockConfig.name);

                // Check for loot
                const loot = gameState.loot ? gameState.loot.find(l => l.x === x && l.y === y) : null;
                if (loot) {
                    const lootIcon = this.createElement('div', 'loot-icon');
                    if (loot.type === 'flash_radius') {
                        lootIcon.innerHTML = '⚡';
                        lootIcon.classList.add('flash-radius');
                    } else if (loot.type === 'bomb_pickup') {
                        lootIcon.innerHTML = '🧤';
                        lootIcon.classList.add('bomb-pickup');
                    }
                    cell.appendChild(lootIcon);
                }

                gridElement.appendChild(cell);
            }
        }

        // Render players as absolutely positioned entities
        this.renderPlayers(gameState);

        // Render floating thought bubbles
        if (this.llm) {
            this.renderFloatingThoughts(gameState);
        }
    }

    /**
     * Render players as absolutely positioned entities
     */
    renderPlayers(gameState) {
        const gridElement = this.getElement(this.config.gridId);
        if (!gridElement) return;

        const gridRect = gridElement.getBoundingClientRect();
        const gapSize = 0;
        const cellWidth = gridRect.width / gameState.grid[0].length;
        const cellHeight = gridRect.height / gameState.grid.length;

        for (const player of gameState.players) {
            if (!player.alive) continue;

            let playerEntity = gridElement.querySelector(`.player-entity.player${player.id}`);

            // Create player entity if doesn't exist
            if (!playerEntity) {
                playerEntity = this.createElement('div', `player-entity player${player.id}`);

                // NPC customization
                if (player.isNPC && player.color) {
                    playerEntity.style.filter = `drop-shadow(0 0 10px ${player.color})`;
                }
                if (player.isNPC && player.npcEmoji) {
                    playerEntity.setAttribute('data-emoji', player.npcEmoji);
                    playerEntity.style.setProperty('--emoji', `"${player.npcEmoji}"`);
                }

                // Click handler for prompt window
                playerEntity.style.cursor = 'pointer';
                playerEntity.style.pointerEvents = 'auto';
                playerEntity.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof showPromptWindow === 'function') {
                        showPromptWindow(player.id);
                    }
                });

                gridElement.appendChild(playerEntity);
            }

            // Position player
            const left = player.x * (cellWidth + gapSize);
            const top = player.y * (cellHeight + gapSize);
            playerEntity.style.left = `${left}px`;
            playerEntity.style.top = `${top}px`;
            playerEntity.style.width = `${cellWidth}px`;
            playerEntity.style.height = `${cellHeight}px`;

            // Carried bomb indicator
            let carriedBombIcon = playerEntity.querySelector('.carried-bomb-icon');
            if (player.carriedBomb) {
                if (!carriedBombIcon) {
                    carriedBombIcon = this.createElement('div', 'carried-bomb-icon', '💣');
                    playerEntity.appendChild(carriedBombIcon);
                }
            } else if (carriedBombIcon) {
                carriedBombIcon.remove();
            }
        }

        // Remove dead players
        const allPlayerEntities = gridElement.querySelectorAll('.player-entity');
        allPlayerEntities.forEach(entity => {
            const match = entity.className.match(/player(\d+)/);
            if (match) {
                const playerId = parseInt(match[1]);
                const player = gameState.players.find(p => p.id === playerId);
                if (!player || !player.alive) {
                    entity.remove();
                }
            }
        });
    }

    /**
     * Render floating thought bubbles above players
     */
    renderFloatingThoughts(gameState) {
        if (!this.llm) return;

        const gridElement = this.getElement(this.config.gridId);
        if (!gridElement) return;

        const gridRect = gridElement.getBoundingClientRect();
        const gapSize = 0;
        const cellWidth = gridRect.width / gameState.grid[0].length;
        const cellHeight = gridRect.height / gameState.grid.length;

        for (const player of gameState.players) {
            if (!player.alive) continue;

            const thought = this.llm.getPlayerThought(player.id);
            if (!thought || thought.trim() === '') continue;

            const bubble = this.createElement('div', `floating-thought player${player.id}-thought`, thought);

            // NPC color customization
            if (player.isNPC && player.color) {
                bubble.style.color = player.color;
                bubble.style.borderColor = player.color;
                bubble.style.boxShadow = `0 0 15px ${player.color}`;
            }

            // Click handler
            bubble.style.cursor = 'pointer';
            bubble.style.pointerEvents = 'auto';
            bubble.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof showPromptWindow === 'function') {
                    showPromptWindow(player.id);
                }
            });

            // Position bubble above player
            const playerX = player.x * (cellWidth + gapSize);
            const playerY = player.y * (cellHeight + gapSize);
            bubble.style.left = `${playerX}px`;
            bubble.style.bottom = `${gridRect.height - playerY}px`;
            bubble.style.top = 'auto';

            gridElement.appendChild(bubble);
        }
    }

    /**
     * Update score display (IUIRenderer interface)
     */
    updateScores(gameState) {
        for (let i = 0; i < gameState.players.length; i++) {
            const player = gameState.players[i];
            const scoreElement = this.getElement(`score${player.id}`);
            if (scoreElement) {
                scoreElement.textContent = player.score;
            }
        }
    }

    /**
     * Update game info display (IUIRenderer interface)
     */
    updateInfo(gameState) {
        // Turn counter
        const turnElement = this.getElement('turnCounter');
        if (turnElement) {
            turnElement.textContent = gameState.turnCount || 0;
        }

        // Round counter
        const roundElement = this.getElement('roundCounter');
        if (roundElement) {
            roundElement.textContent = gameState.roundCount || 0;
        }

        // Current player
        const currentPlayerElement = this.getElement('currentPlayer');
        if (currentPlayerElement) {
            const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
            if (currentPlayer) {
                currentPlayerElement.textContent = currentPlayer.name;
                currentPlayerElement.className = `player${currentPlayer.id}`;
            }
        }

        // Alive count
        const aliveElement = this.getElement('aliveCount');
        if (aliveElement) {
            const aliveCount = gameState.players.filter(p => p.alive).length;
            aliveElement.textContent = aliveCount;
        }

        // Bomb count
        const bombElement = this.getElement('bombCount');
        if (bombElement) {
            bombElement.textContent = gameState.bombs.length;
        }
    }

    /**
     * Show game over screen (IUIRenderer interface)
     */
    showGameOver(winner, game) {
        const container = this.getElement(this.config.containerId);
        if (!container) {
            super.showGameOver(winner, game);
            return;
        }

        // Create game over overlay
        const overlay = this.createElement('div', 'game-over-overlay');
        overlay.id = 'gameOverOverlay';

        const content = this.createElement('div', 'game-over-content');

        const title = this.createElement('h1', '', '🎮 GAME OVER!');
        content.appendChild(title);

        const winnerName = this.createElement('h2', '',
            winner ? `Winner: ${winner.name}` : 'Draw!'
        );
        content.appendChild(winnerName);

        const score = this.createElement('p', '',
            `Final Score: ${winner ? winner.score : 0}`
        );
        content.appendChild(score);

        // Final scores table
        const scoresTitle = this.createElement('h3', '', 'Final Scores:');
        content.appendChild(scoresTitle);

        const scoresList = this.createElement('ul', 'final-scores');
        const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
        for (const player of sortedPlayers) {
            const item = this.createElement('li', `player${player.id}`,
                `${player.name}: ${player.score} ${player.alive ? '✅' : '💀'}`
            );
            scoresList.appendChild(item);
        }
        content.appendChild(scoresList);

        // Reset button
        const resetBtn = this.createElement('button', '', 'Play Again');
        resetBtn.onclick = () => {
            if (typeof resetGame === 'function') {
                resetGame();
            } else {
                location.reload();
            }
        };
        content.appendChild(resetBtn);

        overlay.appendChild(content);
        container.appendChild(overlay);

        this.log('Game Over!', 'info');
    }

    /**
     * Clear renderer (IUIRenderer interface)
     */
    clear() {
        super.clear();

        // Clear player entities
        const gridElement = this.getElement(this.config.gridId);
        if (gridElement) {
            const playerEntities = gridElement.querySelectorAll('.player-entity');
            playerEntities.forEach(entity => entity.remove());
        }
    }

    /**
     * Setup input handlers (IUIRenderer interface)
     */
    setupInputHandlers(inputHandler) {
        document.addEventListener('keydown', (e) => {
            if (inputHandler) {
                inputHandler(e);
            }
        });
    }

    /**
     * Show error modal (IUIRenderer interface)
     */
    showError(message, details = null) {
        super.showError(message, details);

        // Show error modal if available
        const errorModal = this.getElement('errorModal');
        const errorMessage = this.getElement('errorMessage');

        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            if (details) {
                errorMessage.textContent += `\n\nDetails: ${JSON.stringify(details, null, 2)}`;
            }
            errorModal.classList.remove('hidden');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombervibeRenderer };
}
