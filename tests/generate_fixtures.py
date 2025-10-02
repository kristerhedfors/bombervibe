#!/usr/bin/env python3
"""
Generate test fixture seeds using SeedFinder

Run this to populate tests/fixtures/seeds.json with useful test seeds
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Load API keys
load_dotenv(Path(__file__).parent / '.env')


def generate_fixtures():
    """Generate test fixture seeds"""

    api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: No API key found in tests/.env')
        sys.exit(1)

    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'
    file_url = f'file://{index_path.absolute()}#{api_key}'

    print('Generating test fixture seeds...')

    fixtures = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load game
        page.goto(file_url)
        page.wait_for_timeout(1000)

        # === FIND SEEDS WITH SPECIFIC PROPERTIES ===

        # 1. Find seed with many soft blocks
        print('\n[1/5] Finding seed with many soft blocks...')
        results = page.evaluate("""
        SeedFinder.findSeeds({
            minSoftBlocks: 45,
            maxSoftBlocks: 55,
            hasOpenCenter: true
        }, {
            maxAttempts: 1000,
            maxResults: 1,
            verbose: false
        })
        """)

        if results:
            seed_info = results[0]
            fixtures['many_soft_blocks'] = {
                'seed': seed_info['seed'],
                'description': f'Map with {seed_info["world"]["softBlocks"]} soft blocks, open center',
                **seed_info['world']
            }
            print(f'  ✓ Found seed {seed_info["seed"]}')
        else:
            print('  ✗ No seed found')

        # 2. Find seed with few soft blocks
        print('\n[2/5] Finding seed with few soft blocks...')
        results = page.evaluate("""
        SeedFinder.findSeeds({
            minSoftBlocks: 20,
            maxSoftBlocks: 30
        }, {
            maxAttempts: 1000,
            maxResults: 1,
            verbose: false
        })
        """)

        if results:
            seed_info = results[0]
            fixtures['few_soft_blocks'] = {
                'seed': seed_info['seed'],
                'description': f'Map with {seed_info["world"]["softBlocks"]} soft blocks',
                **seed_info['world']
            }
            print(f'  ✓ Found seed {seed_info["seed"]}')
        else:
            print('  ✗ No seed found')

        # 3. Find seed with large clusters
        print('\n[3/5] Finding seed with large clusters...')
        results = page.evaluate("""
        SeedFinder.findSeeds({
            minSoftBlocks: 30,
            minClusterSize: 5
        }, {
            maxAttempts: 1000,
            maxResults: 1,
            verbose: false
        })
        """)

        if results:
            seed_info = results[0]
            fixtures['large_clusters'] = {
                'seed': seed_info['seed'],
                'description': f'Map with largest cluster of {seed_info["world"]["largestCluster"]} blocks',
                **seed_info['world']
            }
            print(f'  ✓ Found seed {seed_info["seed"]}')
        else:
            print('  ✗ No seed found')

        # 4. Find comprehensive test seed
        print('\n[4/5] Finding comprehensive test seed...')
        result = page.evaluate("""
        SeedFinder.findComprehensiveTestSeed({
            maxAttempts: 2000,
            verbose: false
        })
        """)

        if result:
            seed_info = result
            fixtures['comprehensive'] = {
                'seed': seed_info['seed'],
                'description': 'Comprehensive test map with good mix of elements',
                **seed_info['world']
            }
            print(f'  ✓ Found seed {seed_info["seed"]}')
        else:
            print('  ✗ No seed found')

        # 5. Add some fixed seeds for specific test scenarios
        print('\n[5/5] Adding fixed seeds for specific scenarios...')
        fixtures['simple'] = {
            'seed': 12345,
            'description': 'Simple reproducible seed for basic tests'
        }
        fixtures['edge_case'] = {
            'seed': 99999,
            'description': 'Edge case seed for boundary testing'
        }
        print('  ✓ Added fixed seeds')

        browser.close()

    # Save to file
    fixtures_path = Path(__file__).parent / 'fixtures' / 'seeds.json'
    with open(fixtures_path, 'w') as f:
        json.dump(fixtures, None, 2)

    print(f'\n✓ Generated {len(fixtures)} test fixtures')
    print(f'✓ Saved to {fixtures_path}')

    # Print summary
    print('\n=== FIXTURE SUMMARY ===')
    for name, info in fixtures.items():
        print(f'{name}: seed={info["seed"]} - {info.get("description", "N/A")}')


if __name__ == '__main__':
    generate_fixtures()
