#!/usr/bin/env python3
"""
Test seeded world generation for reproducibility
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Load API keys
load_dotenv(Path(__file__).parent / '.env')

# Add helpers to path
sys.path.insert(0, str(Path(__file__).parent))
from helpers import *


def test_seeded_world_reproducibility():
    """Test that same seed produces identical worlds"""

    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: No API key found in tests/.env')
        sys.exit(1)

    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'
    file_url = f'file://{index_path.absolute()}#{api_key}'

    print('Testing seeded world generation...')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Test seed
        test_seed = 123456

        # Create first world
        page1 = context.new_page()
        page1.goto(file_url)
        page1.wait_for_timeout(500)
        init_game_with_seed(page1, test_seed)

        state1 = get_game_state(page1)
        grid1 = state1['grid']

        # Create second world with same seed
        page2 = context.new_page()
        page2.goto(file_url)
        page2.wait_for_timeout(500)
        init_game_with_seed(page2, test_seed)

        state2 = get_game_state(page2)
        grid2 = state2['grid']

        # Verify grids are identical
        assert grid1 == grid2, 'Grids with same seed should be identical'

        print(f'✓ Seed {test_seed} produces identical worlds')

        # Verify different seed produces different world
        page3 = context.new_page()
        page3.goto(file_url)
        page3.wait_for_timeout(500)
        init_game_with_seed(page3, test_seed + 1)

        state3 = get_game_state(page3)
        grid3 = state3['grid']

        assert grid1 != grid3, 'Different seeds should produce different worlds'

        print(f'✓ Seed {test_seed + 1} produces different world')

        browser.close()

    print('\n✓ All seeded world tests passed!')


if __name__ == '__main__':
    test_seeded_world_reproducibility()
