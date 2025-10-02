## Quickstart: Testing with Seeded Worlds & Mock LLM

### 1. Setup (One-time)

```bash
# Already done - but if you need to recreate:
cd /Users/user/dev/bombervibe

# Ensure .env exists
echo "GROQ_API_KEY=gsk_your_key_here" > tests/.env

# Generate test fixtures
source .venv/bin/activate
python tests/generate_fixtures.py
```

### 2. Run All Tests

```bash
./run_tests.sh
```

### 3. Run Individual Tests

```bash
source .venv/bin/activate

# Test reproducibility
python tests/test_seeded_world.py

# Test mock LLM
python tests/test_mock_llm.py

# Test game mechanics
python tests/test_game_mechanics.py
```

### 4. Create New Test

Create `tests/test_my_feature.py`:

```python
#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(Path(__file__).parent / '.env')
sys.path.insert(0, str(Path(__file__).parent))
from helpers import *

def test_my_feature():
    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'
    file_url = f'file://{index_path.absolute()}#{api_key}'

    print('Testing my feature...')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load game with seed
        page.goto(file_url)
        page.wait_for_timeout(500)

        # Initialize with seed and options
        init_game_with_seed(page, seed=12345, options={
            'testingMode': True,
            'initialLoot': [{'x': 5, 'y': 5, 'type': 'flash_radius'}]
        })

        # Inject mock LLM for fast testing
        inject_mock_llm(page, strategy='tactical', seed=12345)

        # Fast-forward 10 rounds
        fast_forward_rounds(page, 10)

        # Assert conditions
        state = get_game_state(page)
        assert state['roundCount'] >= 10

        browser.close()

    print('✓ Test passed!')

if __name__ == '__main__':
    test_my_feature()
```

Run it:
```bash
python tests/test_my_feature.py
```

### 5. Find Seeds for Specific Scenarios

Open browser console on `index.html` and run:

```javascript
// Find seed with many soft blocks
const seeds = SeedFinder.findSeeds({
    minSoftBlocks: 45,
    maxSoftBlocks: 55,
    hasOpenCenter: true
}, {
    maxAttempts: 1000,
    maxResults: 5
});

console.log('Found seeds:', seeds);

// Use found seed in tests
const game = new Game(seeds[0].seed);
game.initialize();
```

### 6. Debug Specific Scenario

```javascript
// Reproduce exact game state
const game = new Game(123456, {
    testingMode: true,
    initialBombs: [
        {x: 5, y: 5, playerId: 1, stage: 2}
    ],
    initialLoot: [
        {x: 3, y: 3, type: 'flash_radius'}
    ]
});

game.initialize();
console.log('Grid:', game.grid);
console.log('Seed:', game.getSeed());
```

### 7. Export Seed Database

```javascript
// Find multiple seeds
const allSeeds = [];
for (let scenario of ['many_blocks', 'few_blocks', 'clusters']) {
    const found = SeedFinder.findSeeds({...constraints}, {maxResults: 1});
    allSeeds.push(...found);
}

// Export to JSON
const json = SeedFinder.exportSeedDatabase(allSeeds);
console.log(json);
```

### 8. Performance Comparison

```python
import time

# With Mock LLM (fast!)
start = time.time()
inject_mock_llm(page, 'tactical', seed=123)
fast_forward_rounds(page, 50)
elapsed_mock = time.time() - start
print(f'Mock: 50 rounds in {elapsed_mock:.2f}s')

# With Real API (slow, costs money)
start = time.time()
# Don't inject mock - uses real API
fast_forward_rounds(page, 50)
elapsed_real = time.time() - start
print(f'Real API: 50 rounds in {elapsed_real:.2f}s')
print(f'Speedup: {elapsed_real / elapsed_mock:.1f}x')
```

### 9. CI/CD Integration

`.github/workflows/test.yml`:
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - name: Install
        run: |
          pip install playwright python-dotenv
          playwright install chromium
      - name: Test
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: ./run_tests.sh
```

### 10. Common Patterns

**Test bomb chain reactions:**
```python
init_game_with_seed(page, 123, {
    'testingMode': True,
    'initialBombs': [
        {'x': 5, 'y': 5, 'playerId': 1, 'stage': 1},
        {'x': 6, 'y': 5, 'playerId': 2, 'stage': 2}
    ]
})
fast_forward_rounds(page, 3)
# First bomb triggers second
```

**Test player trapped:**
```python
# Find seed where player gets trapped
seeds = SeedFinder.findSeeds({
    softBlockPositions: [
        {'x': 1, 'y': 1},  # Surround P1
        {'x': 0, 'y': 1},
        {'x': 1, 'y': 0}
    ]
}, {maxAttempts: 5000})
```

**Test exact scenario:**
```python
# Load fixture
fixtures = load_test_fixtures()
seed = fixtures['comprehensive']['seed']

# Initialize
init_game_with_seed(page, seed)

# Run to specific round
fast_forward_rounds(page, 20)

# Place bomb manually
page.evaluate('game.playerPlaceBomb(1)')

# Check result
fast_forward_rounds(page, 5)
assert_player_dead(page, 1)
```

---

**Ready to test!** See [TESTING.md](TESTING.md) for complete documentation.
