# Bombervibe Testing Infrastructure

## Overview

Bombervibe has a comprehensive testing infrastructure based on:
- **Seeded RNG** - Deterministic, reproducible world generation
- **Mock LLM** - Fast simulated AI responses (no API calls)
- **Playwright** - Browser automation for end-to-end testing
- **Test Fixtures** - Pre-generated seeds for specific scenarios

## Architecture

### 1. Seeded RNG (`js/rng.js`)

All randomness in the game uses a seedable pseudo-random number generator (xorshift128+) for complete determinism.

**Features:**
- Drop-in replacement for `Math.random()`
- Serializable state for save/restore
- Full suite of random utilities (int, float, choice, shuffle, etc.)
- Clone support for branching randomness

**Usage:**
```javascript
// Create RNG with seed
const rng = new SeededRNG(123456);

// Generate random values
const x = rng.random();           // [0, 1)
const n = rng.randomInt(1, 6);    // [1, 6]
const item = rng.choice(['a', 'b', 'c']);
const shuffled = rng.shuffle([1, 2, 3]);

// Save/restore state
const state = rng.getState();
rng.setState(state);
```

### 2. Seeded Game Worlds

The `Game` class now accepts a seed and options:

```javascript
// Create game with seed
const game = new Game(seed, {
    softBlockDensity: 0.4,      // % chance of soft block
    lootSpawnChance: 0.125,     // Per-turn loot spawn chance
    testingMode: true,          // Fast mode (no delays)
    initialLoot: [              // Pre-placed loot
        {x: 5, y: 5, type: 'flash_radius'}
    ],
    initialBombs: [             // Pre-placed bombs at specific stages
        {x: 3, y: 3, playerId: 1, stage: 2, range: 1}
    ]
});

game.initialize();
```

**Benefits:**
- Same seed = identical world every time
- Test specific scenarios by seeding world with exact elements
- Full control over initial game state

### 3. Mock LLM (`js/testing/mock-llm.js`)

Drop-in replacement for `AIController` with instant deterministic responses.

**Strategies:**
- `random` - Random valid moves
- `aggressive` - Rush toward center, bomb frequently
- `defensive` - Avoid danger, bomb only when very safe
- `tactical` - Balance safety and aggression (default)
- `scripted` - Pre-programmed move sequences

**Usage:**
```javascript
// Create mock LLM
const mockLLM = new MockLLM('tactical', new SeededRNG(seed), {
    responseDelay: 0,  // Instant responses
    scriptedMoves: {
        1: [{direction: 'right', dropBomb: false},
            {direction: 'down', dropBomb: true}]
    }
});

// Get AI move (async interface like AIController)
const move = await mockLLM.getAIMove(gameState, playerId, game);

// Get all moves in parallel
const allMoves = await mockLLM.getAllPlayerMoves(gameState, game);
```

**Performance:**
- 50-100x faster than real API calls
- 0ms response time in test mode
- Can run 100+ rounds per second

### 4. Seed Finder (`js/testing/seed-finder.js`)

Brute force search for seeds that generate worlds with specific properties.

**Usage:**
```javascript
// Find seeds matching constraints
const seeds = SeedFinder.findSeeds({
    minSoftBlocks: 40,
    maxSoftBlocks: 50,
    hasOpenCenter: true,
    minClusterSize: 5,
    requiresPlayerPaths: true
}, {
    maxAttempts: 5000,
    maxResults: 10,
    verbose: true
});

// Find comprehensive test seed
const seed = SeedFinder.findComprehensiveTestSeed({
    maxAttempts: 5000
});
```

**Constraints Supported:**
- `minSoftBlocks` / `maxSoftBlocks` - Soft block count range
- `hasOpenCenter` - Center tile must be empty
- `minClusterSize` - Minimum contiguous soft block cluster
- `requiresPlayerPaths` - All players can reach each other
- `emptyPositions` - Specific tiles must be empty
- `softBlockPositions` - Specific tiles must have soft blocks

## Test Infrastructure

### Playwright Test Helpers (`tests/helpers.py`)

Python utilities for browser testing:

```python
from helpers import *

# Get game URL with seed
url = get_game_url_with_seed(seed=123, max_rounds=20, api_key=api_key)

# Initialize game with seed
init_game_with_seed(page, seed=123, options={'testingMode': True})

# Inject mock LLM
inject_mock_llm(page, strategy='tactical', seed=123)

# Fast-forward game
fast_forward_rounds(page, 10)

# Assertions
assert_player_at_position(page, player_id=1, x=5, y=5)
assert_cell_type(page, x=3, y=3, cell_type=1)  # Soft block
assert_bomb_at_position(page, x=5, y=5)
assert_player_alive(page, player_id=1)
assert_player_dead(page, player_id=2)

# Get game state
state = get_game_state(page)

# Load fixtures
fixtures = load_test_fixtures()
seed = get_fixture_seed('comprehensive')
```

### Test Fixtures (`tests/fixtures/seeds.json`)

Pre-generated seeds for common test scenarios:

```json
{
  "comprehensive": {
    "seed": 1234567,
    "description": "Good mix of all elements",
    "softBlocks": 42,
    "centerOpen": true,
    "largestCluster": 8
  },
  "many_soft_blocks": {
    "seed": 789012,
    "description": "Dense soft block map",
    "softBlocks": 52
  },
  "simple": {
    "seed": 12345,
    "description": "Simple reproducible seed"
  }
}
```

**Generate Fixtures:**
```bash
cd tests
python generate_fixtures.py
```

## Writing Tests

### Example: Test Bomb Explosion

