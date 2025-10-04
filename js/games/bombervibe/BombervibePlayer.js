// Player.js - Player state management

class Player {
    constructor(id, x, y, color, name) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.name = name;
        this.alive = true;
        this.score = 0;
        this.hasBomb = false; // Can only place one bomb at a time
        this.bombX = null;
        this.bombY = null;
        this.bombRange = 1; // Blast radius (can be increased by loot)
        this.maxBombs = 1; // Maximum simultaneous bombs (can be increased by loot)
        this.activeBombs = 0; // Track number of active bombs

        // Power-ups
        this.canPickupBombs = false; // Bomb pickup/throw power-up
        this.carriedBomb = null; // Reference to bomb being carried
    }

    move(newX, newY, grid) {
        // Check boundaries
        if (newX < 0 || newX >= 13 || newY < 0 || newY >= 11) {
            return false;
        }

        // Check if cell is passable
        const cell = grid[newY][newX];
        // Can move through: empty cells (0), bombs
        // Cannot move through: soft blocks (1), hard blocks (2)
        if (cell === 0 || (typeof cell === 'string' && cell.startsWith('bomb'))) {
            this.x = newX;
            this.y = newY;
            return true;
        }

        return false;
    }

    placeBomb(grid, bombs) {
        // Check if player has reached max bombs limit
        if (this.activeBombs >= this.maxBombs) {
            return false;
        }

        // Check if there's already a bomb at this position
        const cellContent = grid[this.y][this.x];
        if (typeof cellContent === 'string' && cellContent.startsWith('bomb')) {
            return false;
        }

        // Place bomb
        this.activeBombs++;

        if (this.activeBombs === 1) {
            this.hasBomb = true; // Keep for backward compatibility
            this.bombX = this.x;
            this.bombY = this.y;
        }

        const bomb = {
            id: 'bomb' + this.id + '_' + Date.now(), // Unique ID for multiple bombs
            playerId: this.id,
            x: this.x,
            y: this.y,
            turnsUntilExplode: BombervibeConfig.BOMB_TURNS_UNTIL_EXPLODE, // Explodes after N player turns
            range: this.bombRange || 1, // Use player's bombRange or default 1
            placedOnTurn: null // Will be set by game
        };

        bombs.push(bomb);
        grid[this.y][this.x] = bomb.id;

        return true;
    }

    die() {
        this.alive = false;
    }

    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.alive = true;
        this.hasBomb = false;
        this.bombX = null;
        this.bombY = null;
    }

    addScore(points) {
        this.score += points;
    }

    pickupLoot(lootType) {
        if (lootType === 'flash_radius') {
            this.bombRange += 1;
            console.log(`[P${this.id}] Picked up Flash Radius! Bomb range now: ${this.bombRange}`);
        } else if (lootType === 'bomb_pickup') {
            this.canPickupBombs = true;
            console.log(`[P${this.id}] Picked up Bomb Pickup! Can now pickup and throw bombs`);
        } else if (lootType === 'extra_bomb') {
            this.maxBombs += 1;
            console.log(`[P${this.id}] Picked up Extra Bomb! Max bombs now: ${this.maxBombs}`);
        }
    }

    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            color: this.color,
            name: this.name,
            alive: this.alive,
            score: this.score,
            hasBomb: this.hasBomb,
            bombRange: this.bombRange,
            maxBombs: this.maxBombs,
            activeBombs: this.activeBombs,
            canPickupBombs: this.canPickupBombs,
            carriedBomb: this.carriedBomb ? this.carriedBomb.id : null
        };
    }
}
