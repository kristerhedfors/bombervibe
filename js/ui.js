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

    // Check for stored API key
    if (ai.loadApiKey()) {
        document.getElementById('apiModal').classList.add('hidden');
        document.getElementById('apiKeyInput').value = '***';
    }

    // Load stored prompts
    ai.loadPrompts();
    for (let i = 1; i <= 4; i++) {
        const textarea = document.getElementById(`prompt${i}`);
        if (ai.prompts[i]) {
            textarea.value = ai.prompts[i];
        }
    }

    // Initialize game
    game.initialize();

    // Set up event listeners
    setupEventListeners();

    // Render initial state
    renderGrid();
    updateScores();
    updateGameInfo();

    log('System initialized. Enter API key to begin.');
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

    // Prompt editors - save on change
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`prompt${i}`).addEventListener('change', (e) => {
            ai.setPrompt(i, e.target.value);
            log(`Player ${i} strategy updated`);
        });
    }

    // Keyboard controls for manual play (Player 1)
    document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(e) {
    if (!game.running || game.paused || game.getCurrentPlayer().id !== 1) {
        return;
    }

    let handled = false;

    // Arrow keys for movement
    if (e.key === 'ArrowUp') {
        if (game.movePlayer(1, 'up')) {
            log('Player 1 moved UP (manual)');
            manualControlEnabled = true;
            handled = true;
        }
    } else if (e.key === 'ArrowDown') {
        if (game.movePlayer(1, 'down')) {
            log('Player 1 moved DOWN (manual)');
            manualControlEnabled = true;
            handled = true;
        }
    } else if (e.key === 'ArrowLeft') {
        if (game.movePlayer(1, 'left')) {
            log('Player 1 moved LEFT (manual)');
            manualControlEnabled = true;
            handled = true;
        }
    } else if (e.key === 'ArrowRight') {
        if (game.movePlayer(1, 'right')) {
            log('Player 1 moved RIGHT (manual)');
            manualControlEnabled = true;
            handled = true;
        }
    }
    // Spacebar or 'B' for bomb
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
        alert('Please enter your Groq API key first!');
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

    // Check for game over
    if (game.isGameOver()) {
        endGame();
        return;
    }

    // Execute turn if enough time has passed
    if (now - lastTurnTime >= game.turnDelay) {
        executeTurn();
        lastTurnTime = now;
    }

    // Render
    renderGrid();
    updateScores();
    updateGameInfo();

    // Continue loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Execute one turn
async function executeTurn() {
    const currentPlayer = game.getCurrentPlayer();

    if (!currentPlayer.alive) {
        game.nextTurn();
        return;
    }

    // Player 1 can be controlled manually - skip AI if manual control was used
    if (currentPlayer.id === 1 && manualControlEnabled) {
        // Manual control already handled by keyboard
        // Just advance turn
        game.nextTurn();
        return;
    }

    // Get AI move
    try {
        log(`Player ${currentPlayer.id} thinking...`);
        const move = await ai.getAIMove(game.getGameState(), currentPlayer.id);

        if (move) {
            if (move.action === 'move') {
                const success = game.movePlayer(currentPlayer.id, move.direction);
                log(`Player ${currentPlayer.id} ${success ? 'moved' : 'tried to move'} ${move.direction.toUpperCase()}`);
            } else if (move.action === 'bomb') {
                const success = game.playerPlaceBomb(currentPlayer.id);
                log(`Player ${currentPlayer.id} ${success ? 'placed' : 'tried to place'} BOMB`);
            }
        }
    } catch (error) {
        log(`ERROR: Player ${currentPlayer.id} - ${error.message}`);
    }

    game.nextTurn();
}

function endGame() {
    game.running = false;
    const winner = game.getWinner();
    log(`GAME OVER! Winner: Player ${winner.id} (${winner.name}) with ${winner.score} points!`);
    alert(`🎮 GAME OVER!\n\nWinner: ${winner.name}\nScore: ${winner.score}`);
}

// Render the grid
function renderGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';

    for (let y = 0; y < game.GRID_HEIGHT; y++) {
        for (let x = 0; x < game.GRID_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // Check if any player is here
            const player = game.players.find(p => p.alive && p.x === x && p.y === y);
            if (player) {
                cell.classList.add(`player${player.id}`);
                continue;
            }

            // Check for explosion
            const explosion = game.explosions.find(exp =>
                exp.cells.some(c => c.x === x && c.y === y)
            );
            if (explosion) {
                cell.classList.add('explosion');
                gridElement.appendChild(cell);
                continue;
            }

            // Check for bomb
            const bomb = game.bombs.find(b => b.x === x && b.y === y);
            if (bomb) {
                cell.classList.add('bomb');
                gridElement.appendChild(cell);
                continue;
            }

            // Check cell type
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
}

function updateScores() {
    for (let i = 1; i <= 4; i++) {
        const player = game.players[i - 1];
        document.getElementById(`score${i}`).textContent = player.score;
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
    logContent.insertBefore(entry, logContent.firstChild);

    // Keep only last 20 messages
    while (logContent.children.length > 20) {
        logContent.removeChild(logContent.lastChild);
    }
}
