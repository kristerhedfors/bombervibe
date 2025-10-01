// UI.js - Main game loop and UI management

let game;
let ai;
let lastTurnTime = 0;
let animationFrameId = null;
let manualControlEnabled = false;

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

function initializeGame() {
    game = new Game();
    ai = new AIController();

    // Set error callback for AI
    ai.setErrorCallback(showErrorModal);

    // Check for API key in URL fragment (e.g., #sk-abc123...)
    const fragment = window.location.hash.substring(1); // Remove '#'
    if (fragment && fragment.startsWith('sk-')) {
        ai.setApiKey(fragment);
        document.getElementById('apiModal').classList.add('hidden');
        document.getElementById('apiKeyInput').value = '***';
        log('API key loaded from URL fragment');
    }
    // Otherwise check for stored API key
    else if (ai.loadApiKey()) {
        document.getElementById('apiModal').classList.add('hidden');
        document.getElementById('apiKeyInput').value = '***';
        log('API key loaded from localStorage');
    }

    // Load stored prompts
    ai.loadPrompts();
    ai.loadSystemPrompt();
    for (let i = 1; i <= 4; i++) {
        const textarea = document.getElementById(`prompt${i}`);
        if (ai.prompts[i]) {
            textarea.value = ai.prompts[i];
        }
    }

    // Clear all player memories on page load (fresh start)
    ai.clearAllMemories();

    // Initialize game
    game.initialize();

    // Set up coordinate labels
    initializeCoordinateLabels();

    // Set up event listeners
    setupEventListeners();

    // Render initial state
    renderGrid();
    updateScores();
    updateGameInfo();

    log('System initialized. Enter API key to begin.');
}

function initializeCoordinateLabels() {
    // Row labels: 11 down to 1 (like chess ranks, with 11 at top)
    const rowLabels = document.getElementById('rowLabels');
    rowLabels.innerHTML = '';
    for (let i = game.GRID_HEIGHT; i >= 1; i--) {
        const label = document.createElement('div');
        label.textContent = i;
        label.className = 'coord-label';
        rowLabels.appendChild(label);
    }

    // Column labels: A through M (13 columns)
    const colLabels = document.getElementById('colLabels');
    colLabels.innerHTML = '';
    for (let i = 0; i < game.GRID_WIDTH; i++) {
        const label = document.createElement('div');
        label.textContent = String.fromCharCode(65 + i); // A=65 in ASCII
        label.className = 'coord-label';
        colLabels.appendChild(label);
    }
}

function setupEventListeners() {
    // API Key
    document.getElementById('saveApiKey').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            ai.setApiKey(key);
            document.getElementById('apiModal').classList.add('hidden');
            log('API key saved. Ready to start!');
        }
    });

    // Game controls
    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('pauseGame').addEventListener('click', pauseGame);
    document.getElementById('resetGame').addEventListener('click', resetGame);
    document.getElementById('editSystemPrompt').addEventListener('click', openSystemPromptEditor);

    // System prompt modal
    document.getElementById('saveSystemPrompt').addEventListener('click', saveSystemPrompt);
    document.getElementById('resetSystemPrompt').addEventListener('click', resetSystemPrompt);
    document.getElementById('closeSystemPrompt').addEventListener('click', closeSystemPromptEditor);

    // Error modal
    document.getElementById('closeError').addEventListener('click', closeErrorModal);

    // Prompt editors - save on change
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`prompt${i}`).addEventListener('change', (e) => {
            ai.setPrompt(i, e.target.value);
            log(`Player ${i} strategy updated`);
        });
    }

    // Reset prompt buttons
    document.querySelectorAll('.reset-prompt').forEach(button => {
        button.addEventListener('click', (e) => {
            const playerId = parseInt(e.target.getAttribute('data-player'));
            const defaultPrompt = ai.resetPrompt(playerId);
            if (defaultPrompt) {
                document.getElementById(`prompt${playerId}`).value = defaultPrompt;
                log(`Player ${playerId} prompt reset to default`);
            }
        });
    });

    // Keyboard controls for manual play (Player 1)
    document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(e) {
    if (!game.running || game.paused || game.getCurrentPlayer().id !== 1) {
        return;
    }

    let handled = false;
    let bombMsg = '';

    // Check if Shift is held for bomb+move
    const dropBomb = e.shiftKey;

    // Arrow keys for movement
    if (e.key === 'ArrowUp') {
        if (dropBomb) {
            game.playerPlaceBomb(1);
            bombMsg = ' + BOMB';
        }
        if (game.movePlayer(1, 'up')) {
            log(`Player 1 moved UP${bombMsg} (manual)`);
            manualControlEnabled = true;
            handled = true;
        }
    } else if (e.key === 'ArrowDown') {
        if (dropBomb) {
            game.playerPlaceBomb(1);
            bombMsg = ' + BOMB';
        }
        if (game.movePlayer(1, 'down')) {
            log(`Player 1 moved DOWN${bombMsg} (manual)`);
            manualControlEnabled = true;
            handled = true;
        }
    } else if (e.key === 'ArrowLeft') {
        if (dropBomb) {
            game.playerPlaceBomb(1);
            bombMsg = ' + BOMB';
        }
        if (game.movePlayer(1, 'left')) {
            log(`Player 1 moved LEFT${bombMsg} (manual)`);
            manualControlEnabled = true;
            handled = true;
        }
    } else if (e.key === 'ArrowRight') {
        if (dropBomb) {
            game.playerPlaceBomb(1);
            bombMsg = ' + BOMB';
        }
        if (game.movePlayer(1, 'right')) {
            log(`Player 1 moved RIGHT${bombMsg} (manual)`);
            manualControlEnabled = true;
            handled = true;
        }
    }
    // Spacebar or 'B' for bomb only (no movement)
    else if (e.key === ' ' || e.key === 'b' || e.key === 'B') {
        if (game.playerPlaceBomb(1)) {
            log('Player 1 placed BOMB (manual)');
            manualControlEnabled = true;
            handled = true;
        }
        e.preventDefault();
    }

    if (handled) {
        renderGrid();
        game.nextTurn();
        updateGameInfo();
    }
}

