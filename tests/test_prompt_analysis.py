#!/usr/bin/env python3
"""
Playwright test to analyze AI prompts and behavior in Electric Boogaloo
Captures prompts, analyzes bomb placement decisions, and validates gameplay logic
"""

import json
import re
from playwright.sync_api import sync_playwright, Page
import time
from datetime import datetime

def analyze_prompt_structure(prompt_text):
    """Analyze prompt structure and extract key information"""
    analysis = {
        'has_vision_grid': '7x7 VISION:' in prompt_text or '11x11 VISION:' in prompt_text,
        'has_breakable_info': 'Breakable:' in prompt_text,
        'has_valid_moves': 'VALID MOVES:' in prompt_text,
        'has_danger_analysis': 'DANGER:' in prompt_text,
        'has_bomb_status': '💣0' in prompt_text or '💣1' in prompt_text,
        'has_loot_info': 'LOOT:' in prompt_text,
    }

    # Extract specific values
    breakable_match = re.search(r'Breakable:\s*(\d+)', prompt_text)
    if breakable_match:
        analysis['breakable_count'] = int(breakable_match.group(1))

    valid_moves_match = re.search(r'VALID MOVES:\s*([^\n]+)', prompt_text)
    if valid_moves_match:
        analysis['valid_moves'] = valid_moves_match.group(1)

    blocked_match = re.search(r'BLOCKED:\s*([^\n]+)', prompt_text)
    if blocked_match:
        analysis['blocked_moves'] = blocked_match.group(1)

    bomb_status_match = re.search(r'Bomb:(💣[01])', prompt_text)
    if bomb_status_match:
        analysis['bomb_status'] = bomb_status_match.group(1)

    return analysis

def capture_console_logs(page: Page):
    """Capture and categorize console logs"""
    console_logs = []
    prompts_captured = []
    ai_decisions = []

    def on_console(msg):
        text = msg.text
        console_logs.append({'type': msg.type, 'text': text})

        # Capture full prompts when they appear
        if '=== USER PROMPT ===' in text or '=== SYSTEM PROMPT ===' in text:
            prompts_captured.append(text)

        # Capture AI decisions
        if '[AI P' in text and 'Move:' in text:
            ai_decisions.append(text)

        # Capture bomb placement attempts
        if 'dropBomb' in text:
            ai_decisions.append(text)

    page.on('console', on_console)
    return console_logs, prompts_captured, ai_decisions

def analyze_bomb_placement_behavior(page: Page, max_rounds=20):
    """Analyze why bombs are/aren't being placed"""
    results = {
        'rounds_analyzed': 0,
        'bomb_attempts': [],
        'bomb_successes': [],
        'bomb_blocks': [],
        'breakable_opportunities': [],
        'missed_opportunities': []
    }

    console_logs, prompts, decisions = capture_console_logs(page)

    # Wait for game to start
    time.sleep(2)

    current_round = 0
    round_data = {}

    for i in range(max_rounds * 10):  # Check frequently
        # Look for round start markers
        for log in console_logs[-5:]:
            if '[ROUND' in log['text'] and 'START' in log['text']:
                match = re.search(r'\[ROUND (\d+)\]', log['text'])
                if match:
                    new_round = int(match.group(1))
                    if new_round > current_round:
                        current_round = new_round
                        round_data[current_round] = {
                            'prompts': [],
                            'decisions': [],
                            'outcomes': []
                        }

        # Capture decisions for current round
        for log in console_logs[-10:]:
            if f'[ROUND {current_round}]' in log['text']:
                if 'P1:' in log['text'] or 'P2:' in log['text'] or 'P3:' in log['text'] or 'P4:' in log['text']:
                    round_data[current_round]['outcomes'].append(log['text'])

            if '[AI P' in log['text'] and 'dropBomb' in log['text']:
                round_data[current_round]['decisions'].append(log['text'])

        time.sleep(0.2)

        if current_round >= max_rounds:
            break

    results['rounds_analyzed'] = current_round
    results['round_data'] = round_data

    # Analyze bomb placement patterns
    for round_num, data in round_data.items():
        for decision in data['decisions']:
            if 'dropBomb: true' in decision:
                results['bomb_attempts'].append({
                    'round': round_num,
                    'decision': decision
                })

        for outcome in data['outcomes']:
            if '+BOMB' in outcome:
                if 'BLOCKED' in outcome:
                    results['bomb_blocks'].append({
                        'round': round_num,
                        'outcome': outcome
                    })
                else:
                    results['bomb_successes'].append({
                        'round': round_num,
                        'outcome': outcome
                    })

    return results

