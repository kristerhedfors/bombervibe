// SeedFinder.js - Brute force search for seeds that generate worlds with desired properties

class SeedFinder {
    /**
     * Find seeds that generate worlds matching constraints
     * @param {Object} constraints - Desired world properties
     * @param {Object} options - Search options
     * @returns {Array<{seed: number, world: Object}>} Matching seeds
     */
    static findSeeds(constraints = {}, options = {}) {
        const startSeed = options.startSeed || 1;
        const maxAttempts = options.maxAttempts || 10000;
        const maxResults = options.maxResults || 10;
        const verbose = options.verbose || false;

        const results = [];
        let attempts = 0;

        console.log(`[SeedFinder] Searching for seeds with constraints:`, constraints);
        console.log(`[SeedFinder] Will try ${maxAttempts} seeds starting from ${startSeed}`);

        for (let seed = startSeed; seed < startSeed + maxAttempts && results.length < maxResults; seed++) {
            attempts++;

            // Create game with this seed
            const game = new Game(seed, {
                softBlockDensity: constraints.softBlockDensity || 0.4,
                lootSpawnChance: 0, // Don't spawn random loot during search
                testingMode: true
            });

            game.initialize();

            // Check if world matches constraints
            if (this.matchesConstraints(game, constraints)) {
                const worldInfo = this.analyzeWorld(game);
                results.push({
                    seed: seed,
                    world: worldInfo
                });

                if (verbose) {
                    console.log(`[SeedFinder] ✓ Found seed ${seed}:`, worldInfo);
                }
            }

            if (attempts % 1000 === 0 && verbose) {
                console.log(`[SeedFinder] Checked ${attempts} seeds, found ${results.length} matches...`);
            }
        }

        console.log(`[SeedFinder] Search complete. Found ${results.length} matching seeds in ${attempts} attempts.`);

        return results;
    }

