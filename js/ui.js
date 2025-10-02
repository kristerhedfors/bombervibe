// UI.js - Main game loop and UI management

let game;
let ai;
let gameHistory; // For replay functionality
let replayPlayer; // Controls replay playback
let isReplayMode = false; // Track if we're in replay mode
let lastTurnTime = 0;
let animationFrameId = null;
let manualControlEnabled = false;
let gameOverDetected = false; // Flag to prevent extra turn recordings after game over

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

function initializeGame() {
    game = new Game();
    ai = new AIController();
    gameHistory = new GameHistory(); // Initialize history tracking
    replayPlayer = null; // Will be created when entering replay mode
    isReplayMode = false;

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

    // Prompt window
    document.getElementById('closePromptWindow').addEventListener('click', closePromptWindow);
    initializePromptWindowDragging();

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
    gameOverDetected = false; // Reset game over flag

    // Record initial game state for replay
    const initialState = captureGameState();
    gameHistory.recordInitial(initialState);

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
    ai.clearPromptHistory(); // Clear prompt history
    manualControlEnabled = false;
    isReplayMode = false;
    gameOverDetected = false; // Reset game over flag
    lastTurnTime = 0;
    gameHistory = new GameHistory(); // Reset history
    replayPlayer = null;

    // Clear ALL localStorage items related to the game
    // Player prompts
    for (let i = 1; i <= 10; i++) {
        localStorage.removeItem(`player_${i}_prompt`);
        localStorage.removeItem(`player_${i}_memory`);
        localStorage.removeItem(`player_${i}_prompt_history`);
    }
    // System prompt
    localStorage.removeItem('system_prompt');
    // Serialization data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('bombervibe_') || key.startsWith('gameState_')) {
            localStorage.removeItem(key);
        }
    });

    // Trigger gameReset event for NPC system
    window.dispatchEvent(new Event('gameReset'));

    renderGrid();
    updateScores();
    updateGameInfo();
    log('🧹 Complete reset - all data cleared');
}

// Track if a turn is currently executing
let turnInProgress = false;

