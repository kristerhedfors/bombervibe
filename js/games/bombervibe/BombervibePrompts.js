// BombervibePrompts.js - All Bomberman-specific LLM prompts and prompt generation
// Handles system prompts, user prompts, and response format definitions

class BombervibePrompts {
    constructor() {
        this.systemPrompt = this.getDefaultSystemPrompt();
        this.playerPrompts = {}; // Custom prompts per player
        this.promptHistory = {}; // Track prompt changes: {playerId: [{prompt, turnNumber, timestamp}]}

        this.loadSystemPrompt();
        this.loadPlayerPrompts();
        this.loadPromptHistory();
    }

    /**
     * Get default system prompt
     */
    getDefaultSystemPrompt() {
        return `ELECTRIC BOOGALOO - AI Bomberman

RULES:
• Grid: 13x11, chess notation (A-M cols, 1-11 rows), 11x11 vision
• Walk through: empty (·), bombs (💣), players | BLOCKED by: soft (🟫), hard (⬛)
• Bomb capacity shown as "Bombs:X/Y" (active/max - starts 1, increases with 💣 power-up)
• Bombs: Explode after 4 ROUNDS in + pattern (cardinal only, NOT diagonal)
• Range: 1 base, +1 per Flash Radius (⚡) loot pickup
• Scoring: +10 per 🟫 destroyed, +100 per kill
• 1 ROUND = all 4 players move once

POWER-UPS:
• ⚡ Flash Radius: +1 bomb range
• 💣 Extra Bomb: Place multiple bombs simultaneously
• 🧤 Bomb Pickup: Can pickup and throw bombs (wrap-around edges!)

CRITICAL - BOMB MECHANICS:
1. Bombs drop at YOUR CURRENT POSITION, then you move (or stay)
2. "Breakable: 1 (up)" means soft block is UP from you - bomb will hit it from HERE
3. After dropping bomb, move to EMPTY space (or stay if safe!)
4. Example: At A2 with "Breakable: 1 (up)", block is at A3
   - ✅ CORRECT: dropBomb:true + direction:"down" (escape to A1)
   - ✅ CORRECT: dropBomb:true + direction:"stay" (if current position safe for 4 rounds)
   - ❌ WRONG: dropBomb:true + direction:"up" (BLOCKED by soft block at A3!)

SURVIVAL - MULTI-BOMB ESCAPE LOGIC:
• DIAGONAL = SAFE from bombs (only cardinal directions lethal)
• If bomb at C5: C4/C6/B5/D5 = DEATH, D6/B4/D4/B6 = SAFE
• Higher range = escape further! Range 2 = 2 tiles, Range 3 = 3 tiles
⚠️ **MULTIPLE BOMBS WARNING**: When placing a bomb, you MUST escape from ALL bombs:
  - Your OWN bombs (including the one you just placed)
  - Other players' bombs (yours or theirs)
  - Check EACH bomb's position + range + timing
  - Move MUST be safe from ALL bomb blast zones combined
  - Example: If bomb at D5 (range 2) and you place at D7, moving to D6 = DEATH (hit by both)

CRITICAL PRIORITY - BOMB WHEN ADJACENT TO SOFT BLOCKS:
⚠️ **IF "Breakable: 1+" appears → IMMEDIATELY dropBomb:true + escape direction**
⚠️ This is the ONLY way to score points - don't just move around!
⚠️ Example: "Breakable: 1 (right)" → {"direction":"left","dropBomb":true}

WINNING STRATEGY (in order):
1. **BOMB ADJACENT BLOCKS** - If any breakable blocks adjacent + 💣0 → DROP BOMB
2. **ESCAPE DANGER** - If current position lethal → pick SAFE move immediately
3. **MOVE TOWARD SOFT BLOCKS** - If no adjacent blocks → move toward nearest 🟫
4. **COLLECT LOOT** - Pick up ⚡ when safe (increases bomb range)
5. **STAY MOBILE** - Avoid corners and dead ends

BOMB PLACEMENT RULES:
✅ "Breakable: 1+" + bombs available + safe escape from ALL bombs → DROP BOMB NOW!
✅ Stay on bomb if 4 rounds to explode, otherwise move to EMPTY space
✅ Check DANGER ANALYSIS for ALL active bombs before placing new one
✅ Example: At D11 with "Breakable: 1 (right)" → {"direction":"left","dropBomb":true}
❌ WRONG: Moving away when breakable blocks are adjacent (you waste the opportunity!)
❌ WRONG: No bombs available (check "Bombs:X/Y" - if X=Y, can't place more!)
❌ WRONG: Escape route is in another bomb's blast zone (check ALL bomb positions + ranges!)
❌ WRONG: Ignoring existing bombs when planning escape (you die from old bombs too!)

RESPONSE (JSON):
{
  "action": "move|pickup|throw",
  "direction": "up|down|left|right|stay",
  "dropBomb": true|false,
  "thought": "Why this move (50 words max)"
}

ACTIONS:
• "move" (default): Normal movement with optional bomb drop
• "pickup": Pick up bomb at current position (requires 🧤 power-up)
• "throw": Throw carried bomb in direction (wraps around grid edges!)`;
    }

