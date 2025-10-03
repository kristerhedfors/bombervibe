// ui-init.js - Initialize game with new architecture
// Replaces initialization from legacy ui.js

// Global instances
let game;
let engine;
let llm;
let renderer;
let prompts;
let gameHistory;
let replayPlayer = null;
let isReplayMode = false;
let gameOverDetected = false;

// Helper functions from legacy ui.js that are still needed
function log(message, type = 'info') {
    const logContent = document.getElementById('logContent');
    if (!logContent) return;

    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${timestamp}] ${message}`;

    if (type === 'error') entry.style.color = '#ff3300';
    else if (type === 'success') entry.style.color = '#00ff00';

    logContent.insertBefore(entry, logContent.firstChild);

    while (logContent.children.length > 20) {
        logContent.removeChild(logContent.lastChild);
    }
}

function showErrorModal(message, details) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');

    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        if (details) {
            errorMessage.textContent += `\n\nDetails: ${JSON.stringify(details, null, 2)}`;
        }
        errorModal.classList.remove('hidden');
    }
}

function closeErrorModal() {
    const errorModal = document.getElementById('errorModal');
    if (errorModal) {
        errorModal.classList.add('hidden');
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    log('Initializing game with new architecture...');

    try {
        // Create instances
        prompts = new BombervibePrompts();
        game = new BombervibeGame(prompts, null, { testingMode: false });
        llm = new LLMAdapter();
        renderer = new BombervibeRenderer();
        engine = new GameEngine(game, llm, renderer);
        gameHistory = new GameHistory();

        // Initialize
        engine.initialize({
            turnDelay: 1000,
            autoPlay: true,
            parallelAI: true
        });

        // Set renderer's LLM reference
        renderer.setLLMAdapter(llm);

        // Set error callback
        llm.setErrorCallback(showErrorModal);

        // Check for API key in URL fragment
        const fragment = window.location.hash.substring(1);
        let apiKeyFromURL = null;
        let maxRoundsFromURL = null;

        if (fragment) {
            const parts = fragment.split('&');
            const apiKeyPart = parts[0];

            if (apiKeyPart && (apiKeyPart.startsWith('gsk_') || apiKeyPart.startsWith('sk-'))) {
                apiKeyFromURL = apiKeyPart;

                for (let i = 1; i < parts.length; i++) {
                    const [key, value] = parts[i].split('=');
                    if (key === 'maxRounds' && !isNaN(parseInt(value))) {
                        maxRoundsFromURL = parseInt(value);
                        window.maxRoundsForTesting = maxRoundsFromURL;
                        log(`[TEST MODE] Will auto-stop after ${maxRoundsFromURL} rounds`);
                    }
                }

                llm.setApiKey(apiKeyFromURL);
                document.getElementById('apiModal').classList.add('hidden');
                document.getElementById('apiKeyInput').value = '***';
                log('API key loaded from URL fragment');
            }
        } else if (llm.loadApiKey()) {
            document.getElementById('apiModal').classList.add('hidden');
            document.getElementById('apiKeyInput').value = '***';
            log('API key loaded from localStorage');
        }

        // Load stored prompts
        for (let i = 1; i <= 4; i++) {
            const textarea = document.getElementById(`prompt${i}`);
            const storedPrompt = prompts.getPlayerPrompt(i);
            if (textarea && storedPrompt) {
                textarea.value = storedPrompt;
            }
        }

        // Load system prompt
        const systemPromptEditor = document.getElementById('systemPromptEditor');
        if (systemPromptEditor) {
            systemPromptEditor.value = prompts.getSystemPrompt();
        }

        // Clear all player memories on page load
        llm.clearAllMemories();

        // Render initial state
        renderer.render(game.getGameState());

        // Setup event listeners
        setupEventListeners();

        // Expose to window for debugging
        window.game = game;
        window.engine = engine;
        window.llm = llm;
        window.renderer = renderer;
        window.ai = llm; // Backward compatibility

        log('✓ System initialized. Enter API key to begin.');

    } catch (error) {
        console.error('[INIT] Initialization failed:', error);
        log('✗ Initialization failed: ' + error.message, 'error');
    }
});

function setupEventListeners() {
    // API Key
    document.getElementById('saveApiKey')?.addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            llm.setApiKey(key);
            document.getElementById('apiModal').classList.add('hidden');
            log('API key saved. Ready to start!');
        }
    });

    // Game controls
    document.getElementById('startGame')?.addEventListener('click', startGame);
    document.getElementById('pauseGame')?.addEventListener('click', pauseGame);
    document.getElementById('resetGame')?.addEventListener('click', resetGame);
    document.getElementById('editSystemPrompt')?.addEventListener('click', openSystemPromptEditor);

    // System prompt modal
    document.getElementById('saveSystemPrompt')?.addEventListener('click', saveSystemPrompt);
    document.getElementById('resetSystemPrompt')?.addEventListener('click', resetSystemPrompt);
    document.getElementById('closeSystemPrompt')?.addEventListener('click', closeSystemPromptEditor);

    // Error modal
    document.getElementById('closeError')?.addEventListener('click', closeErrorModal);

    // Prompt editors
    for (let i = 1; i <= 4; i++) {
        const promptElement = document.getElementById(`prompt${i}`);
        if (promptElement) {
            promptElement.addEventListener('change', (e) => {
                prompts.setPlayerPrompt(i, e.target.value, game.turnCount);
                log(`Player ${i} strategy updated`);
            });
        }
    }

    // Keyboard controls for Player 1 (manual mode)
    document.addEventListener('keydown', handleKeyboard);
}

function handleKeyboard(e) {
    if (!engine.isRunning() || engine.isPaused()) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== 1) return;

    let direction = null;
    let dropBomb = e.shiftKey;

    switch(e.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
        case ' ':
        case 'b':
        case 'B':
            game.playerPlaceBomb(1);
            log('Player 1 placed BOMB (manual)');
            renderer.render(game.getGameState());
            game.nextTurn();
            e.preventDefault();
            return;
    }

    if (direction) {
        const move = { action: 'move', direction, dropBomb };
        if (game.processMove(1, move)) {
            log(`Player 1 moved ${direction.toUpperCase()}${dropBomb ? ' + BOMB' : ''} (manual)`);
            renderer.render(game.getGameState());
            game.nextTurn();
        }
        e.preventDefault();
    }
}

function startGame() {
    if (!llm.apiKey) {
        alert('Please enter your API key first!');
        document.getElementById('apiModal').classList.remove('hidden');
        return;
    }

    engine.start();
    gameOverDetected = false;

    // Record initial state for replay
    const initialState = game.getGameState();
    gameHistory.recordInitial(GameState.fromJSON({
        config: { gridWidth: game.GRID_WIDTH, gridHeight: game.GRID_HEIGHT },
        entities: { players: [], bombs: [], items: [], explosions: [] },
        grid: initialState.grid,
        metadata: { turnCount: 0, roundCount: 0, running: false, paused: false }
    }));

    log('Game started!');
}

function pauseGame() {
    engine.pause();
    log(engine.isPaused() ? 'Game paused' : 'Game resumed');
}

function resetGame() {
    engine.reset();
    llm.clearAllMemories();
    prompts.clearPromptHistory();
    gameOverDetected = false;
    gameHistory = new GameHistory();
    replayPlayer = null;
    isReplayMode = false;

    // Clear localStorage
    for (let i = 1; i <= 10; i++) {
        localStorage.removeItem(`bombervibe_player_${i}_prompt`);
        localStorage.removeItem(`player_${i}_memory`);
        localStorage.removeItem(`bombervibe_player_${i}_prompt_history`);
    }
    localStorage.removeItem('bombervibe_system_prompt');

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('bombervibe_') || key.startsWith('gameState_')) {
            localStorage.removeItem(key);
        }
    });

    window.dispatchEvent(new Event('gameReset'));
    log('🧹 Complete reset - all data cleared');
}

function openSystemPromptEditor() {
    const modal = document.getElementById('systemPromptModal');
    const editor = document.getElementById('systemPromptEditor');
    if (modal && editor) {
        editor.value = prompts.getSystemPrompt();
        modal.classList.remove('hidden');
    }
}

function saveSystemPrompt() {
    const editor = document.getElementById('systemPromptEditor');
    if (editor) {
        prompts.setSystemPrompt(editor.value);
        log('System prompt saved');
        closeSystemPromptEditor();
    }
}

function resetSystemPrompt() {
    prompts.resetSystemPrompt();
    const editor = document.getElementById('systemPromptEditor');
    if (editor) {
        editor.value = prompts.getSystemPrompt();
    }
    log('System prompt reset to default');
}

function closeSystemPromptEditor() {
    const modal = document.getElementById('systemPromptModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