function startGame() {
    if (!ai.apiKey) {
        alert('Please enter your OpenAI API key first!');
        document.getElementById('apiModal').classList.remove('hidden');
        return;
    }

    game.start();
    log('Game started!');
    gameLoop();
}

function pauseGame() {
    game.pause();
    log(game.paused ? 'Game paused' : 'Game resumed');
    if (!game.paused) {
        gameLoop();
    }
}

function resetGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    game.reset();
    ai.clearAllMemories();
    manualControlEnabled = false;
    lastTurnTime = 0;
    renderGrid();
    updateScores();
    updateGameInfo();
    log('Game reset');
}

// Main game loop
function gameLoop() {
    if (!game.running || game.paused) {
        return;
    }

    const now = Date.now();

    // Update bombs continuously
    game.updateBombs();
    game.updateExplosions();

    // Render first to show explosions
    renderGrid();
    updateScores();
    updateGameInfo();

    // Check for game over AFTER rendering explosions
    if (game.isGameOver()) {
        // Wait a bit to show final explosion
        setTimeout(() => {
            endGame();
        }, 1000);
        return;
    }

    // Execute turn if enough time has passed
    if (now - lastTurnTime >= game.turnDelay) {
        executeTurn();
        lastTurnTime = now;
    }

    // Continue loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Execute one turn (now processes all players in parallel)
async function executeTurn() {
    const round = Math.floor(game.turnCount / 4) + 1;
    console.log(`[ROUND ${round}] Processing all players in parallel`);

    try {
        const gameState = game.getGameState();
        console.log(`[ROUND ${round}] Game state:`, {
            players: gameState.players.map(p => `P${p.id}:(${p.x},${p.y}) ${p.alive?'alive':'dead'}`),
            bombs: gameState.bombs.length
        });

        // Get all AI moves in parallel (one API call per alive player)
        log('All players thinking...');
        const allMoves = await ai.getAllPlayerMoves(gameState, game);
        console.log(`[ROUND ${round}] All AI moves received:`, allMoves);

        // Execute all moves sequentially to maintain game order
        for (let playerId = 1; playerId <= 4; playerId++) {
            const player = game.players[playerId - 1];

            if (!player.alive) {
                console.log(`[ROUND ${round}] Player ${playerId} is dead, skipping`);
                continue;
            }

            const move = allMoves[playerId];
            if (move && move.action === 'move') {
                const startPos = {x: player.x, y: player.y};

                // Drop bomb first if requested (at current position)
                let bombMsg = '';
                if (move.dropBomb) {
                    console.log(`[ROUND ${round}] P${playerId}: Attempting to drop bomb at (${startPos.x}, ${startPos.y})`);
                    const bombSuccess = game.playerPlaceBomb(playerId);
                    bombMsg = bombSuccess ? ' + dropped BOMB' : ' (bomb already placed)';
                    console.log(`[ROUND ${round}] P${playerId}: Bomb drop ${bombSuccess ? 'SUCCESS' : 'FAILED'}`);
                }

                // Then move
                console.log(`[ROUND ${round}] P${playerId}: Moving ${move.direction} from (${startPos.x}, ${startPos.y})`);
                const success = game.movePlayer(playerId, move.direction);
                console.log(`[ROUND ${round}] P${playerId}: Move ${success ? 'SUCCESS' : 'FAILED'} - now at (${player.x}, ${player.y})`);
                log(`Player ${playerId} ${success ? 'moved' : 'tried to move'} ${move.direction.toUpperCase()}${bombMsg}`);
            } else {
                console.warn(`[ROUND ${round}] P${playerId}: Invalid or missing move:`, move);
                log(`Player ${playerId} received invalid move - skipping`);
            }
        }

        // Advance turn counter by 4 (one full round)
        for (let i = 0; i < 4; i++) {
            game.nextTurn();
        }
    } catch (error) {
        console.error(`[ROUND ${round}] ERROR:`, error);
        log(`ERROR: ${error.message}`);
        // Still advance turns even on error
        for (let i = 0; i < 4; i++) {
            game.nextTurn();
        }
    }
}

function endGame() {
    game.running = false;
    const winner = game.getWinner();

    // Show game over overlay
    const gameBoard = document.getElementById('gameBoard');
    const overlay = document.createElement('div');
    overlay.id = 'gameOverOverlay';
    overlay.innerHTML = `
        <div class="game-over-content">
            <h1>🎮 GAME OVER! 🎮</h1>
            <h2>🏆 WINNER: ${winner.name} 🏆</h2>
            <p class="winner-emoji">${getPlayerEmoji(winner.id)}</p>
            <p>Score: ${winner.score} points</p>
            <button onclick="document.getElementById('resetGame').click(); document.getElementById('gameOverOverlay').remove();">PLAY AGAIN</button>
        </div>
    `;
    gameBoard.appendChild(overlay);

    log(`🎮 GAME OVER! Winner: Player ${winner.id} (${winner.name}) with ${winner.score} points!`);
}

function getPlayerEmoji(playerId) {
    const emojis = ['⛷️', '🥷', '🛒', '🧑‍🚀'];
    return emojis[playerId - 1];
}

// Render the grid
function renderGrid() {
    const gridElement = document.getElementById('grid');

    // Clear only non-player elements (preserve player entities for smooth transitions)
    const existingCells = gridElement.querySelectorAll('.cell');
    existingCells.forEach(cell => cell.remove());
    const existingThoughts = gridElement.querySelectorAll('.floating-thought');
    existingThoughts.forEach(thought => thought.remove());

    // Render grid cells (terrain, bombs, explosions only - players rendered separately)
    for (let y = 0; y < game.GRID_HEIGHT; y++) {
        for (let x = 0; x < game.GRID_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            const bomb = game.bombs.find(b => b.x === x && b.y === y);
            const explosion = game.explosions.find(exp =>
                exp.cells.some(c => c.x === x && c.y === y)
            );

            // Priority: Explosion > Bomb > Terrain
            if (explosion) {
                cell.classList.add('explosion');
                gridElement.appendChild(cell);
                continue;
            }

            // Just bomb
            if (bomb) {
                cell.classList.add('bomb');
                gridElement.appendChild(cell);
                continue;
            }

            // Terrain
            const cellType = game.grid[y][x];
            if (cellType === 0) {
                cell.classList.add('empty');
            } else if (cellType === 1) {
                cell.classList.add('soft-block');
            } else if (cellType === 2) {
                cell.classList.add('hard-block');
            }

            gridElement.appendChild(cell);
        }
    }

    // Render players as separate absolutely positioned entities for smooth movement
    renderPlayers();

    // Add floating thought bubbles for all alive players
    renderFloatingThoughts();
}

// Render players as absolutely positioned entities
function renderPlayers() {
    const gridElement = document.getElementById('grid');
    const gridRect = gridElement.getBoundingClientRect();

    // Calculate cell dimensions
    const gapSize = 1; // 1px gap from CSS
    const totalWidth = gridRect.width;
    const totalHeight = gridRect.height;
    const cellWidth = (totalWidth - (gapSize * (game.GRID_WIDTH - 1))) / game.GRID_WIDTH;
    const cellHeight = (totalHeight - (gapSize * (game.GRID_HEIGHT - 1))) / game.GRID_HEIGHT;

    for (let i = 0; i < game.players.length; i++) {
        const player = game.players[i];
        if (!player.alive) continue;

        let playerEntity = gridElement.querySelector(`.player-entity.player${player.id}`);

        // Create player entity if it doesn't exist
        if (!playerEntity) {
            playerEntity = document.createElement('div');
            playerEntity.className = `player-entity player${player.id}`;
            gridElement.appendChild(playerEntity);
        }

        // Calculate position including gaps
        const left = player.x * (cellWidth + gapSize);
        const top = player.y * (cellHeight + gapSize);

        // Set position for smooth transition
        playerEntity.style.left = `${left}px`;
        playerEntity.style.top = `${top}px`;
        playerEntity.style.width = `${cellWidth}px`;
        playerEntity.style.height = `${cellHeight}px`;
    }

    // Remove dead players
    const allPlayerEntities = gridElement.querySelectorAll('.player-entity');
    allPlayerEntities.forEach(entity => {
        const playerId = parseInt(entity.className.match(/player(\d)/)[1]);
        const player = game.players[playerId - 1];
        if (!player.alive) {
            entity.remove();
        }
    });
}

// Render floating thought bubbles above players
function renderFloatingThoughts() {
    const gridElement = document.getElementById('grid');
    const gridRect = gridElement.getBoundingClientRect();

    // Calculate cell size including gaps
    const gapSize = 1; // 1px gap from CSS
    const totalWidth = gridRect.width - (gapSize * (game.GRID_WIDTH - 1));
    const totalHeight = gridRect.height - (gapSize * (game.GRID_HEIGHT - 1));
    const cellWidth = totalWidth / game.GRID_WIDTH;
    const cellHeight = totalHeight / game.GRID_HEIGHT;

    for (let i = 1; i <= 4; i++) {
        const player = game.players[i - 1];
        if (!player.alive) continue;

        const thought = ai.getPlayerMemory(i);
        if (!thought || thought === 'No previous thought' || thought.trim() === '') continue;

        // Create floating thought bubble
        const bubble = document.createElement('div');
        bubble.className = `floating-thought player${i}-thought`;
        bubble.textContent = thought;

        // Position bubble above player (bubble grows upward from this point)
        // Account for gaps between cells
        const playerX = player.x * (cellWidth + gapSize);
        const playerY = player.y * (cellHeight + gapSize);
        bubble.style.left = `${playerX}px`;
        // Position at bottom of bubble = top of player cell, so bubble grows upward
        bubble.style.bottom = `${gridRect.height - playerY}px`;
        bubble.style.top = 'auto'; // Override default positioning

        gridElement.appendChild(bubble);
    }
}

function updateScores() {
    for (let i = 1; i <= 4; i++) {
        const player = game.players[i - 1];
        document.getElementById(`score${i}`).textContent = player.score;

        // Update dead player prompt overlays
        const promptEditor = document.querySelector(`.prompt-editor:has(#prompt${i})`);
        if (promptEditor) {
            if (!player.alive) {
                promptEditor.classList.add('dead');
            } else {
                promptEditor.classList.remove('dead');
            }
        }
    }
}

function updateGameInfo() {
    document.getElementById('turnCounter').textContent = `TURN: ${game.turnCount}`;
    const current = game.getCurrentPlayer();
    document.getElementById('currentPlayer').textContent = `CURRENT: P${current.id}`;
}

// Log messages
function log(message) {
    const logContent = document.getElementById('logContent');
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${timestamp}] ${message}`;

    // Color code by player
    if (message.includes('Player 1')) {
        entry.style.color = 'var(--cyan)';
    } else if (message.includes('Player 2')) {
        entry.style.color = 'var(--magenta)';
    } else if (message.includes('Player 3')) {
        entry.style.color = 'var(--yellow)';
    } else if (message.includes('Player 4')) {
        entry.style.color = 'var(--green)';
    } else if (message.includes('ERROR')) {
        entry.style.color = '#ff3300';
    }

    logContent.insertBefore(entry, logContent.firstChild);

    // Keep only last 20 messages
    while (logContent.children.length > 20) {
        logContent.removeChild(logContent.lastChild);
    }
}

// System Prompt Editor functions
function openSystemPromptEditor() {
    document.getElementById('systemPromptEditor').value = ai.getSystemPrompt();
    document.getElementById('systemPromptModal').classList.remove('hidden');
    log('System prompt editor opened');
}

function saveSystemPrompt() {
    const newPrompt = document.getElementById('systemPromptEditor').value;
    ai.setSystemPrompt(newPrompt);
    document.getElementById('systemPromptModal').classList.add('hidden');
    log('System prompt saved');
}

function resetSystemPrompt() {
    if (confirm('Reset system prompt to default? This will erase your custom prompt.')) {
        ai.resetSystemPrompt();
        document.getElementById('systemPromptEditor').value = ai.getSystemPrompt();
        log('System prompt reset to default');
    }
}

function closeSystemPromptEditor() {
    document.getElementById('systemPromptModal').classList.add('hidden');
}

// Error Modal functions
function showErrorModal(playerId, errorType, rawResponse, expectedFormat) {
    const playerColors = ['', 'cyan', 'magenta', 'yellow', 'green'];
    const playerColor = playerColors[playerId];

    const details = `<strong style="color: var(--${playerColor});">Player ${playerId} AI Error</strong>

<strong>Error Type:</strong>
${errorType}

<strong>What was received:</strong>
${rawResponse}

<strong>Expected Format:</strong>
${expectedFormat}

<strong>Action Taken:</strong>
Using random move as fallback.`;

    document.getElementById('errorDetails').innerHTML = details;
    document.getElementById('errorModal').style.display = 'flex';

    log(`ERROR: Player ${playerId} AI parsing failed - ${errorType}`);
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}
