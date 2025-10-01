#!/usr/bin/env python3
"""
Electric Boogaloo - Playwright Debug Script

This script opens the game in a browser with the API key in the URL,
captures console logs, and lets you watch the game play out.

Usage:
    python debug_game.py <groq_api_key>

Example:
    python debug_game.py gsk_abc123xyz
"""

import sys
import time
from playwright.sync_api import sync_playwright

def debug_game(api_key: str, url: str = None):
    """
    Open the game with Playwright and debug it.

    Args:
        api_key: Groq Cloud API key
        url: Optional custom URL (defaults to local file)
    """
    if url is None:
        # Use local file
        url = f"file://{'/Users/user/dev/bombervibe/index.html'}#{api_key}"
    else:
        # Use provided URL with API key fragment
        url = f"{url}#{api_key}"

    print(f"🎮 Electric Boogaloo Debug Session")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"URL: {url[:50]}...")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    with sync_playwright() as p:
        # Launch browser in headed mode (visible)
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )

        page = context.new_page()

        # Set up console logging
        console_logs = []

        def handle_console(msg):
            timestamp = time.strftime('%H:%M:%S')
            log_type = msg.type
            text = msg.text

            # Color code by type
            colors = {
                'log': '\033[37m',      # White
                'info': '\033[36m',     # Cyan
                'warning': '\033[33m',  # Yellow
                'error': '\033[31m',    # Red
                'debug': '\033[35m',    # Magenta
            }
            color = colors.get(log_type, '\033[37m')
            reset = '\033[0m'

            formatted = f"{color}[{timestamp}] [{log_type.upper()}] {text}{reset}"
            print(formatted)
            console_logs.append({'timestamp': timestamp, 'type': log_type, 'text': text})

        page.on('console', handle_console)

        # Set up error logging
        def handle_page_error(error):
            print(f"\033[31m[PAGE ERROR] {error}\033[0m")

        page.on('pageerror', handle_page_error)

        # Navigate to the game
        print(f"🌐 Loading game...")
        page.goto(url)

        # Wait for game to initialize
        print(f"⏳ Waiting for game initialization...")
        page.wait_for_selector('#gameBoard', timeout=10000)

        print(f"✅ Game loaded!\n")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"🎯 Controls:")
        print(f"   - Click START button to begin game")
        print(f"   - Watch console logs below")
        print(f"   - Press Ctrl+C to exit")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        # Auto-click START button
        try:
            start_button = page.locator('#startGame')
            if start_button.is_visible():
                print(f"🚀 Auto-clicking START button...")
                start_button.click()
                print(f"✅ Game started!\n")
        except Exception as e:
            print(f"⚠️  Could not auto-start game: {e}")
            print(f"   Please click START manually\n")

        # Keep browser open and monitor
        print(f"👀 Monitoring game... (Press Ctrl+C to stop)\n")

        try:
            # Wait indefinitely until user stops
            while True:
                # Check if page is still alive
                try:
                    page.title()
                    time.sleep(1)
                except:
                    print(f"\n❌ Page closed")
                    break
        except KeyboardInterrupt:
            print(f"\n\n🛑 Stopping debug session...")

        # Save console logs to file
        log_file = 'game_debug.log'
        with open(log_file, 'w') as f:
            f.write(f"Electric Boogaloo - Debug Log\n")
            f.write(f"{'='*50}\n\n")
            for log in console_logs:
                f.write(f"[{log['timestamp']}] [{log['type'].upper()}] {log['text']}\n")

        print(f"💾 Console logs saved to: {log_file}")

        browser.close()
        print(f"✅ Debug session complete!")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("❌ Error: Missing API key")
        print(f"\nUsage:")
        print(f"  python debug_game.py <groq_api_key>")
        print(f"\nExample:")
        print(f"  python debug_game.py gsk_abc123xyz")
        print(f"\nWith custom URL:")
        print(f"  python debug_game.py gsk_abc123xyz https://example.com/game")
        sys.exit(1)

    api_key = sys.argv[1]
    url = sys.argv[2] if len(sys.argv) > 2 else None

    debug_game(api_key, url)
