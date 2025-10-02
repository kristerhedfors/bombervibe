// RNG.js - Seedable Pseudo-Random Number Generator
// Uses xorshift128+ algorithm for deterministic, reproducible randomness

class SeededRNG {
    /**
     * Create a new seeded RNG
     * @param {number} seed - Initial seed value (default: timestamp)
     */
    constructor(seed = Date.now()) {
        this.setSeed(seed);
    }

    /**
     * Set or reset the seed
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this.originalSeed = seed;

        // Initialize xorshift128+ state using splitmix64 to avoid bad seeds
        let state = seed;

        // Splitmix64 to generate two 32-bit values
        state = (state ^ (state >>> 30)) * 0xBF58476D1CE4E5B9;
        state = (state ^ (state >>> 27)) * 0x94D049BB133111EB;
        state = state ^ (state >>> 31);

        this.state0 = state >>> 0;

        state = (state * 0x9E3779B97F4A7C15) >>> 0;
        state = (state ^ (state >>> 30)) * 0xBF58476D1CE4E5B9;
        state = (state ^ (state >>> 27)) * 0x94D049BB133111EB;
        state = state ^ (state >>> 31);

        this.state1 = state >>> 0;

        // Ensure we don't start with zero state
        if (this.state0 === 0 && this.state1 === 0) {
            this.state0 = 1;
            this.state1 = 1;
        }
    }

    /**
     * Get current seed (for serialization)
     * @returns {number} Original seed
     */
    getSeed() {
        return this.originalSeed;
    }

    /**
     * Get current internal state (for save/restore)
     * @returns {{seed: number, state0: number, state1: number}}
     */
    getState() {
        return {
            seed: this.originalSeed,
            state0: this.state0,
            state1: this.state1
        };
    }

    /**
     * Restore from saved state
     * @param {{seed: number, state0: number, state1: number}} state
     */
    setState(state) {
        this.originalSeed = state.seed;
        this.state0 = state.state0;
        this.state1 = state.state1;
    }

    /**
     * Generate next random 32-bit unsigned integer using xorshift128+
     * @returns {number} Random integer [0, 2^32-1]
     */
    nextInt32() {
        let s1 = this.state0;
        const s0 = this.state1;

        this.state0 = s0;

        s1 ^= s1 << 23;
        s1 ^= s1 >>> 17;
        s1 ^= s0;
        s1 ^= s0 >>> 26;

        this.state1 = s1 >>> 0;

        return (this.state0 + this.state1) >>> 0;
    }

    /**
     * Generate random float [0, 1) - drop-in replacement for Math.random()
     * @returns {number} Random float
     */
    random() {
        return this.nextInt32() / 0x100000000; // 2^32
    }

    /**
     * Generate random integer [min, max] (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        if (max < min) {
            throw new Error('max must be >= min');
        }
        const range = max - min + 1;
        return Math.floor(this.random() * range) + min;
    }

    /**
     * Generate random float [min, max)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float
     */
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    /**
     * Random boolean with optional probability
     * @param {number} probability - Probability of true [0, 1] (default: 0.5)
     * @returns {boolean}
     */
    randomBool(probability = 0.5) {
        return this.random() < probability;
    }

    /**
     * Pick random element from array
     * @param {Array} array - Input array
     * @returns {*} Random element or undefined if empty
     */
    choice(array) {
        if (array.length === 0) return undefined;
        return array[this.randomInt(0, array.length - 1)];
    }

    /**
     * Shuffle array in place (Fisher-Yates)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array (same reference)
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Sample N elements from array without replacement
     * @param {Array} array - Input array
     * @param {number} count - Number of elements to sample
     * @returns {Array} Sampled elements
     */
    sample(array, count) {
        if (count > array.length) {
            throw new Error('Cannot sample more elements than array length');
        }
        const copy = [...array];
        this.shuffle(copy);
        return copy.slice(0, count);
    }

    /**
     * Weighted random choice
     * @param {Array} items - Array of items
     * @param {Array} weights - Array of weights (same length as items)
     * @returns {*} Randomly selected item
     */
    weightedChoice(items, weights) {
        if (items.length !== weights.length) {
            throw new Error('Items and weights must have same length');
        }

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = this.randomFloat(0, totalWeight);

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1]; // Fallback
    }

    /**
     * Generate random position on grid
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @returns {{x: number, y: number}}
     */
    randomPosition(width, height) {
        return {
            x: this.randomInt(0, width - 1),
            y: this.randomInt(0, height - 1)
        };
    }

    /**
     * Clone this RNG with same state
     * @returns {SeededRNG} Cloned RNG
     */
    clone() {
        const cloned = new SeededRNG(this.originalSeed);
        cloned.state0 = this.state0;
        cloned.state1 = this.state1;
        return cloned;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeededRNG;
}
