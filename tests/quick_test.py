#!/usr/bin/env python3
"""Quick gameplay test - captures full console output"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Load API keys
load_dotenv(Path(__file__).parent / '.env')

def main():
    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: No API key found')
        sys.exit(1)

    # Get path to index.html
    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'
    file_url = f'file://{index_path.absolute()}#{api_key}'

    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture ALL console output
        page.on('console', lambda msg: console_logs.append(msg.text))

        # Load game
        page.goto(file_url, wait_until='load', timeout=10000)
        page.wait_for_timeout(2000)

        # Start game
        page.click('#startGame')
        print('Game started, waiting for 5 rounds...')

        # Wait for 20 rounds (about 60 seconds)
        page.wait_for_timeout(60000)

        browser.close()

    # Save logs
    log_file = project_root / 'tests' / 'console_output.txt'
    with open(log_file, 'w') as f:
        for log in console_logs:
            f.write(log + '\n')

    print(f'\nSaved {len(console_logs)} console logs to {log_file}')

    # Print summary
    round_logs = [l for l in console_logs if '[ROUND' in l and 'START' in l]
    print(f'Rounds completed: {len(round_logs)}')

    # Show AI deaths
    death_logs = [l for l in console_logs if 'died' in l.lower() or '💀' in l]
    if death_logs:
        print(f'\nDeaths detected ({len(death_logs)}):')
        for log in death_logs[:10]:
            print(f'  {log}')

if __name__ == '__main__':
    main()
