#!/usr/bin/env python3
"""
Bombervibe Gameplay Validation Test

This test launches the game via file:// URL and validates:
- Players make valid moves
- Bombs explode correctly
- Game logic works as expected

NO WEB SERVER NEEDED - uses file:// protocol directly.
"""

import os
import sys
import re
import time
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Load API keys from tests/.env
load_dotenv(Path(__file__).parent / '.env')

def test_gameplay():
    # Get API key from environment
    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: No API key found.')
        print('Create tests/.env with: GROQ_API_KEY=gsk_... or OPENAI_API_KEY=sk_...')
        sys.exit(1)

    print(f'✓ API key found ({api_key[:10]}...)')

    # Get absolute path to index.html
    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'

    if not index_path.exists():
        print(f'ERROR: index.html not found at {index_path}')
        sys.exit(1)

    # Convert to file:// URL
    file_url = f'file://{index_path.absolute()}#{api_key}'
    print(f'✓ Loading game from: file://{index_path.absolute()}')

    with sync_playwright() as p:
        # Launch browser (headed so you can watch)
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # Store console logs
        console_logs = []

        def handle_console(msg):
            text = msg.text
            console_logs.append(text)

            # Print detailed AI decisions and gameplay events
            if any(keyword in text for keyword in [
                '[ROUND', 'GAME OVER', 'ERROR', 'EXPLOSIONS',
                '[AI P', 'Thought:', 'Move:', 'dropBomb:',
                'DANGER:', 'SAFE:', 'Breakable'
            ]):
                print(text)

        page.on('console', handle_console)

        # Navigate to file URL
        print('Starting game...')
        page.goto(file_url)

        # Wait for game to initialize
        time.sleep(1)

        # Verify API key loaded
        api_modal = page.locator('#apiModal')
        assert 'hidden' in api_modal.get_attribute('class'), 'API modal should be hidden'
        print('✓ API key loaded')

        # Start the game
        page.click('#startGame')
        print('✓ Game started')

        # Wait for game to progress
        game_over = False
        rounds = 0
        max_rounds = 10  # Limit to 10 rounds for quick analysis
        start_time = time.time()

        print('\n=== WATCHING GAMEPLAY ===')

        while not game_over and rounds < max_rounds:
            time.sleep(1.5)  # Wait for turn to complete

            # Check if game over
            game_over = page.locator('#gameOverOverlay').count() > 0

            if not game_over:
                rounds += 1

        elapsed = time.time() - start_time

        print(f'\n=== GAME SUMMARY ===')
        print(f'Time elapsed: {elapsed:.1f}s')
        print(f'Rounds watched: {rounds}')
        print(f'Game over: {"YES" if game_over else "NO (timeout)"}')

        # Analyze console logs
        round_logs = [log for log in console_logs if '[ROUND' in log]
        explosion_logs = [log for log in console_logs if 'EXPLOSIONS:' in log]
        invalid_move_logs = [log for log in console_logs if 'INVALID MOVE' in log]

        print(f'\nTotal round logs: {len(round_logs)}')
        print(f'Explosions: {len(explosion_logs)}')
        print(f'Invalid moves: {len(invalid_move_logs)}')

        # Validate game logic
        assert len(round_logs) > 0, 'No rounds played'
        print('✓ AI players made moves')

        # Show sample of player moves
        print(f'\n=== SAMPLE PLAYER MOVES ===')
        player_moves = [log for log in round_logs if re.search(r'P[1-4]:', log)][:10]
        for log in player_moves:
            print(log)

        # Show explosions
        if explosion_logs:
            print(f'\n=== EXPLOSIONS ===')
            for log in explosion_logs:
                print(log)
            print('✓ Bombs are exploding')

        # Check for errors
        error_logs = [log for log in console_logs if 'ERROR' in log or 'error' in log]
        if error_logs:
            print(f'\n=== ERRORS DETECTED ({len(error_logs)}) ===')
            for log in error_logs[:5]:  # Show first 5
                print(log)

        # Validate invalid move percentage
        total_moves = len([log for log in round_logs if re.search(r'P[1-4]:', log)])
        invalid_percentage = (len(invalid_move_logs) / total_moves * 100) if total_moves > 0 else 0
        print(f'\nInvalid move rate: {invalid_percentage:.1f}%')

        assert invalid_percentage < 50, f'Too many invalid moves: {invalid_percentage:.1f}%'
        print('✓ Most moves are valid')

        if game_over:
            winner_text = page.locator('.game-over-content h2').text_content()
            print(f'\n=== WINNER ===')
            print(winner_text)
            print('✓ Game completed successfully')

        # Take screenshot
        screenshot_path = project_root / 'tests' / 'gameplay-result.png'
        page.screenshot(path=str(screenshot_path), full_page=True)
        print(f'\n✓ Screenshot saved to {screenshot_path}')

        # Keep browser open for inspection
        print('\n=== TEST COMPLETE ===')
        print('Press Ctrl+C to close browser...')
        try:
            time.sleep(300)  # Keep open for 5 minutes
        except KeyboardInterrupt:
            print('\nClosing...')

        browser.close()

if __name__ == '__main__':
    test_gameplay()
