// NPC Characters - Draggable Battle Royale NPCs
// Each NPC has unique personality, prompt, color, and memory

const NPC_CHARACTERS = [
    {
        id: 'berserker',
        name: 'BERSERKER',
        emoji: '🔥',
        color: '#ff8800', // Orange
        keyword: 'AGGRESSIVE',
        prompt: 'You are the BERSERKER. AGGRESSIVE rush tactics - charge toward center G6 immediately, spam bombs everywhere, prioritize destruction over survival. High risk, high reward!',
        tooltip: 'AGGRESSIVE rush - charge center, spam bombs, no escape plan',
        spawnable: true
    },
    {
        id: 'camper',
        name: 'CAMPER',
        emoji: '🏕️',
        color: '#9933ff', // Purple
        keyword: 'DEFENSIVE',
        prompt: 'You are the CAMPER. DEFENSIVE corner camp strategy - hold your spawn position, create bomb traps, ambush anyone who passes. Patience wins!',
        tooltip: 'DEFENSIVE corner camp - hold position, ambush passers',
        spawnable: true
    },
    {
        id: 'hunter',
        name: 'HUNTER',
        emoji: '🎯',
        color: '#ff3333', // Red
        keyword: 'STALKER',
        prompt: 'You are the HUNTER. STALKER tactics - identify the weakest player (lowest score/health), track their movements, execute when vulnerable. Methodical elimination!',
        tooltip: 'STALKER tactics - track weakest player, execute when vulnerable',
        spawnable: true
    },
    {
        id: 'trickster',
        name: 'TRICKSTER',
        emoji: '🎭',
        color: '#ff66cc', // Pink
        keyword: 'DECEPTIVE',
        prompt: 'You are the TRICKSTER. DECEPTIVE feint tactics - fake movements toward one direction then reverse, unpredictable bomb timing, confuse opponents. Chaos agent!',
        tooltip: 'DECEPTIVE feints - fake movements, unpredictable bomb timing',
        spawnable: true
    },
    {
        id: 'guardian',
        name: 'GUARDIAN',
        emoji: '🛡️',
        color: '#00dddd', // Teal
        keyword: 'PROTECTIVE',
        prompt: 'You are the GUARDIAN. PROTECTIVE patrol strategy - guard valuable soft block clusters, deny points to others, control territory. Territorial dominance!',
        tooltip: 'PROTECTIVE patrol - guard soft blocks, deny points to others',
        spawnable: true
    },
    {
        id: 'chaos',
        name: 'CHAOS',
        emoji: '💥',
        color: '#88ff00', // Lime
        keyword: 'RANDOM',
        prompt: 'You are CHAOS incarnate. RANDOM mayhem strategy - maximum destruction with no plan, drop bombs randomly, move erratically. Pure entropy!',
        tooltip: 'RANDOM mayhem - maximum destruction, no strategy',
        spawnable: true
    }
];

// Get NPC character by ID
function getNPCCharacter(id) {
    return NPC_CHARACTERS.find(npc => npc.id === id);
}

// Get available NPC characters (not yet spawned)
function getAvailableNPCs(spawnedIds = []) {
    return NPC_CHARACTERS.filter(npc => !spawnedIds.includes(npc.id) && npc.spawnable);
}

// Get next available player ID for NPC spawning
function getNextNPCPlayerId(currentPlayers) {
    const usedIds = currentPlayers.map(p => p.id);
    for (let id = 5; id <= 10; id++) {
        if (!usedIds.includes(id)) {
            return id;
        }
    }
    return null; // No slots available
}
