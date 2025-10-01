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

    // Check for API key in URL fragment (e.g., #gsk_abc123...)
    const fragment = window.location.hash.substring(1); // Remove '#'
    if (fragment && fragment.startsWith('gsk_')) {
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
    document.getElementById('editSystemPrompt').addEventListener('click', openSystemPromptEditor);

    // System prompt modal
    document.getElementById('saveSystemPrompt').addEventListener('click', saveSystemPrompt);
    document.getElementById('resetSystemPrompt').addEventListener('click', resetSystemPrompt);
    document.getElementById('closeSystemPrompt').addEventListener('click', closeSystemPromptEditor);

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

// Execute one turn
async function executeTurn() {
    const currentPlayer = game.getCurrentPlayer();
    console.log(`[TURN ${game.turnCount}] Current player: ${currentPlayer.id} at (${currentPlayer.x}, ${currentPlayer.y})`);

    if (!currentPlayer.alive) {
        console.log(`[TURN ${game.turnCount}] Player ${currentPlayer.id} is dead, skipping`);
        game.nextTurn();
        return;
    }

    // Player 1 can be controlled manually - skip AI if manual control was used
    if (currentPlayer.id === 1 && manualControlEnabled) {
        console.log(`[TURN ${game.turnCount}] Player 1 manual control - skipping AI`);
        // Manual control already handled by keyboard
        // Just advance turn
        game.nextTurn();
        return;
    }

    // Get AI move
    try {
        log(`Player ${currentPlayer.id} thinking...`);
        console.log(`[TURN ${game.turnCount}] Requesting AI move for Player ${currentPlayer.id}`);

        const gameState = game.getGameState();
        console.log(`[TURN ${game.turnCount}] Game state:`, {
            players: gameState.players.map(p => `P${p.id}:(${p.x},${p.y}) ${p.alive?'alive':'dead'}`),
            bombs: gameState.bombs.length,
            currentPlayerHasBomb: currentPlayer.hasBomb
        });

        const move = await ai.getAIMove(gameState, currentPlayer.id);
        console.log(`[TURN ${game.turnCount}] AI returned move:`, move);

        if (move && move.action === 'move') {
            const startPos = {x: currentPlayer.x, y: currentPlayer.y};

            // Drop bomb first if requested (at current position)
            let bombMsg = '';
            if (move.dropBomb) {
                console.log(`[TURN ${game.turnCount}] Attempting to drop bomb at (${startPos.x}, ${startPos.y})`);
                const bombSuccess = game.playerPlaceBomb(currentPlayer.id);
                bombMsg = bombSuccess ? ' + dropped BOMB' : ' (bomb already placed)';
                console.log(`[TURN ${game.turnCount}] Bomb drop ${bombSuccess ? 'SUCCESS' : 'FAILED (already have one)'}`);
            }

            // Then move
            console.log(`[TURN ${game.turnCount}] Attempting to move ${move.direction} from (${startPos.x}, ${startPos.y})`);
            const success = game.movePlayer(currentPlayer.id, move.direction);
            console.log(`[TURN ${game.turnCount}] Move ${success ? 'SUCCESS' : 'FAILED'} - now at (${currentPlayer.x}, ${currentPlayer.y})`);
            log(`Player ${currentPlayer.id} ${success ? 'moved' : 'tried to move'} ${move.direction.toUpperCase()}${bombMsg}`);
        } else {
            console.warn(`[TURN ${game.turnCount}] Invalid or missing move from AI:`, move);
            log(`Player ${currentPlayer.id} received invalid move - skipping turn`);
        }
    } catch (error) {
        console.error(`[TURN ${game.turnCount}] ERROR for Player ${currentPlayer.id}:`, error);
        log(`ERROR: Player ${currentPlayer.id} - ${error.message}`);
    }

    game.nextTurn();
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
    const emojis = ['⛷️', '🧑‍🌾', '🛒', '🧑‍🚀'];
    return emojis[playerId - 1];
}

// Render the grid
function renderGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';

    for (let y = 0; y < game.GRID_HEIGHT; y++) {
        for (let x = 0; x < game.GRID_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // Check what's at this position
            const player = game.players.find(p => p.alive && p.x === x && p.y === y);
            const bomb = game.bombs.find(b => b.x === x && b.y === y);
            const explosion = game.explosions.find(exp =>
                exp.cells.some(c => c.x === x && c.y === y)
            );

            // Priority: Explosion > Player+Bomb > Player > Bomb > Terrain
            if (explosion) {
                cell.classList.add('explosion');
                gridElement.appendChild(cell);
                continue;
            }

            // Player on top of bomb - STACK THEM!
            if (player && bomb) {
                cell.classList.add('stacked');
                cell.classList.add('bomb'); // Bomb as background
                cell.classList.add(`player${player.id}`); // Player on top
                gridElement.appendChild(cell);
                continue;
            }

            // Just player
            if (player) {
                cell.classList.add(`player${player.id}`);
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
