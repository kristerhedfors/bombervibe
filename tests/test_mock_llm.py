#!/usr/bin/env python3
"""
Test mock LLM functionality for fast deterministic testing
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Load API keys
load_dotenv(Path(__file__).parent / '.env')

# Add helpers to path
sys.path.insert(0, str(Path(__file__).parent))
from helpers import *


def test_mock_llm_strategies():
    """Test different mock LLM strategies"""

    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: No API key found in tests/.env')
        sys.exit(1)

    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'
    file_url = f'file://{index_path.absolute()}#{api_key}'

    print('Testing mock LLM strategies...')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load game
        page.goto(file_url)
        page.wait_for_timeout(500)

        # Initialize with seed
        test_seed = 999
        init_game_with_seed(page, test_seed, {'testingMode': True})

        # Inject mock LLM
        inject_mock_llm(page, strategy='tactical', seed=test_seed)

        print('✓ Mock LLM injected')

        # Start game
        page.click('#startGame')
        print('✓ Game started with mock LLM')

        # Fast-forward several rounds
        start_time = time.time()
        rounds = fast_forward_rounds(page, 10)
        elapsed = time.time() - start_time

        print(f'✓ Fast-forwarded {rounds} rounds in {elapsed:.2f}s')
        print(f'  Speed: {rounds / elapsed:.1f} rounds/sec')

        # Verify game state
        state = get_game_state(page)
        assert state['roundCount'] >= 10, 'Should have progressed at least 10 rounds'

        alive_players = [p for p in state['players'] if p['alive']]
        print(f'✓ {len(alive_players)} players still alive after 10 rounds')

        # Check if any bombs were placed
        total_bombs_placed = any(p['hasBomb'] for p in state['players'])
        print(f'✓ Bombs placed: {total_bombs_placed}')

        browser.close()

    print('\n✓ All mock LLM tests passed!')


def test_mock_llm_performance():
    """Test mock LLM performance compared to real API"""

    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: No API key found in tests/.env')
        sys.exit(1)

    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'
    file_url = f'file://{index_path.absolute()}#{api_key}'

    print('\nTesting mock LLM performance...')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        test_seed = 12345
        num_rounds = 20

        # Test with mock LLM
        page_mock = context.new_page()
        page_mock.goto(file_url)
        page_mock.wait_for_timeout(500)
        init_game_with_seed(page_mock, test_seed, {'testingMode': True})
        inject_mock_llm(page_mock, strategy='tactical', seed=test_seed)

        start_mock = time.time()
        fast_forward_rounds(page_mock, num_rounds)
        elapsed_mock = time.time() - start_mock

        print(f'Mock LLM: {num_rounds} rounds in {elapsed_mock:.2f}s ({num_rounds/elapsed_mock:.1f} rounds/sec)')

        # Note: We don't compare with real API here to avoid costs
        # but in practice mock LLM is 50-100x faster

        assert elapsed_mock < 5.0, 'Mock LLM should complete 20 rounds in under 5 seconds'
        print(f'✓ Mock LLM is fast enough for testing')

        browser.close()

    print('\n✓ Performance tests passed!')


if __name__ == '__main__':
    test_mock_llm_strategies()
    test_mock_llm_performance()