// Main game loop
function gameLoop() {
    if (!game.running || game.paused) {
        return;
    }

    const now = Date.now();

    // Update explosions for visual effects
    game.updateExplosions();

    // Render first to show explosions
    renderGrid();
    updateScores();
    updateGameInfo();

    // Check for game over AFTER rendering explosions
    if (game.isGameOver() && !gameOverDetected) {
        // Set flag to prevent any more turns from executing
        gameOverDetected = true;
        // Wait a bit to show final explosion, then end game
        setTimeout(() => {
            endGame();
        }, 1000);
    }

    // Execute turn if enough time has passed, NOT if game over, and NOT if turn already in progress
    if (!gameOverDetected && !turnInProgress && now - lastTurnTime >= game.turnDelay) {
        executeTurn();
        lastTurnTime = now;
    }

    // Continue loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Execute one turn (now processes all players in parallel)
async function executeTurn() {
    // Set flag to prevent concurrent execution
    turnInProgress = true;

    const playerCount = game.players.length;
    const round = Math.floor(game.turnCount / playerCount) + 1;
    console.log(`[ROUND ${round}] Processing ${playerCount} players in parallel`);

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

        // Execute all moves sequentially for all players
        for (const player of game.players) {
            if (!player.alive) {
                console.log(`[ROUND ${round}] Player ${player.id} is dead, skipping`);
                continue;
            }

            const move = allMoves[player.id];
            if (move && move.action === 'move') {
                const startPos = {x: player.x, y: player.y};

                // Drop bomb first if requested (at current position)
                let bombMsg = '';
                if (move.dropBomb) {
                    console.log(`[ROUND ${round}] P${player.id}: Attempting to drop bomb at (${startPos.x}, ${startPos.y})`);
                    const bombSuccess = game.playerPlaceBomb(player.id);
                    bombMsg = bombSuccess ? ' + dropped BOMB' : ' (bomb already placed)';
                    console.log(`[ROUND ${round}] P${player.id}: Bomb drop ${bombSuccess ? 'SUCCESS' : 'FAILED'}`);
                }

                // Then move
                console.log(`[ROUND ${round}] P${player.id}: Moving ${move.direction} from (${startPos.x}, ${startPos.y})`);
                const success = game.movePlayer(player.id, move.direction);
                console.log(`[ROUND ${round}] P${player.id}: Move ${success ? 'SUCCESS' : 'FAILED'} - now at (${player.x}, ${player.y})`);
                log(`Player ${player.id} ${success ? 'moved' : 'tried to move'} ${move.direction.toUpperCase()}${bombMsg}`);
            } else {
                console.warn(`[ROUND ${round}] P${player.id}: Invalid or missing move:`, move);
                log(`Player ${player.id} received invalid move - skipping`);
            }
        }

        // Advance turn counter by number of players (one full round)
        for (let i = 0; i < playerCount; i++) {
            game.nextTurn();
        }

        // Update bombs AFTER all players have moved
        game.updateBombs();

        // Record state in history after turn execution
        if (!isReplayMode && gameHistory) {
            const newState = captureGameState();
            // Capture all player thoughts and prompts for replay (dynamic)
            const thoughts = {};
            const prompts = {};
            game.players.forEach(p => {
                thoughts[p.id] = ai.playerMemory[p.id] || '';
                prompts[p.id] = ai.prompts[p.id] || ai.defaultPrompts[p.id] || '';
            });
            const action = new Action('turn', {round, playerId: null, thoughts, prompts});
            gameHistory.record(newState, action);
        }
    } catch (error) {
        console.error(`[ROUND ${round}] ERROR:`, error);
        log(`ERROR: ${error.message}`);
        // Still advance turns even on error
        for (let i = 0; i < playerCount; i++) {
            game.nextTurn();
        }
    } finally {
        // Always clear the flag when done
        turnInProgress = false;
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
            <p class="game-stats">Total Turns: ${game.turnCount} | Recorded States: ${gameHistory.entries.length}</p>
            <div class="game-over-buttons">
                <button onclick="enterReplayMode()">⏮️ REPLAY</button>
                <button onclick="document.getElementById('resetGame').click(); document.getElementById('gameOverOverlay').remove();">🔄 PLAY AGAIN</button>
            </div>
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

            // Check for loot at this position
            const loot = game.loot.find(l => l.x === x && l.y === y);
            if (loot) {
                const lootIcon = document.createElement('div');
                lootIcon.className = 'loot-icon';
                if (loot.type === 'flash_radius') {
                    lootIcon.innerHTML = '⚡';
                    lootIcon.classList.add('flash-radius');
                }
                cell.appendChild(lootIcon);
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

            // Set custom color for NPCs
            if (player.isNPC && player.color) {
                playerEntity.style.filter = `drop-shadow(0 0 10px ${player.color})`;
            }

            // Set custom emoji for NPCs
            if (player.isNPC && player.npcEmoji) {
                playerEntity.setAttribute('data-emoji', player.npcEmoji);
                playerEntity.style.setProperty('--emoji', `"${player.npcEmoji}"`);
            }

            // Add click handler to show prompt window
            playerEntity.style.cursor = 'pointer';
            playerEntity.style.pointerEvents = 'auto';
            playerEntity.addEventListener('click', (e) => {
                e.stopPropagation();
                showPromptWindow(player.id);
            });

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

    for (const player of game.players) {
        if (!player.alive) continue;

        const thought = ai.getPlayerMemory(player.id);
        if (!thought || thought === 'No previous thought' || thought.trim() === '') continue;

        // Create floating thought bubble
        const bubble = document.createElement('div');
        bubble.className = `floating-thought player${player.id}-thought`;
        bubble.textContent = thought;

        // Set custom color for NPC thought bubbles
        if (player.isNPC && player.color) {
            bubble.style.color = player.color;
            bubble.style.borderColor = player.color;
            bubble.style.boxShadow = `0 0 15px ${player.color}`;
        }

        // Add click handler to show prompt window
        bubble.style.cursor = 'pointer';
        bubble.style.pointerEvents = 'auto';
        bubble.addEventListener('click', (e) => {
            e.stopPropagation();
            showPromptWindow(player.id);
        });

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
    // Update all player scores dynamically
    for (const player of game.players) {
        const scoreElement = document.getElementById(`score${player.id}`);
        if (scoreElement) {
            scoreElement.textContent = player.score;
        }

        // Update dead player prompt overlays (only for P1-P4)
        if (player.id <= 4) {
            const promptEditor = document.querySelector(`.prompt-editor:has(#prompt${player.id})`);
            if (promptEditor) {
                if (!player.alive) {
                    promptEditor.classList.add('dead');
                } else {
                    promptEditor.classList.remove('dead');
                }
            }
        }

        // Mark spawned NPCs as dead in palette
        if (player.isNPC && !player.alive && player.npcId) {
            const npcIcon = document.querySelector(`.npc-icon[data-npc-id="${player.npcId}"]`);
            if (npcIcon) {
                npcIcon.classList.add('spawned');
                npcIcon.style.opacity = '0.2';
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

// ===== PROMPT WINDOW FUNCTIONS =====

let activePromptWindow = null; // Track which player's window is open
let promptWindowUpdateInterval = null;

/**
 * Show prompt window for a player
 */
function showPromptWindow(playerId) {
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    const promptWindowEl = document.getElementById('promptWindow');

    // If already showing this player's window, just bring it to front
    if (activePromptWindow === playerId && !promptWindowEl.classList.contains('hidden')) {
        return;
    }

    // Set active player
    activePromptWindow = playerId;

    // Remove all player classes and add current player class
    promptWindowEl.classList.remove('player-1', 'player-2', 'player-3', 'player-4');
    promptWindowEl.classList.add(`player-${playerId}`);

    // Get player info
    const playerEmojis = ['⛷️', '🥷', '🛒', '🧑‍🚀'];
    const playerColors = ['CYAN', 'MAGENTA', 'YELLOW', 'GREEN'];
    const playerEmoji = player.isNPC && player.npcEmoji ? player.npcEmoji : playerEmojis[playerId - 1];
    const playerColor = playerColors[playerId - 1];

    // Update title
    document.getElementById('promptWindowTitle').textContent = `${playerEmoji} Player ${playerId} [${playerColor}]`;

    // Position window centered if first time showing
    if (promptWindowEl.classList.contains('hidden')) {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = 500;
        const windowHeight = 400;

        promptWindowEl.style.left = `${Math.max(0, (viewportWidth - windowWidth) / 2)}px`;
        promptWindowEl.style.top = `${Math.max(0, (viewportHeight - windowHeight) / 2)}px`;
    }

    // Update content
    updatePromptWindowContent();

    // Show window
    promptWindowEl.classList.remove('hidden');

    // Start live updates (refresh every 2 seconds to reduce overhead)
    if (promptWindowUpdateInterval) {
        clearInterval(promptWindowUpdateInterval);
    }
    promptWindowUpdateInterval = setInterval(updatePromptWindowContent, 2000);
}

/**
 * Update prompt window content (called periodically for live updates)
 */
function updatePromptWindowContent() {
    if (activePromptWindow === null) {
        console.log('[Prompt Window] No active window');
        return;
    }

    const promptWindowEl = document.getElementById('promptWindow');
    if (promptWindowEl.classList.contains('hidden')) {
        console.log('[Prompt Window] Window is hidden');
        return;
    }

    const playerId = activePromptWindow;
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
        console.log('[Prompt Window] Player not found:', playerId);
        return;
    }

    // Get player strategy prompt (in replay mode, get prompt at current turn)
    let playerStrategy;
    if (isReplayMode) {
        const currentEntry = gameHistory.getCurrentEntry();
        if (currentEntry && currentEntry.action && currentEntry.action.payload && currentEntry.action.payload.prompts) {
            playerStrategy = currentEntry.action.payload.prompts[playerId];
        }
    }

    if (!playerStrategy) {
        playerStrategy = ai.prompts[playerId] || ai.defaultPrompts[playerId] || '';
    }

    console.log('[Prompt Window] Player strategy:', playerStrategy ? playerStrategy.substring(0, 50) + '...' : 'EMPTY');

    // Assemble the COMPLETE prompt as sent to OpenAI
    // This matches exactly what's in ai.js getAIMove()
    const systemPrompt = ai.getSystemPrompt();

    console.log('[Prompt Window] System prompt length:', systemPrompt.length);

    // Generate the current game state description (user prompt)
    const gameState = {
        grid: game.grid,
        players: game.players,
        bombs: game.bombs,
        roundCount: game.roundCount
    };
    const gameDescription = ai.generateGameStateDescription(gameState, playerId, game);

    const completePrompt = `=== SYSTEM PROMPT ===

${systemPrompt}

=== USER PROMPT (GAME STATE) ===

${gameDescription}

YOUR STRATEGY:
${playerStrategy}

Respond with JSON containing your move decision and strategic thought.`;

    console.log('[Prompt Window] Complete prompt length:', completePrompt.length);

    // Display complete assembled prompt
    const textEl = document.getElementById('promptWindowCurrentText');
    if (textEl) {
        textEl.textContent = completePrompt;
        console.log('[Prompt Window] Updated text element');
    } else {
        console.error('[Prompt Window] Text element not found!');
    }
}

/**
 * Close prompt window
 */
function closePromptWindow() {
    document.getElementById('promptWindow').classList.add('hidden');
    activePromptWindow = null;

    // Stop live updates
    if (promptWindowUpdateInterval) {
        clearInterval(promptWindowUpdateInterval);
        promptWindowUpdateInterval = null;
    }
}

/**
 * Initialize draggable functionality for prompt window
 */
function initializePromptWindowDragging() {
    const promptWindowEl = document.getElementById('promptWindow');
    const header = promptWindowEl.querySelector('.prompt-window-header');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        // Don't drag if clicking close button
        if (e.target.classList.contains('window-close-btn') || e.target.closest('.window-close-btn')) {
            return;
        }

        initialX = e.clientX - (parseInt(promptWindowEl.style.left) || 0);
        initialY = e.clientY - (parseInt(promptWindowEl.style.top) || 0);

        isDragging = true;
    }

    function drag(e) {
        if (!isDragging) return;

        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // Keep window within viewport
        const maxX = (window.innerWidth || document.documentElement.clientWidth) - promptWindowEl.offsetWidth;
        const maxY = (window.innerHeight || document.documentElement.clientHeight) - promptWindowEl.offsetHeight;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        promptWindowEl.style.left = `${currentX}px`;
        promptWindowEl.style.top = `${currentY}px`;
    }

    function dragEnd() {
        isDragging = false;
    }
}

// ===== REPLAY SYSTEM FUNCTIONS =====

/**
 * Capture current game state for history recording
 * Converts legacy Game object to immutable GameState
 */
function captureGameState() {
    const config = {
        gridWidth: game.GRID_WIDTH,
        gridHeight: game.GRID_HEIGHT,
        turnDelay: game.turnDelay,
        bombTimer: 10,
        bombRange: 2,
        explosionDuration: 500,
        maxPlayers: 4
    };

    const entities = {
        players: game.players.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            color: p.color,
            name: p.name,
            alive: p.alive,
            score: p.score,
            hasBomb: p.hasBomb,
            bombX: p.bombX,
            bombY: p.bombY,
            activeItems: [],
            // Battle Royale NPC special fields
            isNPC: p.isNPC || false,
            npcEmoji: p.npcEmoji || null,
            npcId: p.npcId || null
        })),
        bombs: game.bombs.map(b => ({
            id: b.id,
            x: b.x,
            y: b.y,
            playerId: b.playerId,
            range: b.range,
            turnsUntilExplode: b.turnsUntilExplode,
            placedOnTurn: b.placedOnTurn
        })),
        items: [],
        explosions: game.explosions.map(e => ({
            cells: [...e.cells],
            timestamp: e.timestamp,
            duration: e.duration
        }))
    };

    const metadata = {
        turnCount: game.turnCount,
        currentPlayerIndex: game.currentPlayerIndex,
        running: game.running,
        paused: game.paused,
        gameStartTime: null,
        gameEndTime: null,
        winner: null
    };

    return new GameState(config, entities, game.grid.map(row => [...row]), metadata);
}

/**
 * Restore game state from history entry (for replay)
 */
function restoreGameState(gameState) {
    // Update grid
    game.grid = gameState.grid.map(row => [...row]);

    // Update players (match by ID, not index, to handle Battle Royale NPCs)
    game.players.forEach((player) => {
        const savedPlayer = gameState.entities.players.find(p => p.id === player.id);
        if (savedPlayer) {
            player.x = savedPlayer.x;
            player.y = savedPlayer.y;
            player.alive = savedPlayer.alive;
            player.score = savedPlayer.score;
            player.hasBomb = savedPlayer.hasBomb;
            player.bombX = savedPlayer.bombX;
            player.bombY = savedPlayer.bombY;
            // Restore Battle Royale NPC special fields
            player.isNPC = savedPlayer.isNPC || false;
            player.npcEmoji = savedPlayer.npcEmoji || null;
            player.npcId = savedPlayer.npcId || null;
        }
    });

    // Update bombs
    game.bombs = gameState.entities.bombs.map(b => ({
        id: b.id,
        x: b.x,
        y: b.y,
        playerId: b.playerId,
        range: b.range,
        turnsUntilExplode: b.turnsUntilExplode,
        placedOnTurn: b.placedOnTurn
    }));

    // Update explosions
    game.explosions = gameState.entities.explosions.map(e => ({
        cells: [...e.cells],
        timestamp: e.timestamp,
        duration: e.duration
    }));

    // Update metadata
    game.turnCount = gameState.metadata.turnCount;
    game.currentPlayerIndex = gameState.metadata.currentPlayerIndex;

    // Re-render
    renderGrid();
    updateScores();
    updateGameInfo();
}

/**
 * Restore player thoughts and prompts from history action (for replay)
 */
function restoreThoughtsFromHistory() {
    const currentEntry = gameHistory.getCurrentEntry();
    if (!currentEntry || !currentEntry.action) {
        return;
    }

    const action = currentEntry.action;

    // Restore thoughts
    if (action.payload && action.payload.thoughts) {
        const thoughts = action.payload.thoughts;
        // Restore thoughts for ALL players including Battle Royale NPCs (1-10)
        for (let i = 1; i <= 10; i++) {
            if (thoughts[i] !== undefined) {
                ai.playerMemory[i] = thoughts[i];
            }
        }
    }

    // Restore prompts
    if (action.payload && action.payload.prompts) {
        const prompts = action.payload.prompts;
        // Restore prompts for ALL players including Battle Royale NPCs (1-10)
        for (let i = 1; i <= 10; i++) {
            if (prompts[i] !== undefined) {
                ai.prompts[i] = prompts[i];
            }
        }
    }
}

/**
 * Enter replay mode
 */
function enterReplayMode() {
    isReplayMode = true;

    // Jump to start of game
    gameHistory.jumpToStart();
    const startState = gameHistory.getCurrentState();
    if (startState) {
        restoreGameState(startState);
        restoreThoughtsFromHistory();
    }

    // Create replay player instance
    replayPlayer = new ReplayPlayer(gameHistory);
    replayPlayer.onStateChange = (state) => {
        restoreGameState(state);
        restoreThoughtsFromHistory();
        updateReplayUI();
    };

    // Show replay controls
    showReplayControls();

    log('Entered replay mode - use controls to navigate through game history');
}

/**
 * Exit replay mode
 */
function exitReplayMode() {
    isReplayMode = false;
    replayPlayer = null;

    // Hide replay controls
    const replayPanel = document.getElementById('replayControlPanel');
    if (replayPanel) {
        replayPanel.remove();
    }

    // Jump back to end of game
    gameHistory.jumpToEnd();
    const finalState = gameHistory.getCurrentState();
    if (finalState) {
        restoreGameState(finalState);
    }

    log('Exited replay mode');
}

/**
 * Show replay control panel
 */
function showReplayControls() {
    // Remove game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) {
        overlay.remove();
    }

    // Create replay control panel
    const gameBoard = document.getElementById('gameBoard');
    const panel = document.createElement('div');
    panel.id = 'replayControlPanel';
    panel.className = 'replay-panel';

    const totalTurns = gameHistory.entries.length - 1;

    panel.innerHTML = `
        <div class="replay-header">
            <h2>⏮️ REPLAY MODE ⏮️</h2>
            <button onclick="exitReplayAndShowGameOver()" class="exit-replay">EXIT REPLAY</button>
        </div>
        <div class="replay-info">
            <span id="replayTurnInfo">Turn: 0 / ${totalTurns}</span>
            <span id="replayProgress">Progress: 0%</span>
        </div>
        <div class="replay-timeline">
            <input type="range" id="replaySlider" min="0" max="${totalTurns}" value="0" step="1" />
        </div>
        <div class="replay-controls">
            <button onclick="replayJumpToStart()" title="Jump to start">⏮️</button>
            <button onclick="replayStepBackward()" title="Previous turn">◀️</button>
            <button onclick="replayStepForward()" title="Next turn">▶️</button>
            <button onclick="replayJumpToEnd()" title="Jump to end">⏭️</button>
        </div>
        <div class="replay-speed">
            <label>Speed:</label>
            <button onclick="setReplaySpeed(0.5)" class="speed-btn">0.5x</button>
            <button onclick="setReplaySpeed(1.0)" class="speed-btn active">1x</button>
            <button onclick="setReplaySpeed(2.0)" class="speed-btn">2x</button>
            <button onclick="setReplaySpeed(4.0)" class="speed-btn">4x</button>
        </div>
    `;

    gameBoard.appendChild(panel);

    // Add slider event listener
    document.getElementById('replaySlider').addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        gameHistory.jumpToIndex(index);
        const state = gameHistory.getCurrentState();
        if (state) {
            restoreGameState(state);
            restoreThoughtsFromHistory();
            updateReplayUI();
        }
    });

    updateReplayUI();
}

