#!/usr/bin/env python3
"""
Debug AI Decision Making

Watches AI behavior to see why they're not bombing breakable blocks.
Extracts console logs showing:
- When players are adjacent to breakable blocks
- Whether they drop bombs or just move
- Their thought process
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
        sys.exit(1)

    print(f'✓ API key found ({api_key[:10]}...)')

    # Get absolute path to index.html
    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'

    # Set max rounds for testing
    max_rounds = 15

    # Convert to file:// URL with maxRounds parameter
    file_url = f'file://{index_path.absolute()}#{api_key}&maxRounds={max_rounds}'
    print(f'✓ Loading game (will auto-stop after {max_rounds} rounds)')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # Store console logs with structured parsing
        all_logs = []

        def handle_console(msg):
            text = msg.text
            all_logs.append(text)

            # Print important info
            if any(keyword in text for keyword in ['[ROUND', 'GAME OVER', 'ERROR', 'Breakable', 'dropBomb', 'TEST MODE']):
                print(text)

        page.on('console', handle_console)

        print('\n=== STARTING GAME ===')
        page.goto(file_url)
        time.sleep(1)

        # Set up listener for testComplete event
        page.evaluate("""
            window.testCompleteData = null;
            window.addEventListener('testComplete', (e) => {
                window.testCompleteData = e.detail;
            });
        """)

        # Start game
        page.click('#startGame')
        print('✓ Game started\n')
        print(f'=== WATCHING AI DECISIONS (max {max_rounds} rounds) ===\n')

        # Wait for test to complete with polling (more reliable than wait_for_function)
        timeout_seconds = max_rounds * 2 + 10
        start = time.time()
        test_complete = False

        while time.time() - start < timeout_seconds:
            time.sleep(0.5)  # Poll every 500ms

            # Check if test completed
            completion = page.evaluate("window.testCompleteData")
            if completion is not None:
                print(f'\n✓ Test completed at round {completion["round"]}')
                test_complete = True
                break

            # Also check for game over
            if page.locator('#gameOverOverlay').count() > 0:
                print('\n✓ Game ended naturally (game over)')
                test_complete = True
                break

        if not test_complete:
            print(f'\n⚠ Test timed out after {timeout_seconds} seconds')

        # Analyze patterns
        print('\n=== ANALYSIS ===')

        # Find instances where AI mentioned blocks in their thoughts
        opportunity_logs = []
        for i, log in enumerate(all_logs):
            # Look for AI thoughts mentioning adjacent blocks or "Summary shows"
            if '"thought"' in log:
                thought_match = re.search(r'"thought":\s*"([^"]+)"', log)
                thought = thought_match.group(1) if thought_match else ""

                # Check for various patterns indicating adjacent blocks
                patterns = [
                    r'(\d+)\s+soft\s+block(?:s)?\s+adjacent',
                    r'(\d+)\s+block(?:s)?\s+adjacent',
                    r'Summary shows\s+(\d+)',
                    r'(\d+)\s+adjacent',
                    r'block(?:s)?\s+(up|down|left|right|below|above)',
                ]

                matched = False
                block_count = 1  # Default if we find mention but no number

                for pattern in patterns:
                    block_match = re.search(pattern, thought, re.IGNORECASE)
                    if block_match:
                        if block_match.groups() and block_match.group(1).isdigit():
                            block_count = int(block_match.group(1))
                        matched = True
                        break

                # Only count if they explicitly mention having blocks to bomb
                if matched and any(keyword in thought.lower() for keyword in ['summary shows', 'blocks adjacent', 'soft block', 'adjacent']):
                    decision_match = re.search(r'"dropBomb":\s*(true|false)', log)
                    decision = decision_match.group(1) == 'true' if decision_match else None

                    opportunity_logs.append({
                        'log': log,
                        'block_count': block_count,
                        'dropped_bomb': decision,
                        'thought': thought
                    })

        print(f'\nFound {len(opportunity_logs)} instances where players had adjacent breakable blocks')

        # Count how many times they bombed vs didn't bomb
        bombed_count = sum(1 for opp in opportunity_logs if opp['dropped_bomb'] is True)
        not_bombed_count = sum(1 for opp in opportunity_logs if opp['dropped_bomb'] is False)
        unknown_count = len(opportunity_logs) - bombed_count - not_bombed_count

        print(f'  - Dropped bomb: {bombed_count}')
        print(f'  - Did NOT drop bomb: {not_bombed_count}')
        print(f'  - Unknown/No decision found: {unknown_count}')

        # Show examples of missed opportunities
        print(f'\n=== MISSED OPPORTUNITIES (adjacent blocks but no bomb) ===')
        missed = [opp for opp in opportunity_logs if opp['dropped_bomb'] is False]
        for idx, opp in enumerate(missed[:5], 1):
            print(f'\n--- Example {idx} ---')
            print(f'Blocks: {opp["block_count"]} adjacent')
            if opp['thought']:
                print(f'Thought: "{opp["thought"]}"')
            else:
                print('Thought: (not captured)')

        # Show examples of successful bombing
        print(f'\n=== SUCCESSFUL BOMBING (adjacent blocks + bomb dropped) ===')
        success = [opp for opp in opportunity_logs if opp['dropped_bomb'] is True]
        for idx, opp in enumerate(success[:3], 1):
            print(f'\n--- Example {idx} ---')
            print(f'Blocks: {opp["block_count"]} adjacent')
            if opp['thought']:
                print(f'Thought: "{opp["thought"]}"')

        # Count bomb drops vs moves
        bomb_drops = len([log for log in all_logs if '"dropBomb": true' in log])
        total_decisions = len([log for log in all_logs if '"dropBomb"' in log])

        print(f'\n=== OVERALL STATS ===')
        print(f'Total AI decisions: {total_decisions}')
        print(f'Bombs dropped: {bomb_drops}')
        print(f'Bomb rate: {bomb_drops/total_decisions*100:.1f}%' if total_decisions > 0 else 'N/A')
        print(f'Opportunities with adjacent blocks: {len(opportunity_logs)}')
        print(f'Conversion rate: {bombed_count/len(opportunity_logs)*100:.1f}%' if opportunity_logs else 'N/A')

        print('\n=== TEST COMPLETE ===')
        browser.close()
        print('✓ Browser closed')

if __name__ == '__main__':
    test_gameplay()
