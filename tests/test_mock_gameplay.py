#!/usr/bin/env python3
"""
Test gameplay with mock predictable LLM responses
Validates that bomb placement, explosions, and escapes work correctly
"""

from playwright.sync_api import sync_playwright
import time
import json
from pathlib import Path

def test_mock_gameplay():
    """Test gameplay with mock LLM responses"""

    # Load API key from .env
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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()

        # Track console logs
        console_logs = []
        def on_console(msg):
            text = msg.text
            console_logs.append(text)
            # Print important logs
            if any(kw in text for kw in ['[ROUND', '[AI P', 'BOMB', 'EXPLOSION']):
                print(text)

        page.on('console', on_console)

        # Load game with API key
        url = f"file:///Users/user/dev/bombervibe/index.html#{api_key}"
        print(f"🌐 Loading game with API key from .env")
        page.goto(url)

        # Wait for grid
        page.wait_for_selector('div#grid', timeout=10000)
        time.sleep(2)

        # Inject mock LLM
        print("💉 Injecting mock LLM...")
        page.evaluate("""
            // Mock LLM that returns predictable moves
            window.mockLLM = {
                roundNum: 0,

                // Define scripted moves for testing bomb placement
                getMoveForPlayer: function(playerId, gameState) {
                    this.roundNum = gameState.roundCount;

                    // ROUND 1: All players move toward center
                    if (this.roundNum === 1) {
                        return {
                            1: {direction: 'right', dropBomb: false, thought: 'Moving off corner toward center'},
                            2: {direction: 'left', dropBomb: false, thought: 'Moving off corner toward center'},
                            3: {direction: 'up', dropBomb: false, thought: 'Moving off corner toward center'},
                            4: {direction: 'up', dropBomb: false, thought: 'Moving off corner toward center'}
                        }[playerId];
                    }

                    // ROUND 2: Player 1 drops bomb and moves right (should succeed)
                    if (this.roundNum === 2) {
                        return {
                            1: {direction: 'right', dropBomb: true, thought: 'Dropping bomb at B11, moving right to C11'},
                            2: {direction: 'down', dropBomb: false, thought: 'Moving down'},
                            3: {direction: 'right', dropBomb: false, thought: 'Moving right'},
                            4: {direction: 'down', dropBomb: false, thought: 'Moving down'}
                        }[playerId];
                    }

                    // ROUND 3: Player 2 drops bomb and moves left
                    if (this.roundNum === 3) {
                        return {
                            1: {direction: 'up', dropBomb: false, thought: 'Escaping from bomb area'},
                            2: {direction: 'left', dropBomb: true, thought: 'Dropping bomb at L11, moving left'},
                            3: {direction: 'up', dropBomb: false, thought: 'Moving up'},
                            4: {direction: 'left', dropBomb: false, thought: 'Moving left'}
                        }[playerId];
                    }

                    // ROUND 4: Players move to safety
                    if (this.roundNum === 4) {
                        return {
                            1: {direction: 'up', dropBomb: false, thought: 'Moving to safe position'},
                            2: {direction: 'down', dropBomb: false, thought: 'Moving to safe position'},
                            3: {direction: 'right', dropBomb: false, thought: 'Moving right'},
                            4: {direction: 'down', dropBomb: false, thought: 'Moving down'}
                        }[playerId];
                    }

                    // ROUND 5: Escaping from explosions
                    if (this.roundNum === 5) {
                        return {
                            1: {direction: 'right', dropBomb: false, thought: 'Escaping explosion zone'},
                            2: {direction: 'left', dropBomb: false, thought: 'Escaping explosion zone'},
                            3: {direction: 'up', dropBomb: false, thought: 'Moving up'},
                            4: {direction: 'left', dropBomb: false, thought: 'Moving left'}
                        }[playerId];
                    }

                    // ROUND 6+: Bombs should explode, continue moving
                    return {
                        1: {direction: 'down', dropBomb: false, thought: 'Moving after explosion'},
                        2: {direction: 'up', dropBomb: false, thought: 'Moving after explosion'},
                        3: {direction: 'left', dropBomb: false, thought: 'Moving left'},
                        4: {direction: 'right', dropBomb: false, thought: 'Moving right'}
                    }[playerId];
                }
            };

            // Override AI controller
            if (window.ai) {
                window.ai.getAIMove = async function(gameState, playerId, game) {
                    console.log(`[MOCK LLM] P${playerId} Round ${gameState.roundCount}`);
                    const move = window.mockLLM.getMoveForPlayer(playerId, gameState);

                    // Log the move
                    console.log(`[MOCK LLM] P${playerId} -> ${move.direction}, bomb: ${move.dropBomb}, thought: "${move.thought}"`);

                    return {
                        action: 'move',
                        direction: move.direction,
                        dropBomb: move.dropBomb,
                        thought: move.thought
                    };
                };

                console.log('[MOCK LLM] ✓ Installed successfully');
            } else {
                console.log('[MOCK LLM] ✗ AI controller not available');
            }
        """)

        time.sleep(1)

        # Start game
        print("▶️  Starting game...")
        start_btn = page.locator('button#startGame')
        start_btn.click()

        print("\n🎮 Running mock gameplay test (max 10 rounds)...\n")

        # Track game state
        max_rounds = 10
        current_round = 0
        bombs_placed = []
        explosions = []

        start_time = time.time()
        game_over = False
        import re

        while (time.time() - start_time) < 30:  # Max 30 seconds
            time.sleep(0.5)

            # CRITICAL: Check for game over overlay in DOM (DOM is live, console logs aren't!)
            game_over_overlay = page.locator('#gameOverOverlay')
            if game_over_overlay.count() > 0:
                print(f"\n🏁 GAME OVER detected in DOM!")
                game_over = True
                time.sleep(2)  # Let it display
                break

            # Parse console logs for tracking
            for log in console_logs[-20:]:
                # Track rounds
                if '[ROUND' in log and 'START' in log:
                    match = re.search(r'\[ROUND (\d+)\]', log)
                    if match:
                        round_num = int(match.group(1))
                        if round_num > current_round:
                            current_round = round_num
                            print(f"\n{'='*60}")
                            print(f"ROUND {current_round}")
                            print(f"{'='*60}")

                # Track bomb placements (avoid duplicates)
                if '+BOMB' in log and log not in bombs_placed:
                    bombs_placed.append(log)
                    print(f"  💣 {log}")

                # Track explosions (avoid duplicates)
                if 'EXPLOSIONS:' in log and log not in explosions:
                    explosions.append(log)
                    print(f"  💥 {log}")

            # Stop after max rounds
            if current_round >= max_rounds:
                print(f"\n🛑 Reached {max_rounds} rounds, stopping test")
                break

        print(f"\n{'='*60}")
        print("TEST RESULTS")
        print(f"{'='*60}")
        print(f"Rounds completed: {current_round}")
        print(f"Bombs placed: {len(bombs_placed)}")
        print(f"Explosions: {len(explosions)}")

        # Validate results
        success = True

        if len(bombs_placed) < 2:
            print(f"❌ FAIL: Expected at least 2 bombs placed, got {len(bombs_placed)}")
            success = False
        else:
            print(f"✅ PASS: {len(bombs_placed)} bombs placed")

        if len(explosions) < 1:
            print(f"❌ FAIL: Expected at least 1 explosion, got {len(explosions)}")
            success = False
        else:
            print(f"✅ PASS: {len(explosions)} explosions occurred")

        if current_round < 6:
            print(f"❌ FAIL: Expected at least 6 rounds, got {current_round}")
            success = False
        else:
            print(f"✅ PASS: {current_round} rounds completed")

        # Check for blocked bomb placements
        blocked_bombs = [log for log in console_logs if '+BOMB' in log and 'BLOCKED' in log]
        if len(blocked_bombs) > 0:
            print(f"⚠️  WARNING: {len(blocked_bombs)} blocked bomb placements")
            for log in blocked_bombs[:3]:
                print(f"     {log}")

        print(f"\n{'='*60}")
        if success:
            print("✅ ALL TESTS PASSED!")
        else:
            print("❌ SOME TESTS FAILED")
        print(f"{'='*60}\n")

        time.sleep(2)
        browser.close()

        return success

if __name__ == "__main__":
    print("🚀 Starting Mock Gameplay Test\n")
    success = test_mock_gameplay()
    exit(0 if success else 1)
