#!/usr/bin/env python3
"""
Migration Baseline Test
Tests core game mechanics without LLM calls to establish baseline behavior
"""

import sys
import os
from playwright.sync_api import sync_playwright, expect
import time

# Get test directory
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TEST_DIR)
INDEX_PATH = os.path.join(PROJECT_DIR, 'index.html')

def test_game_initialization():
    """Test that game initializes correctly"""
    print("Testing game initialization...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load with mock API key to bypass modal
        page.goto(f'file://{INDEX_PATH}#test_key_12345')

        # Wait for game to initialize
        page.wait_for_selector('#grid', state='visible', timeout=5000)

        # Check game object exists
        game_exists = page.evaluate('typeof game !== "undefined"')
        assert game_exists, "Game object should exist"

        # Check grid dimensions
        grid_width = page.evaluate('game.GRID_WIDTH')
        grid_height = page.evaluate('game.GRID_HEIGHT')
        assert grid_width == 13, f"Grid width should be 13, got {grid_width}"
        assert grid_height == 11, f"Grid height should be 11, got {grid_height}"

        # Check player count
        player_count = page.evaluate('game.players.length')
        assert player_count == 4, f"Should have 4 players, got {player_count}"

        # Check players start in corners
        player_positions = page.evaluate('''
            game.players.map(p => ({id: p.id, x: p.x, y: p.y, alive: p.alive}))
        ''')

        expected_positions = [
            {'id': 1, 'x': 0, 'y': 0},
            {'id': 2, 'x': 12, 'y': 0},
            {'id': 3, 'x': 0, 'y': 10},
            {'id': 4, 'x': 12, 'y': 10}
        ]

        for i, expected in enumerate(expected_positions):
            actual = player_positions[i]
            assert actual['id'] == expected['id'], f"Player {i+1} ID mismatch"
            assert actual['x'] == expected['x'], f"Player {i+1} X position mismatch"
            assert actual['y'] == expected['y'], f"Player {i+1} Y position mismatch"
            assert actual['alive'] == True, f"Player {i+1} should be alive"

        print("✓ Game initialization test passed")
        browser.close()

def test_player_movement():
    """Test player movement mechanics"""
    print("Testing player movement...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'file://{INDEX_PATH}#test_key_12345')
        page.wait_for_selector('#grid', state='visible', timeout=5000)

        # Get initial position
        initial_pos = page.evaluate('({x: game.players[0].x, y: game.players[0].y})')

        # Test valid move (down from 0,0 to 0,1)
        result_down = page.evaluate('game.movePlayer(1, "down")')
        assert result_down == True, "Move down should succeed"

        new_pos = page.evaluate('({x: game.players[0].x, y: game.players[0].y})')
        assert new_pos['y'] == initial_pos['y'] + 1, "Y should increment"

        # Test valid move (right) - but first check if path is clear
        can_move_right = page.evaluate('game.grid[1][2] === 0') # Check cell to the right
        if can_move_right:
            result_right = page.evaluate('game.movePlayer(1, "right")')
            assert result_right == True, "Move right should succeed if path clear"
            new_pos2 = page.evaluate('({x: game.players[0].x, y: game.players[0].y})')
            assert new_pos2['x'] == new_pos['x'] + 1, "X should increment"
        else:
            # Try another direction (up, back to 0,0)
            result_up = page.evaluate('game.movePlayer(1, "up")')
            assert result_up == True, "Move up should succeed"
            new_pos2 = page.evaluate('({x: game.players[0].x, y: game.players[0].y})')
            assert new_pos2['y'] == new_pos['y'] - 1, "Y should decrement"

        # Test stay
        result_stay = page.evaluate('game.movePlayer(1, "stay")')
        assert result_stay == True, "Stay should succeed"

        new_pos3 = page.evaluate('({x: game.players[0].x, y: game.players[0].y})')
        assert new_pos3['x'] == new_pos2['x'], "X should not change"
        assert new_pos3['y'] == new_pos2['y'], "Y should not change"

        print("✓ Player movement test passed")
        browser.close()

def test_bomb_placement():
    """Test bomb placement and explosion mechanics"""
    print("Testing bomb placement...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'file://{INDEX_PATH}#test_key_12345')
        page.wait_for_selector('#grid', state='visible', timeout=5000)

        # Player 1 starts at (0, 0)
        initial_bombs = page.evaluate('game.bombs.length')
        assert initial_bombs == 0, "Should start with no bombs"

        # Place bomb
        result = page.evaluate('game.playerPlaceBomb(1)')
        assert result == True, "Bomb placement should succeed"

        # Check bomb count
        bomb_count = page.evaluate('game.bombs.length')
        assert bomb_count == 1, "Should have 1 bomb after placement"

        # Check player can't place another
        result2 = page.evaluate('game.playerPlaceBomb(1)')
        assert result2 == False, "Should not be able to place second bomb"

        # Check bomb properties
        bomb = page.evaluate('game.bombs[0]')
        assert bomb['playerId'] == 1, "Bomb should belong to player 1"
        assert bomb['roundsUntilExplode'] == 4, "Bomb should explode in 4 rounds"
        assert bomb['x'] == 0 and bomb['y'] == 0, "Bomb should be at player position"

        print("✓ Bomb placement test passed")
        browser.close()

def test_grid_state():
    """Test grid initialization and block placement"""
    print("Testing grid state...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'file://{INDEX_PATH}#test_key_12345')
        page.wait_for_selector('#grid', state='visible', timeout=5000)

        # Check hard block pattern (every odd x,y should be hard block = 2)
        hard_block_check = page.evaluate('''
            game.grid[1][1] === 2 && // (1,1) should be hard
            game.grid[1][3] === 2 && // (3,1) should be hard
            game.grid[3][1] === 2    // (1,3) should be hard
        ''')
        assert hard_block_check, "Hard blocks should follow classic Bomberman pattern"

        # Check corner safe zones are empty
        safe_zones_check = page.evaluate('''
            game.grid[0][0] === 0 && // Top-left corner
            game.grid[0][1] === 0 && // Near top-left
            game.grid[1][0] === 0    // Near top-left
        ''')
        assert safe_zones_check, "Corner safe zones should be empty"

        # Count total cells
        cell_count = page.evaluate('game.GRID_WIDTH * game.GRID_HEIGHT')
        assert cell_count == 143, "Total cells should be 13 * 11 = 143"

        print("✓ Grid state test passed")
        browser.close()

def test_turn_management():
    """Test turn and round counting"""
    print("Testing turn management...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'file://{INDEX_PATH}#test_key_12345')
        page.wait_for_selector('#grid', state='visible', timeout=5000)

        # Check initial state
        initial_turn = page.evaluate('game.turnCount')
        initial_round = page.evaluate('game.roundCount')
        initial_player = page.evaluate('game.currentPlayerIndex')

        assert initial_turn == 0, "Should start at turn 0"
        assert initial_round == 0, "Should start at round 0"
        assert initial_player == 0, "Should start with player 0"

        # Advance turn
        page.evaluate('game.nextTurn()')

        turn_after = page.evaluate('game.turnCount')
        player_after = page.evaluate('game.currentPlayerIndex')

        assert turn_after == 1, "Turn should increment"
        assert player_after == 1, "Should advance to next player"

        # Advance through full round (4 players)
        page.evaluate('game.nextTurn()') # Player 2
        page.evaluate('game.nextTurn()') # Player 3
        page.evaluate('game.nextTurn()') # Player 4 -> back to 0

        round_after = page.evaluate('game.roundCount')
        player_final = page.evaluate('game.currentPlayerIndex')

        assert round_after == 1, "Round should increment after all players move"
        assert player_final == 0, "Should cycle back to player 0"

        print("✓ Turn management test passed")
        browser.close()

def test_game_state_serialization():
    """Test getGameState returns proper structure"""
    print("Testing game state serialization...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'file://{INDEX_PATH}#test_key_12345')
        page.wait_for_selector('#grid', state='visible', timeout=5000)

        # Get game state
        state = page.evaluate('game.getGameState()')

        # Check structure
        assert 'grid' in state, "State should have grid"
        assert 'players' in state, "State should have players"
        assert 'bombs' in state, "State should have bombs"
        assert 'turnCount' in state, "State should have turnCount"
        assert 'roundCount' in state, "State should have roundCount"
        assert 'currentPlayerId' in state, "State should have currentPlayerId"

        # Check grid is 2D array
        assert len(state['grid']) == 11, "Grid should have 11 rows"
        assert len(state['grid'][0]) == 13, "Grid rows should have 13 columns"

        # Check players array
        assert len(state['players']) == 4, "Should have 4 players"
        assert all('id' in p and 'x' in p and 'y' in p for p in state['players']), "Players should have id, x, y"

        print("✓ Game state serialization test passed")
        browser.close()

def run_all_tests():
    """Run all baseline tests"""
    print("=" * 60)
    print("MIGRATION BASELINE TESTS - LEGACY CODE")
    print("=" * 60)
    print()

    tests = [
        test_game_initialization,
        test_player_movement,
        test_bomb_placement,
        test_grid_state,
        test_turn_management,
        test_game_state_serialization
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
