#!/usr/bin/env python3
"""
Playwright Test Helpers for Bombervibe

Provides utilities for:
- Initializing game with specific seed
- Injecting mock LLM
- Fast-forwarding game state
- Asserting game conditions
"""

import os
import json
from pathlib import Path


def get_game_url_with_seed(seed, max_rounds=None, api_key=None):
    """
    Get file:// URL for game with seed and optional parameters

    Args:
        seed: Seed for world generation
        max_rounds: Optional max rounds for auto-stop
        api_key: Optional API key (if not provided, will be read from .env)

    Returns:
        str: Complete file:// URL with fragment
    """
    project_root = Path(__file__).parent.parent
    index_path = project_root / 'index.html'

    # Build fragment
    if api_key is None:
        api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('OPENAI_API_KEY')

    if not api_key:
        raise ValueError('No API key provided or found in environment')

    fragment = f'{api_key}'

    if max_rounds:
        fragment += f'&maxRounds={max_rounds}'

    return f'file://{index_path.absolute()}#{fragment}&seed={seed}'


def inject_mock_llm(page, strategy='tactical', seed=None):
    """
    Inject mock LLM controller into page

    Args:
        page: Playwright page object
        strategy: Mock LLM strategy ('random', 'aggressive', 'defensive', 'tactical')
        seed: Optional seed for mock LLM RNG
    """
    inject_script = f"""
    (function() {{
        // Create mock LLM with specified strategy
        const mockLLM = new MockLLM('{strategy}', new SeededRNG({seed or 'Date.now()'}));

        // Replace ai controller's getAIMove method
        const originalGetAIMove = ai.getAIMove.bind(ai);
        ai.getAIMove = async function(gameState, playerId, game) {{
            return await mockLLM.getAIMove(gameState, playerId, game);
        }};

        // Replace getAllPlayerMoves method
        const originalGetAllPlayerMoves = ai.getAllPlayerMoves.bind(ai);
        ai.getAllPlayerMoves = async function(gameState, game) {{
            return await mockLLM.getAllPlayerMoves(gameState, game);
        }};

        console.log('[TEST] Mock LLM injected with strategy: {strategy}');
    }})();
    """

    page.evaluate(inject_script)


def init_game_with_seed(page, seed, options=None):
    """
    Initialize game with specific seed and options

    Args:
        page: Playwright page object
        seed: Seed for world generation
        options: Optional game options dict
    """
    if options is None:
        options = {}

    init_script = f"""
    (function() {{
        // Create game with seed
        const gameOptions = {json.dumps(options)};
        game = new Game({seed}, gameOptions);
        game.initialize();

        console.log('[TEST] Game initialized with seed: {seed}');
        console.log('[TEST] World analysis:', {{
            softBlocks: game.grid.flat().filter(c => c === 1).length,
            hardBlocks: game.grid.flat().filter(c => c === 2).length,
            emptySpaces: game.grid.flat().filter(c => c === 0).length
        }});
    }})();
    """

    page.evaluate(init_script)


def get_game_state(page):
    """
    Get complete game state from page

    Returns:
        dict: Game state
    """
    return page.evaluate("""
    (function() {
        return game.getCompleteState();
    })();
    """)


def fast_forward_rounds(page, num_rounds):
    """
    Fast-forward game by N rounds (synchronous, for testing)

    Args:
        page: Playwright page object
        num_rounds: Number of rounds to advance
    """
    script = f"""
    (async function() {{
        const playerCount = game.players.length;

        for (let round = 0; round < {num_rounds}; round++) {{
            // Get all moves
            const gameState = game.getGameState();
            const allMoves = await ai.getAllPlayerMoves(gameState, game);

            // Execute moves for all players
            for (const player of game.players) {{
                if (!player.alive) continue;

                const move = allMoves[player.id];
                if (move && move.action === 'move') {{
                    // Drop bomb first
                    if (move.dropBomb) {{
                        game.playerPlaceBomb(player.id);
                    }}
                    // Then move
                    game.movePlayer(player.id, move.direction);
                }}
            }}

            // Advance turn counter
            for (let i = 0; i < playerCount; i++) {{
                game.nextTurn();
            }}

            // Update bombs
            game.updateBombs();
        }}

        console.log('[TEST] Fast-forwarded {num_rounds} rounds');
        return game.roundCount;
    }})();
    """

    return page.evaluate(script)


def assert_player_at_position(page, player_id, x, y):
    """Assert player is at specific position"""
    result = page.evaluate(f"""
    (function() {{
        const player = game.players.find(p => p.id === {player_id});
        return player && player.x === {x} && player.y === {y};
    }})();
    """)

    assert result, f"Player {player_id} not at ({x}, {y})"


def assert_cell_type(page, x, y, cell_type):
    """Assert cell at position has specific type"""
    result = page.evaluate(f"""
    (function() {{
        return game.grid[{y}][{x}] === {cell_type};
    }})();
    """)

    assert result, f"Cell at ({x}, {y}) is not type {cell_type}"


def assert_bomb_at_position(page, x, y):
    """Assert bomb exists at position"""
    result = page.evaluate(f"""
    (function() {{
        return game.bombs.some(b => b.x === {x} && b.y === {y});
    }})();
    """)

    assert result, f"No bomb at ({x}, {y})"


def assert_player_alive(page, player_id):
    """Assert player is alive"""
    result = page.evaluate(f"""
    (function() {{
        const player = game.players.find(p => p.id === {player_id});
        return player && player.alive;
    }})();
    """)

    assert result, f"Player {player_id} is not alive"


def assert_player_dead(page, player_id):
    """Assert player is dead"""
    result = page.evaluate(f"""
    (function() {{
        const player = game.players.find(p => p.id === {player_id});
        return player && !player.alive;
    }})();
    """)

    assert result, f"Player {player_id} is not dead"


def wait_for_explosions(page, timeout=5000):
    """Wait for all explosions to finish"""
    page.wait_for_function("""
    () => game.explosions.length === 0
    """, timeout=timeout)


def load_test_fixtures():
    """Load test fixtures from JSON"""
    fixtures_path = Path(__file__).parent / 'fixtures' / 'seeds.json'

    if not fixtures_path.exists():
        return {}

    with open(fixtures_path, 'r') as f:
        return json.load(f)


def get_fixture_seed(fixture_name):
    """Get seed from fixture by name"""
    fixtures = load_test_fixtures()

    if fixture_name not in fixtures:
        raise ValueError(f"Fixture '{fixture_name}' not found")

    return fixtures[fixture_name]['seed']
