// Drag & Drop System for NPC Characters
// Handles spawning NPCs onto the game board

let spawnedNPCs = []; // Track which NPCs have been spawned

// Initialize NPC palette on page load
function initializeNPCPalette() {
    const npcGrid = document.querySelector('.npc-grid');
    if (!npcGrid) return;

    // Clear existing NPCs
    npcGrid.innerHTML = '';

    // Create NPC icons
    NPC_CHARACTERS.forEach(npc => {
        const icon = document.createElement('div');
        icon.className = 'npc-icon';
        icon.draggable = true;
        icon.dataset.npcId = npc.id;
        icon.style.borderColor = npc.color;
        icon.style.color = npc.color;
        icon.style.boxShadow = `0 0 15px ${npc.color}`;

        // Emoji
        const emoji = document.createElement('div');
        emoji.className = 'npc-emoji';
        emoji.textContent = npc.emoji;

        // Name
        const name = document.createElement('div');
        name.className = 'npc-name';
        name.textContent = npc.name;

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'npc-tooltip';
        tooltip.style.borderColor = npc.color;
        tooltip.style.color = npc.color;

        // Highlight keyword in tooltip
        const tooltipText = npc.tooltip.replace(
            npc.keyword,
            `<span class="keyword">${npc.keyword}</span>`
        );
        tooltip.innerHTML = tooltipText;

        icon.appendChild(emoji);
        icon.appendChild(name);
        icon.appendChild(tooltip);
        npcGrid.appendChild(icon);

        // Add drag event listeners
        icon.addEventListener('dragstart', handleDragStart);
        icon.addEventListener('dragend', handleDragEnd);
    });
}

// Handle drag start
function handleDragStart(e) {
    const icon = e.target.closest('.npc-icon');
    if (!icon || icon.classList.contains('spawned')) {
        e.preventDefault();
        return;
    }

    const npcId = icon.dataset.npcId;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', npcId);
    icon.classList.add('dragging');
}

// Handle drag end
function handleDragEnd(e) {
    const icon = e.target.closest('.npc-icon');
    if (icon) {
        icon.classList.remove('dragging');
    }
}

// Initialize drop zones on grid cells
function initializeDropZones() {
    const grid = document.getElementById('grid');
    if (!grid) return;

    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);
}

// Handle drag over grid
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

// Handle drop on grid
function handleDrop(e) {
    e.preventDefault();

    const npcId = e.dataTransfer.getData('text/plain');
    if (!npcId) return;

    const npc = getNPCCharacter(npcId);
    if (!npc) return;

    // Get drop coordinates
    const grid = document.getElementById('grid');
    const gridRect = grid.getBoundingClientRect();
    const x = e.clientX - gridRect.left;
    const y = e.clientY - gridRect.top;

    // Calculate cell position
    const gapSize = 1;
    const cellWidth = (gridRect.width - (gapSize * (game.GRID_WIDTH - 1))) / game.GRID_WIDTH;
    const cellHeight = (gridRect.height - (gapSize * (game.GRID_HEIGHT - 1))) / game.GRID_HEIGHT;

    const cellX = Math.floor(x / (cellWidth + gapSize));
    const cellY = Math.floor(y / (cellHeight + gapSize));

    // Validate drop position
    if (cellX < 0 || cellX >= game.GRID_WIDTH || cellY < 0 || cellY >= game.GRID_HEIGHT) {
        log('⚠️ Invalid drop position - out of bounds');
        return;
    }

    // Check if cell is empty (no hard blocks, soft blocks OK)
    const cellType = game.grid[cellY][cellX];
    if (cellType === 2) {
        log('⚠️ Cannot spawn NPC on hard block');
        return;
    }

    // Check if another player is already at this position
    const playerHere = game.players.find(p => p.alive && p.x === cellX && p.y === cellY);
    if (playerHere) {
        log('⚠️ Cannot spawn NPC - position occupied');
        return;
    }

    // Spawn the NPC!
    spawnNPC(npc, cellX, cellY);
}

// Spawn NPC at position
function spawnNPC(npc, x, y) {
    if (!game) {
        log('⚠️ Cannot spawn NPC - game not initialized');
        return;
    }

    // Allow spawning anytime - whether game is running or not
    console.log(`[NPC] Spawning ${npc.name} at (${x}, ${y}), game.running=${game.running}`);

    // Check if NPC already spawned
    if (spawnedNPCs.includes(npc.id)) {
        log(`⚠️ ${npc.name} already spawned`);
        return;
    }

    // Get next available player ID
    const playerId = getNextNPCPlayerId(game.players);
    if (!playerId) {
        log('⚠️ Maximum players reached (10 max)');
        return;
    }

    // Create new player
    const player = new Player(playerId, x, y, npc.color, npc.name);

    // Store NPC-specific data
    player.npcId = npc.id;
    player.npcEmoji = npc.emoji;
    player.isNPC = true;

    game.players.push(player);

    // Set NPC prompt in AI controller
    ai.setPrompt(playerId, npc.prompt);

    // Initialize NPC memory
    ai.playerMemory[playerId] = '';

    // Mark NPC as spawned in UI
    const icon = document.querySelector(`.npc-icon[data-npc-id="${npc.id}"]`);
    if (icon) {
        icon.classList.add('spawned');
        icon.draggable = false;
    }

    spawnedNPCs.push(npc.id);

    // Update UI
    renderGrid();
    updateScores();

    // Add to scoreboard dynamically
    addNPCToScoreboard(player);

    log(`⚡ ${npc.name} spawned at (${x}, ${y}) as Player ${playerId}! Battle royale mode activated!`);
}

// Add NPC to scoreboard
function addNPCToScoreboard(player) {
    const scoreBoard = document.getElementById('scoreBoard');
    if (!scoreBoard) return;

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score';
    scoreDiv.id = `score-container-${player.id}`;
    scoreDiv.style.color = player.color;
    scoreDiv.innerHTML = `P${player.id}: <span id="score${player.id}">0</span>`;

    scoreBoard.appendChild(scoreDiv);
}

// Initialize drag & drop system
window.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other systems are loaded
    setTimeout(() => {
        initializeNPCPalette();
        initializeDropZones();
        console.log('[NPC] Drag & drop system initialized');
    }, 100);
});

// Reset NPCs on game reset
window.addEventListener('gameReset', () => {
    spawnedNPCs = [];
    initializeNPCPalette(); // Refresh palette

    // Remove NPC scoreboards
    const scoreBoard = document.getElementById('scoreBoard');
    if (scoreBoard) {
        const npcScores = scoreBoard.querySelectorAll('[id^="score-container-"]:not([id$="-1"]):not([id$="-2"]):not([id$="-3"]):not([id$="-4"])');
        npcScores.forEach(el => el.remove());
    }
});
