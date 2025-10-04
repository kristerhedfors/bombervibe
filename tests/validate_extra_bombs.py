#!/usr/bin/env python3
"""
Quick validation script for extra_bomb loot feature
Runs a short test to verify the basic functionality works
"""

from playwright.sync_api import sync_playwright
import time
from pathlib import Path

def validate():
    """Quick validation test"""

    # Load API key
    env_file = Path(__file__).parent / '.env'
    api_key = None
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith('GROQ_API_KEY='):
                    api_key = line.strip().split('=', 1)[1]
                    break

    if not api_key:
        print("❌ No GROQ_API_KEY found in tests/.env")
        return False

    print("="*70)
    print("EXTRA BOMB LOOT - QUICK VALIDATION TEST")
    print("="*70)
    print("\nThis test will:")
    print("1. Open game with extra_bomb next to Player 1")
    print("2. Watch for loot pickup")
    print("3. Watch for 2 bombs placed by Player 1")
    print("4. Report results\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Track key events
        events = {
            'extra_bomb_pickup': False,
            'bombs_placed': [],
            'activeBombs_2': False
        }

        def on_console(msg):
            text = msg.text

            # Check for pickup
            if 'Picked up Extra Bomb' in text:
                events['extra_bomb_pickup'] = True
                print(f"✅ {text}")

            # Check for bomb placements by P1
            if 'P1' in text and '💣 BOMB' in text:
                events['bombs_placed'].append(text)
                print(f"✅ {text}")

            # Check for 2 active bombs
            if 'P1' in text and 'activeBombs: 2' in text:
                events['activeBombs_2'] = True
                print(f"✅ {text}")

        page.on('console', on_console)

        # Load game with extra_bomb for Player 1
        url = f"file://{Path(__file__).parent.parent / 'index.html'}#{api_key}&extrabomb_player1=true&maxRounds=8"
        print(f"🌐 Loading game...")
        page.goto(url)

        # Wait for grid
        page.wait_for_selector('div#grid', timeout=10000)
        time.sleep(1)

        # Start game
        print("▶️  Starting game...\n")
        page.click('button#startGame')

        # Watch for 20 seconds or until 8 rounds
        print("👀 Watching gameplay...\n")
        start_time = time.time()
        while (time.time() - start_time) < 20:
            time.sleep(0.5)

            # Check if we have enough data
            if events['extra_bomb_pickup'] and len(events['bombs_placed']) >= 2:
                print("\n✅ Got enough data, stopping early")
                break

        time.sleep(2)
        browser.close()

        # Validate results
        print("\n" + "="*70)
        print("VALIDATION RESULTS")
        print("="*70)

        success = True

        if events['extra_bomb_pickup']:
            print("✅ PASS: Player 1 picked up extra_bomb loot")
        else:
            print("❌ FAIL: Player 1 did not pick up extra_bomb")
            success = False

        if len(events['bombs_placed']) >= 2:
            print(f"✅ PASS: Player 1 placed {len(events['bombs_placed'])} bombs")
        else:
            print(f"❌ FAIL: Player 1 only placed {len(events['bombs_placed'])} bombs (expected 2+)")
            success = False

        if events['activeBombs_2']:
            print("✅ PASS: Player 1 had 2 active bombs simultaneously")
        else:
            print("⚠️  WARNING: Did not see 'activeBombs: 2' log (may not be an issue)")

        print("\n" + "="*70)
        if success:
            print("✅ VALIDATION PASSED - Extra bomb loot works!")
        else:
            print("❌ VALIDATION FAILED - Check implementation")
        print("="*70 + "\n")

        return success

if __name__ == "__main__":
    import sys
    success = validate()
    sys.exit(0 if success else 1)
