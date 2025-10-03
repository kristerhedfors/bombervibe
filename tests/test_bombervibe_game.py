#!/usr/bin/env python3
"""
Test BombervibeGame.js in isolation
Validates the new game implementation matches legacy behavior
"""

import sys
import os
from playwright.sync_api import sync_playwright

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TEST_DIR)

# Create a minimal test HTML file
TEST_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BombervibeGame Test</title>
</head>
<body>
    <div id="test-output"></div>

    <!-- Dependencies -->
    <script src="../js/rng.js"></script>
    <script src="../js/config/blocks.js"></script>
    <script src="../js/games/bombervibe/config.js"></script>
    <script src="../js/games/bombervibe/BombervibePlayer.js"></script>
    <script src="../js/games/bombervibe/BombervibePrompts.js"></script>
    <script src="../js/games/bombervibe/BombervibeGame.js"></script>

    <script>
    // Create global instances for testing
    const prompts = new BombervibePrompts();
    const game = new BombervibeGame(prompts, 12345); // Fixed seed for testing
    game.initialize();
    window.testGame = game;
    </script>
</body>
</html>
"""

def setup_test_html():
    """Create test HTML file"""
    test_html_path = os.path.join(PROJECT_DIR, 'test_bombervibe_game.html')
    with open(test_html_path, 'w') as f:
        f.write(TEST_HTML)
    return test_html_path

def cleanup_test_html(path):
    """Remove test HTML file"""
    if os.path.exists(path):
        os.remove(path)

def test_initialization():
    """Test that BombervibeGame initializes correctly"""
    print("Testing BombervibeGame initialization...")

    test_html_path = setup_test_html()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'file://{test_html_path}')

            # Check game object exists
            game_exists = page.evaluate('typeof testGame !== "undefined"')
            assert game_exists, "Game object should exist"

            # Check grid dimensions
            grid_width = page.evaluate('testGame.GRID_WIDTH')
            grid_height = page.evaluate('testGame.GRID_HEIGHT')
            assert grid_width == 13, f"Grid width should be 13, got {grid_width}"
            assert grid_height == 11, f"Grid height should be 11, got {grid_height}"

            # Check player count
            player_count = page.evaluate('testGame.players.length')
            assert player_count == 4, f"Should have 4 players, got {player_count}"

            # Check seed was set
            seed = page.evaluate('testGame.seed')
            assert seed == 12345, f"Seed should be 12345, got {seed}"

            print("✓ Initialization test passed")
            browser.close()

    finally:
        cleanup_test_html(test_html_path)

def test_player_positions():
    """Test players start in correct positions"""
    print("Testing player positions...")

    test_html_path = setup_test_html()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'file://{test_html_path}')

            positions = page.evaluate('''
                testGame.players.map(p => ({id: p.id, x: p.x, y: p.y, alive: p.alive}))
            ''')

            expected = [
                {'id': 1, 'x': 0, 'y': 0, 'alive': True},
                {'id': 2, 'x': 12, 'y': 0, 'alive': True},
                {'id': 3, 'x': 0, 'y': 10, 'alive': True},
                {'id': 4, 'x': 12, 'y': 10, 'alive': True}
            ]

            for i, exp in enumerate(expected):
                actual = positions[i]
                assert actual['id'] == exp['id'], f"Player {i+1} ID mismatch"
                assert actual['x'] == exp['x'], f"Player {i+1} X mismatch: expected {exp['x']}, got {actual['x']}"
                assert actual['y'] == exp['y'], f"Player {i+1} Y mismatch: expected {exp['y']}, got {actual['y']}"
                assert actual['alive'] == exp['alive'], f"Player {i+1} should be alive"

            print("✓ Player positions test passed")
            browser.close()

    finally:
        cleanup_test_html(test_html_path)

def test_movement():
    """Test player movement"""
    print("Testing player movement...")

    test_html_path = setup_test_html()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'file://{test_html_path}')

            # Test valid move
            result = page.evaluate('testGame.movePlayer(1, "down")')
            assert result == True, "Move should succeed"

            pos = page.evaluate('({x: testGame.players[0].x, y: testGame.players[0].y})')
            assert pos['y'] == 1, f"Y should be 1 after moving down, got {pos['y']}"

            # Test stay
            result_stay = page.evaluate('testGame.movePlayer(1, "stay")')
            assert result_stay == True, "Stay should succeed"

            print("✓ Movement test passed")
            browser.close()

    finally:
        cleanup_test_html(test_html_path)

def test_bomb_placement():
    """Test bomb placement"""
    print("Testing bomb placement...")

    test_html_path = setup_test_html()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'file://{test_html_path}')

            # Place bomb
            result = page.evaluate('testGame.playerPlaceBomb(1)')
            assert result == True, "Bomb placement should succeed"

            bomb_count = page.evaluate('testGame.bombs.length')
            assert bomb_count == 1, f"Should have 1 bomb, got {bomb_count}"

            # Can't place second
            result2 = page.evaluate('testGame.playerPlaceBomb(1)')
            assert result2 == False, "Second bomb placement should fail"

            # Check bomb properties
            bomb = page.evaluate('testGame.bombs[0]')
            assert bomb['playerId'] == 1, "Bomb should belong to player 1"
            assert bomb['roundsUntilExplode'] == 4, "Bomb should explode in 4 rounds"

            print("✓ Bomb placement test passed")
            browser.close()

    finally:
        cleanup_test_html(test_html_path)

def test_game_state():
    """Test getGameState returns correct structure"""
    print("Testing getGameState...")

    test_html_path = setup_test_html()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'file://{test_html_path}')

            state = page.evaluate('testGame.getGameState()')

            # Check structure
            assert 'grid' in state, "State should have grid"
            assert 'players' in state, "State should have players"
            assert 'bombs' in state, "State should have bombs"
            assert 'loot' in state, "State should have loot"
            assert 'turnCount' in state, "State should have turnCount"
            assert 'roundCount' in state, "State should have roundCount"
            assert 'currentPlayerId' in state, "State should have currentPlayerId"

            # Check dimensions
            assert len(state['grid']) == 11, "Grid should have 11 rows"
            assert len(state['grid'][0]) == 13, "Grid should have 13 columns"

            # Check players
            assert len(state['players']) == 4, "Should have 4 players"

            print("✓ getGameState test passed")
            browser.close()

    finally:
        cleanup_test_html(test_html_path)

def test_turn_management():
    """Test turn and round counting"""
    print("Testing turn management...")

    test_html_path = setup_test_html()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'file://{test_html_path}')

            # Initial state
            turn = page.evaluate('testGame.turnCount')
            round_count = page.evaluate('testGame.roundCount')
            assert turn == 0, "Should start at turn 0"
            assert round_count == 0, "Should start at round 0"

            # Advance turn
            page.evaluate('testGame.nextTurn()')
            turn_after = page.evaluate('testGame.turnCount')
            assert turn_after == 1, "Turn should increment"

            # Advance through full round
            page.evaluate('testGame.nextTurn()')
            page.evaluate('testGame.nextTurn()')
            page.evaluate('testGame.nextTurn()')

            round_after = page.evaluate('testGame.roundCount')
            assert round_after == 1, "Round should increment after full cycle"

            print("✓ Turn management test passed")
            browser.close()

    finally:
        cleanup_test_html(test_html_path)

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("BOMBERVIBE GAME CLASS TESTS")
    print("=" * 60)
    print()

    tests = [
        test_initialization,
        test_player_positions,
        test_movement,
        test_bomb_placement,
        test_game_state,
        test_turn_management
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} ERROR: {e}")
            failed += 1
        print()

    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