    /**
     * Check if game world matches constraints
     * @param {Game} game - Game instance
     * @param {Object} constraints - Constraints to check
     * @returns {boolean} True if matches
     */
    static matchesConstraints(game, constraints) {
        // Count soft blocks
        const softBlockCount = this.countCellType(game, 1);

        // Check soft block count constraints
        if (constraints.minSoftBlocks !== undefined && softBlockCount < constraints.minSoftBlocks) {
            return false;
        }
        if (constraints.maxSoftBlocks !== undefined && softBlockCount > constraints.maxSoftBlocks) {
            return false;
        }

        // Check for specific patterns
        if (constraints.hasOpenCenter) {
            const centerX = Math.floor(game.GRID_WIDTH / 2);
            const centerY = Math.floor(game.GRID_HEIGHT / 2);
            if (game.grid[centerY][centerX] !== 0) {
                return false;
            }
        }

        // Check for clusters (contiguous soft blocks)
        if (constraints.minClusterSize !== undefined) {
            const clusters = this.findClusters(game, 1);
            const hasLargeCluster = clusters.some(c => c.size >= constraints.minClusterSize);
            if (!hasLargeCluster) {
                return false;
            }
        }

        // Check for paths between player spawn points
        if (constraints.requiresPlayerPaths) {
            if (!this.checkPlayerPaths(game)) {
                return false;
            }
        }

        // Check specific positions
        if (constraints.emptyPositions) {
            for (const pos of constraints.emptyPositions) {
                if (game.grid[pos.y][pos.x] !== 0) {
                    return false;
                }
            }
        }

        if (constraints.softBlockPositions) {
            for (const pos of constraints.softBlockPositions) {
                if (game.grid[pos.y][pos.x] !== 1) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Analyze world properties
     * @param {Game} game - Game instance
     * @returns {Object} World analysis
     */
    static analyzeWorld(game) {
        const softBlocks = this.countCellType(game, 1);
        const hardBlocks = this.countCellType(game, 2);
        const emptySpaces = this.countCellType(game, 0);
        const clusters = this.findClusters(game, 1);
        const largestCluster = clusters.length > 0 ?
            Math.max(...clusters.map(c => c.size)) : 0;

        return {
            softBlocks,
            hardBlocks,
            emptySpaces,
            clusters: clusters.length,
            largestCluster,
            centerOpen: game.grid[Math.floor(game.GRID_HEIGHT / 2)][Math.floor(game.GRID_WIDTH / 2)] === 0
        };
    }

    /**
     * Count cells of specific type
     * @param {Game} game - Game instance
     * @param {number} cellType - Cell type to count
     * @returns {number} Count
     */
    static countCellType(game, cellType) {
        let count = 0;
        for (let y = 0; y < game.GRID_HEIGHT; y++) {
            for (let x = 0; x < game.GRID_WIDTH; x++) {
                if (game.grid[y][x] === cellType) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Find clusters of connected cells of same type (flood fill)
     * @param {Game} game - Game instance
     * @param {number} cellType - Cell type
     * @returns {Array<{positions: Array, size: number}>} Clusters
     */
    static findClusters(game, cellType) {
        const visited = Array(game.GRID_HEIGHT).fill(null).map(() =>
            Array(game.GRID_WIDTH).fill(false)
        );

        const clusters = [];

        const floodFill = (x, y, cluster) => {
            if (x < 0 || x >= game.GRID_WIDTH || y < 0 || y >= game.GRID_HEIGHT) {
                return;
            }
            if (visited[y][x] || game.grid[y][x] !== cellType) {
                return;
            }

            visited[y][x] = true;
            cluster.push({x, y});

            // Check 4 directions
            floodFill(x + 1, y, cluster);
            floodFill(x - 1, y, cluster);
            floodFill(x, y + 1, cluster);
            floodFill(x, y - 1, cluster);
        };

        for (let y = 0; y < game.GRID_HEIGHT; y++) {
            for (let x = 0; x < game.GRID_WIDTH; x++) {
                if (!visited[y][x] && game.grid[y][x] === cellType) {
                    const cluster = [];
                    floodFill(x, y, cluster);
                    if (cluster.length > 0) {
                        clusters.push({
                            positions: cluster,
                            size: cluster.length
                        });
                    }
                }
            }
        }

        return clusters;
    }

    /**
     * Check if paths exist between all player spawn points
     * @param {Game} game - Game instance
     * @returns {boolean} True if all players can reach each other
     */
    static checkPlayerPaths(game) {
        const players = [
            {x: 0, y: 0},      // P1
            {x: 12, y: 0},     // P2
            {x: 0, y: 10},     // P3
            {x: 12, y: 10}     // P4
        ];

        // Check if each player can reach all others
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                if (!this.hasPath(game, players[i], players[j])) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if path exists between two points (BFS)
     * @param {Game} game - Game instance
     * @param {Object} start - Start position {x, y}
     * @param {Object} end - End position {x, y}
     * @returns {boolean} True if path exists
     */
    static hasPath(game, start, end) {
        const queue = [{x: start.x, y: start.y, dist: 0}];
        const visited = new Set([`${start.x},${start.y}`]);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === end.x && current.y === end.y) {
                return true;
            }

            // Max search depth to prevent infinite loops
            if (current.dist > 50) {
                continue;
            }

            // Check 4 directions
            const directions = [
                {dx: 0, dy: -1},
                {dx: 0, dy: 1},
                {dx: -1, dy: 0},
                {dx: 1, dy: 0}
            ];

            for (const {dx, dy} of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const key = `${nx},${ny}`;

                if (nx < 0 || nx >= game.GRID_WIDTH || ny < 0 || ny >= game.GRID_HEIGHT) {
                    continue;
                }

                if (visited.has(key)) {
                    continue;
                }

                const cell = game.grid[ny][nx];
                // Can walk through empty spaces and soft blocks (soft blocks can be destroyed)
                if (cell === 0 || cell === 1) {
                    visited.add(key);
                    queue.push({x: nx, y: ny, dist: current.dist + 1});
                }
            }
        }

        return false;
    }

    /**
     * Find seed that generates world with all game elements (for comprehensive testing)
     * @param {Object} options - Search options
     * @returns {Object|null} Seed and world info
     */
    static findComprehensiveTestSeed(options = {}) {
        console.log('[SeedFinder] Searching for comprehensive test seed...');

        const results = this.findSeeds({
            minSoftBlocks: 30,
            maxSoftBlocks: 50,
            hasOpenCenter: true,
            requiresPlayerPaths: true,
            minClusterSize: 3
        }, {
            maxAttempts: options.maxAttempts || 5000,
            maxResults: 1,
            verbose: options.verbose || false
        });

        return results.length > 0 ? results[0] : null;
    }

    /**
     * Export seed database to JSON
     * @param {Array} seeds - Array of seed results
     * @returns {string} JSON string
     */
    static exportSeedDatabase(seeds) {
        const db = {};

        seeds.forEach((result, index) => {
            const key = `seed_${result.seed}`;
            db[key] = {
                seed: result.seed,
                description: this.generateDescription(result.world),
                ...result.world
            };
        });

        return JSON.stringify(db, null, 2);
    }

    /**
     * Generate human-readable description of world
     * @param {Object} worldInfo - World analysis
     * @returns {string} Description
     */
    static generateDescription(worldInfo) {
        const parts = [];

        parts.push(`${worldInfo.softBlocks} soft blocks`);

        if (worldInfo.centerOpen) {
            parts.push('open center');
        }

        if (worldInfo.largestCluster >= 5) {
            parts.push(`large cluster (${worldInfo.largestCluster})`);
        }

        return parts.join(', ');
    }
}

// Export for use in tests and CLI
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeedFinder;
}