/**
 * Update replay UI info
 */
function updateReplayUI() {
    const current = gameHistory.currentIndex;
    const total = gameHistory.entries.length - 1;
    const progress = total > 0 ? Math.round((current / total) * 100) : 0;

    const turnInfo = document.getElementById('replayTurnInfo');
    const progressInfo = document.getElementById('replayProgress');
    const slider = document.getElementById('replaySlider');

    if (turnInfo) {
        const currentEntry = gameHistory.getCurrentEntry();
        const turnCount = currentEntry ? currentEntry.state.metadata.turnCount : 0;
        turnInfo.textContent = `Turn: ${turnCount} (${current}/${total})`;
    }

    if (progressInfo) {
        progressInfo.textContent = `Progress: ${progress}%`;
    }

    if (slider) {
        slider.value = current;
    }
}

/**
 * Replay navigation functions
 */
function replayStepForward() {
    if (gameHistory.canRedo()) {
        const state = gameHistory.redo();
        if (state) {
            restoreGameState(state);
            restoreThoughtsFromHistory();
            updateReplayUI();
        }
    }
}

function replayStepBackward() {
    if (gameHistory.canUndo()) {
        const state = gameHistory.undo();
        if (state) {
            restoreGameState(state);
            restoreThoughtsFromHistory();
            updateReplayUI();
        }
    }
}

