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
        // Can only place one bomb at a time
        if (this.hasBomb) {
            return false;
        }

        // Check if there's already a bomb at this position
        if (grid[this.y][this.x] === 'bomb' + this.id) {
            return false;
        }

        // Place bomb
        this.hasBomb = true;
        this.bombX = this.x;
        this.bombY = this.y;

        const bomb = {
            id: 'bomb' + this.id,
            playerId: this.id,
            x: this.x,
            y: this.y,
            roundsUntilExplode: 4, // Explodes after 4 rounds (1 round = all players move once)
            range: this.bombRange || 1, // Use player's bombRange or default 1
            placedOnRound: null // Will be set by game
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
            bombRange: this.bombRange
        };
    }
}
