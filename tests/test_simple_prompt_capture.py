#!/usr/bin/env python3
"""
Simple Playwright test to capture AI prompts during gameplay
Saves complete prompts to file for analysis
"""

from playwright.sync_api import sync_playwright
import time
from datetime import datetime

def test_capture_prompts():
    """Capture AI prompts and save to file"""

    captured_prompts = []
    console_messages = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()

        # Capture console messages
        def on_console(msg):
            text = msg.text
            console_messages.append(text)

            # Capture prompt sections
            if '=== COMPLETE PROMPT' in text or '=== SYSTEM PROMPT ===' in text or '=== USER PROMPT' in text:
                captured_prompts.append(text)
                print(f"✓ Captured prompt section ({len(captured_prompts)} total)")

        page.on('console', on_console)

        # Navigate to game with API key from environment
        api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
        if not api_key:
            print('❌ No API key found in environment')
            return

        index_path = Path(__file__).parent.parent / 'index.html'
        url = f"file://{index_path.absolute()}#{api_key}"
        print(f"🌐 Loading {url}")
        page.goto(url)

        # Wait for grid to load
        print("⏳ Waiting for game UI...")
        page.wait_for_selector('div#grid', timeout=10000)
        time.sleep(3)

        # Inject prompt logger
        print("💉 Injecting prompt logger...")
        page.evaluate("""
            if (window.ai && window.ai.getAIMove) {
                const original = window.ai.getAIMove.bind(window.ai);
                window.ai.getAIMove = async function(...args) {
                    const [gameState, playerId, game] = args;
                    const gameDescription = this.generateGameStateDescription(gameState, playerId, game);
                    const playerStrategy = this.prompts[playerId] || 'Make smart moves to survive and win.';

                    console.log(`\\n=== COMPLETE PROMPT FOR P${playerId} (ROUND ${gameState.roundCount}) ===`);
                    console.log('=== SYSTEM PROMPT ===');
                    console.log(this.systemPrompt);
                    console.log('\\n=== USER PROMPT (GAME STATE) ===');
                    console.log(gameDescription);
                    console.log('STRATEGY: ' + playerStrategy);
                    console.log('=== END PROMPT ===\\n');

                    return original.apply(this, args);
                };
                console.log('[TEST] ✓ Prompt logging enabled');
            } else {
                console.log('[TEST] ✗ AI controller not ready');
            }
        """)

        time.sleep(1)

        # Click START
        print("▶️  Clicking START button...")
        start_btn = page.locator('button#startGame')
        if start_btn.count() > 0:
            start_btn.click()
            print("✓ Game started!")
        else:
            print("✗ START button not found!")
            browser.close()
            return

        # Let game run for max 15 rounds
        print("🎮 Observing gameplay (max 15 rounds)...")
        max_rounds = 15
        current_round = 0
        start_time = time.time()
        import re

        while (time.time() - start_time) < 60:  # Max 60 seconds total
            time.sleep(0.5)

            # Check for round updates
            for msg in console_messages[-10:]:
                if '[ROUND' in msg and 'START' in msg:
                    match = re.search(r'\[ROUND (\d+)\]', msg)
                    if match:
                        round_num = int(match.group(1))
                        if round_num > current_round:
                            current_round = round_num
                            print(f"   Round {current_round}/{max_rounds}: {msg[:70]}...")

            # HARD STOP - break out of while loop immediately
            if current_round >= max_rounds:
                print(f"\n🛑 Reached {current_round} rounds, STOPPING NOW!")
                break

        print(f"\n✅ Captured {len(captured_prompts)} prompt sections")

        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"/Users/user/dev/bombervibe/tests/captured_prompts_{timestamp}.txt"

        with open(output_file, 'w') as f:
            f.write("="*80 + "\n")
            f.write("CAPTURED AI PROMPTS - Electric Boogaloo\n")
            f.write(f"Timestamp: {timestamp}\n")
            f.write("="*80 + "\n\n")

            for i, prompt in enumerate(captured_prompts):
                f.write(f"\n{'='*80}\n")
                f.write(f"SECTION {i+1}/{len(captured_prompts)}\n")
                f.write(f"{'='*80}\n")
                f.write(prompt)
                f.write("\n")

            # Also save recent console logs
            f.write("\n\n" + "="*80 + "\n")
            f.write("RECENT CONSOLE LOGS (GAMEPLAY)\n")
            f.write("="*80 + "\n")
            for msg in console_messages:
                if any(keyword in msg for keyword in ['[ROUND', '[AI', 'BOMB', 'dropBomb', 'Breakable']):
                    f.write(msg + "\n")

        print(f"\n💾 Saved to: {output_file}")

        browser.close()
        return output_file

if __name__ == "__main__":
    print("🚀 Starting Simple Prompt Capture Test\n")
    output_file = test_capture_prompts()
    if output_file:
        print(f"\n✅ Test complete! Check file: {output_file}")
    else:
        print("\n❌ Test failed!")