function replayJumpToStart() {
    const state = gameHistory.jumpToStart();
    if (state) {
        restoreGameState(state);
        restoreThoughtsFromHistory();
        updateReplayUI();
    }
}

function replayJumpToEnd() {
    const state = gameHistory.jumpToEnd();
    if (state) {
        restoreGameState(state);
        restoreThoughtsFromHistory();
        updateReplayUI();
    }
}

function setReplaySpeed(speed) {
    if (replayPlayer) {
        replayPlayer.setSpeed(speed);
    }

    // Update active button
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function exitReplayAndShowGameOver() {
    exitReplayMode();

    // Recreate game over screen
    const winner = game.getWinner();
    const gameBoard = document.getElementById('gameBoard');
    const overlay = document.createElement('div');
    overlay.id = 'gameOverOverlay';
    overlay.innerHTML = `
        <div class="game-over-content">
            <h1>🎮 GAME OVER! 🎮</h1>
            <h2>🏆 WINNER: ${winner.name} 🏆</h2>
            <p class="winner-emoji">${getPlayerEmoji(winner.id)}</p>
            <p>Score: ${winner.score} points</p>
            <p class="game-stats">Total Turns: ${game.turnCount} | Recorded States: ${gameHistory.entries.length}</p>
            <div class="game-over-buttons">
                <button onclick="enterReplayMode()">⏮️ REPLAY</button>
                <button onclick="document.getElementById('resetGame').click(); document.getElementById('gameOverOverlay').remove();">🔄 PLAY AGAIN</button>
            </div>
        </div>
    `;
    gameBoard.appendChild(overlay);
}