def test_prompt_effectiveness():
    """Main test to analyze prompt effectiveness"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Navigate to game with API key from environment
        api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
        if not api_key:
            print('❌ No API key found in environment')
            return

        index_path = Path(__file__).parent.parent / 'index.html'
        url = f"file://{index_path.absolute()}#{api_key}"
        page.goto(url)

        # Setup console capture
        console_logs, prompts, decisions = capture_console_logs(page)

        # Wait for AI controller to load
        time.sleep(2)

        # Enable prompt logging by injecting code
        try:
            page.evaluate("""
                // Intercept AI controller to log full prompts
                if (window.ai && window.ai.getAIMove) {
                    const originalGetAIMove = window.ai.getAIMove.bind(window.ai);
                    window.ai.getAIMove = async function(...args) {
                        const [gameState, playerId, game] = args;

                        // Generate and log the full prompt
                        const gameDescription = this.generateGameStateDescription(gameState, playerId, game);
                        const playerStrategy = this.prompts[playerId] || 'Make smart moves to survive and win.';
                        const userPrompt = `${gameDescription}
STRATEGY: ${playerStrategy}

Respond with JSON: {"direction":"up|down|left|right","dropBomb":true|false,"thought":"why (50 words max)"}`;

                        console.log(`\\n=== COMPLETE PROMPT FOR P${playerId} (ROUND ${gameState.roundCount}) ===`);
                        console.log('=== SYSTEM PROMPT ===');
                        console.log(this.systemPrompt);
                        console.log('\\n=== USER PROMPT (GAME STATE) ===');
                        console.log(userPrompt);
                        console.log('=== END PROMPT ===\\n');

                        return originalGetAIMove.apply(this, args);
                    };
                    console.log('[TEST] Prompt logging enabled');
                } else {
                    console.log('[TEST] AI controller not ready yet');
                }
            """)
        except Exception as e:
            print(f"Warning: Could not inject prompt logging: {e}")

        # Wait for game initialization (grid element loads)
        page.wait_for_selector('div#grid', timeout=10000)
        time.sleep(2)

        # Click START button (correct selector: #startGame)
        start_button = page.locator('button#startGame')
        if start_button.count() > 0:
            start_button.click()
            print("\n🎮 GAME STARTED - Analyzing AI behavior...\n")
            time.sleep(1)  # Give game time to initialize
        else:
            print("\n⚠️ No START button found, game may auto-start\n")

        # Analyze behavior
        results = analyze_bomb_placement_behavior(page, max_rounds=15)

        # Print analysis
        print(f"\n{'='*80}")
        print(f"📊 ANALYSIS RESULTS (Rounds: {results['rounds_analyzed']})")
        print(f"{'='*80}\n")

        print(f"💣 BOMB ATTEMPTS: {len(results['bomb_attempts'])}")
        for attempt in results['bomb_attempts'][:5]:
            print(f"  Round {attempt['round']}: {attempt['decision']}")

        print(f"\n✅ SUCCESSFUL BOMB PLACEMENTS: {len(results['bomb_successes'])}")
        for success in results['bomb_successes'][:5]:
            print(f"  Round {success['round']}: {success['outcome']}")

        print(f"\n❌ BLOCKED BOMB PLACEMENTS: {len(results['bomb_blocks'])}")
        for block in results['bomb_blocks'][:5]:
            print(f"  Round {block['round']}: {block['outcome']}")

        # Capture and print a sample prompt
        print(f"\n{'='*80}")
        print("📝 SAMPLE PROMPT CAPTURED:")
        print(f"{'='*80}\n")

        for prompt in prompts[:2]:
            if '=== COMPLETE PROMPT' in prompt:
                print(prompt[:2000])  # First 2000 chars
                print("...[truncated]...\n")

                # Analyze structure
                analysis = analyze_prompt_structure(prompt)
                print("PROMPT STRUCTURE ANALYSIS:")
                for key, value in analysis.items():
                    print(f"  {key}: {value}")
                break

        # Wait a bit more to see results
        time.sleep(3)

        # Save full logs to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = f"/Users/user/dev/bombervibe/tests/prompt_analysis_{timestamp}.json"

        with open(log_file, 'w') as f:
            json.dump({
                'results': results,
                'prompts': prompts[:10],
                'console_logs': [log for log in console_logs if any(keyword in log['text'] for keyword in ['[AI', '[ROUND', 'BOMB', 'dropBomb'])]
            }, f, indent=2)

        print(f"\n💾 Full logs saved to: {log_file}")

        browser.close()

        # Return summary for further iteration
        return {
            'bomb_success_rate': len(results['bomb_successes']) / max(len(results['bomb_attempts']), 1),
            'block_rate': len(results['bomb_blocks']) / max(len(results['bomb_attempts']), 1),
            'total_rounds': results['rounds_analyzed'],
            'prompts_captured': len(prompts)
        }

if __name__ == "__main__":
    print("🚀 Starting Prompt Analysis Test...")
    summary = test_prompt_effectiveness()

    print(f"\n{'='*80}")
    print("📈 SUMMARY")
    print(f"{'='*80}")
    print(f"Bomb Success Rate: {summary['bomb_success_rate']:.1%}")
    print(f"Bomb Block Rate: {summary['block_rate']:.1%}")
    print(f"Rounds Analyzed: {summary['total_rounds']}")
    print(f"Prompts Captured: {summary['prompts_captured']}")
    print(f"\n✅ Test complete!")