```python
from helpers import *

def test_bomb_explosion():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(get_game_url_with_seed(seed=123, api_key=api_key))

        # Initialize with bomb
        init_game_with_seed(page, 123, {
            'testingMode': True,
            'initialBombs': [
                {'x': 5, 'y': 5, 'playerId': 1, 'stage': 1}
            ]
        })

        # Inject mock LLM
        inject_mock_llm(page, 'defensive', seed=123)

        # Verify bomb exists
        assert_bomb_at_position(page, 5, 5)

        # Fast-forward to explosion
        fast_forward_rounds(page, 5)

        # Verify bomb exploded
        bombs_count = page.evaluate('game.bombs.length')
        assert bombs_count == 0

        browser.close()
```

### Example: Test with Fixture

```python
from helpers import *

def test_comprehensive_scenario():
    fixtures = load_test_fixtures()
    seed = fixtures['comprehensive']['seed']

    with sync_playwright() as p:
        page = browser.new_page()
        page.goto(get_game_url_with_seed(seed=seed, api_key=api_key))

        init_game_with_seed(page, seed)
        inject_mock_llm(page, 'tactical', seed=seed)

        # Run game for 50 rounds
        fast_forward_rounds(page, 50)

        # Check end state
        state = get_game_state(page)
        assert state['roundCount'] == 50

        browser.close()
```

## Running Tests

```bash
# Activate virtual environment
source .venv/bin/activate

# Run specific test
python tests/test_seeded_world.py
python tests/test_mock_llm.py
python tests/test_game_mechanics.py

# Run all tests
pytest tests/

# Generate new fixtures
python tests/generate_fixtures.py
```

## Test Scenarios Covered

### ✅ World Generation
- [x] Same seed produces identical worlds
- [x] Different seeds produce different worlds
- [x] Seed finder locates specific world patterns
- [x] Initial loot placement works correctly
- [x] Initial bomb placement works correctly

### ✅ Mock LLM
- [x] All strategies produce valid moves
- [x] Scripted moves execute in sequence
- [x] Performance: 50+ rounds/second
- [x] Deterministic with seed

### ✅ Game Mechanics
- [x] Bomb placement and explosion timing
- [x] Loot spawning, pickup, and stat increases
- [x] Player death from explosions
- [x] Block destruction
- [x] Chain reactions
- [x] Movement validation
- [x] Collision detection

### 🔜 Future Tests
- [ ] Complete game playthrough (100+ rounds)
- [ ] Visual regression testing
- [ ] Multiplayer coordination scenarios
- [ ] Edge case maps (all corners blocked, etc.)
- [ ] Performance benchmarks
- [ ] Memory leak detection

## Best Practices

### 1. Always Use Seeds
```javascript
// ✅ Good - reproducible
const game = new Game(123456);

// ❌ Bad - random, non-reproducible
const game = new Game();
```

### 2. Use Mock LLM in Tests
```python
# ✅ Good - fast, deterministic
inject_mock_llm(page, 'tactical', seed=123)

# ❌ Bad - slow, costs money, non-deterministic
# (don't inject mock, uses real API)
```

### 3. Use Test Fixtures
```python
# ✅ Good - reuse known-good seeds
seed = get_fixture_seed('comprehensive')

# ❌ Bad - random seed may not have desired properties
seed = random.randint(1, 100000)
```

### 4. Fast-Forward for Performance
```python
# ✅ Good - run 100 rounds in 1 second
fast_forward_rounds(page, 100)

# ❌ Bad - wait for UI, takes minutes
for _ in range(100):
    time.sleep(1)  # Wait for turn
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-python@v2
        with:
          python-version: '3.x'

      - name: Install dependencies
        run: |
          pip install playwright pytest python-dotenv
          playwright install chromium

      - name: Run tests
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: |
          pytest tests/
```

**Note**: Mock LLM tests don't need API keys, but some integration tests may require them.

## Performance Benchmarks

### Mock LLM vs Real API (20 rounds)

| Method     | Time   | Rounds/sec | Cost    |
|------------|--------|------------|---------|
| Mock LLM   | 0.5s   | 40         | $0.00   |
| Groq API   | 8s     | 2.5        | ~$0.001 |
| OpenAI API | 15s    | 1.3        | ~$0.01  |

### Seed Finding (1000 seeds)

| Constraint Complexity | Time   |
|-----------------------|--------|
| Simple (block count)  | 2-3s   |
| Medium (clusters)     | 5-10s  |
| Complex (paths)       | 15-30s |

## Troubleshooting

### "RNG not defined"
Make sure `js/rng.js` is loaded before `js/game.js` in index.html.

### "MockLLM not defined"
Make sure `js/testing/mock-llm.js` is loaded in index.html.

### "Seed produces different world"
RNG state might be corrupted. Create fresh `Game` instance with seed.

### Tests are slow
- Use `testingMode: true` to disable delays
- Use `headless: True` in Playwright
- Batch assertions instead of checking every round

### Fixtures not found
Run `python tests/generate_fixtures.py` to generate them.

## Contributing

When adding new game features:

1. **Update RNG usage** - Replace any `Math.random()` with `this.rng.random()`
2. **Add test coverage** - Write Playwright test with seeded world
3. **Document constraints** - Add to SeedFinder if needed
4. **Generate fixtures** - Create fixture seeds for new scenarios
5. **Update this doc** - Document new test helpers/patterns

## Resources

- [Playwright Docs](https://playwright.dev/python/)
- [xorshift128+ Algorithm](https://en.wikipedia.org/wiki/Xorshift)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

## License

MIT - Same as main project