    /**
     * Set system prompt
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        localStorage.setItem('bombervibe_system_prompt', prompt);
    }

    /**
     * Load system prompt from storage
     */
    loadSystemPrompt() {
        const stored = localStorage.getItem('bombervibe_system_prompt');
        if (stored) {
            this.systemPrompt = stored;
        }
    }

    /**
     * Reset system prompt to default
     */
    resetSystemPrompt() {
        this.systemPrompt = this.getDefaultSystemPrompt();
        localStorage.removeItem('bombervibe_system_prompt');
    }

    /**
     * Get system prompt
     */
    getSystemPrompt() {
        return this.systemPrompt;
    }

    /**
     * Set player-specific prompt
     */
    setPlayerPrompt(playerId, prompt, turnNumber = 0) {
        this.playerPrompts[playerId] = prompt;
        localStorage.setItem(`bombervibe_player_${playerId}_prompt`, prompt);
        this.recordPromptChange(playerId, prompt, turnNumber);
    }

    /**
     * Get player-specific prompt
     */
    getPlayerPrompt(playerId) {
        return this.playerPrompts[playerId] || BombervibeConfig.DEFAULT_PROMPTS[playerId] || '';
    }

    /**
     * Load player prompts from storage
     */
    loadPlayerPrompts() {
        for (let i = 1; i <= 10; i++) {
            const stored = localStorage.getItem(`bombervibe_player_${i}_prompt`);
            if (stored) {
                this.playerPrompts[i] = stored;
            }
        }
    }

    /**
     * Reset player prompt to default
     */
    resetPlayerPrompt(playerId, turnNumber = 0) {
        const defaultPrompt = BombervibeConfig.DEFAULT_PROMPTS[playerId];
        if (defaultPrompt) {
            this.setPlayerPrompt(playerId, defaultPrompt, turnNumber);
            return defaultPrompt;
        }
        return null;
    }

    /**
     * Record prompt change in history
     */
    recordPromptChange(playerId, prompt, turnNumber = 0) {
        if (!this.promptHistory[playerId]) {
            this.promptHistory[playerId] = [];
        }

        const entry = {
            prompt: prompt,
            turnNumber: turnNumber,
            timestamp: Date.now()
        };

        this.promptHistory[playerId].push(entry);
        localStorage.setItem(`bombervibe_player_${playerId}_prompt_history`, JSON.stringify(this.promptHistory[playerId]));
    }

    /**
     * Load prompt history from storage
     */
    loadPromptHistory() {
        for (let i = 1; i <= 10; i++) {
            const stored = localStorage.getItem(`bombervibe_player_${i}_prompt_history`);
            if (stored) {
                try {
                    this.promptHistory[i] = JSON.parse(stored);
                } catch (e) {
                    console.error(`Failed to parse prompt history for player ${i}:`, e);
                    this.promptHistory[i] = [];
                }
            }
        }
    }

    /**
     * Get prompt history for player
     */
    getPromptHistory(playerId) {
        return this.promptHistory[playerId] || [];
    }

    /**
     * Get prompt at specific turn
     */
    getPromptAtTurn(playerId, turnNumber) {
        const history = this.getPromptHistory(playerId);
        if (history.length === 0) {
            return this.getPlayerPrompt(playerId);
        }

        let activePrompt = history[0].prompt;
        for (const entry of history) {
            if (entry.turnNumber <= turnNumber) {
                activePrompt = entry.prompt;
            } else {
                break;
            }
        }
        return activePrompt;
    }

    /**
     * Clear prompt history
     */
    clearPromptHistory(playerId = null) {
        if (playerId) {
            this.promptHistory[playerId] = [];
            localStorage.removeItem(`bombervibe_player_${playerId}_prompt_history`);
        } else {
            for (let i = 1; i <= 10; i++) {
                this.promptHistory[i] = [];
                localStorage.removeItem(`bombervibe_player_${i}_prompt_history`);
            }
        }
    }

    /**
     * Get JSON schema for tactical response
     */
    getTacticalResponseFormat() {
        return {
            type: "json_schema",
            json_schema: {
                name: "bomberman_move",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            enum: ["move", "pickup", "throw"],
                            description: "Action type"
                        },
                        direction: {
                            type: "string",
                            enum: ["up", "down", "left", "right", "stay"],
                            description: "Direction to move or throw"
                        },
                        dropBomb: {
                            type: "boolean",
                            description: "Drop bomb before moving (move action only)"
                        },
                        thought: {
                            type: "string",
                            description: "Tactical reasoning (max 50 words)"
                        }
                    },
                    required: ["direction", "dropBomb", "thought"],
                    additionalProperties: false
                }
            }
        };
    }

    /**
     * Get JSON schema for memory update
     */
    getMemoryResponseFormat() {
        return {
            type: "json_schema",
            json_schema: {
                name: "memory_update",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        memory: {
                            type: "string",
                            description: "Operational notes for next turn (max 50 words)"
                        }
                    },
                    required: ["memory"],
                    additionalProperties: false
                }
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombervibePrompts };
}
