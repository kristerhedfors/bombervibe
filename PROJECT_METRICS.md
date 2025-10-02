# Project Metrics

**Generated:** 2025-10-02

> **Note:** This report excludes non-code files including:
> - Dependencies (.venv, node_modules)
> - Media files (.mp4, .jpg, .png, etc.)
> - Binary/compiled files (.pyc, .so, .dll, etc.)
> - Lock files (package-lock.json, etc.)
> - System files (.DS_Store, .git, __pycache__, etc.)

## Overview

| Metric | Value |
|--------|-------|
| Total Files | 51 |
| Total Lines | 20,115 |
| Code Lines | 14,776 |
| Comment Lines | 1,764 |
| Blank Lines | 3,575 |
| Total Size | 680.2 KB |
| Avg Lines/File | 394 |
| Avg Size/File | 13.3 KB |
| Comment Ratio | 11.9% |

## File Types

| Extension | Files | Lines | Size |
|-----------|-------|-------|------|
| .js | 18 | 8,017 | 247.6 KB |
| .txt | 3 | 4,609 | 217.3 KB |
| .md | 9 | 2,900 | 81.2 KB |
| .py | 13 | 2,451 | 81.7 KB |
| .css | 1 | 1,586 | 33.0 KB |
| .html | 2 | 346 | 12.1 KB |
| .svg | 1 | 96 | 3.6 KB |
| .sh | 1 | 72 | 2.7 KB |
| .json | 1 | 27 | 648 B |
| .example | 1 | 9 | 224 B |
| (none) | 1 | 2 | 249 B |

## Categories

### Source

- **Files:** 18
- **Lines:** 8,017
- **Size:** 247.6 KB

### Styles

- **Files:** 1
- **Lines:** 1,586
- **Size:** 33.0 KB

### Markup

- **Files:** 3
- **Lines:** 442
- **Size:** 15.7 KB

### Documentation

- **Files:** 12
- **Lines:** 7,509
- **Size:** 298.5 KB

### Config

- **Files:** 17
- **Lines:** 2,561
- **Size:** 85.4 KB

## Largest Files

### By Lines

| Rank | File | Lines |
|------|------|-------|
| 1 | [tests/console_output.txt](tests/console_output.txt) | 4,588 |
| 2 | [css/style.css](css/style.css) | 1,586 |
| 3 | [js/ui.js](js/ui.js) | 1,391 |
| 4 | [js/ai.js](js/ai.js) | 925 |
| 5 | [js/game.js](js/game.js) | 869 |
| 6 | [js/history.js](js/history.js) | 560 |
| 7 | [js/serialization.js](js/serialization.js) | 551 |
| 8 | [CLAUDE.md](CLAUDE.md) | 458 |
| 9 | [REFACTORING.md](REFACTORING.md) | 446 |
| 10 | [TESTING.md](TESTING.md) | 440 |

### By Size

| Rank | File | Size |
|------|------|------|
| 1 | [tests/console_output.txt](tests/console_output.txt) | 216.4 KB |
| 2 | [js/ui.js](js/ui.js) | 45.7 KB |
| 3 | [js/ai.js](js/ai.js) | 34.5 KB |
| 4 | [css/style.css](css/style.css) | 33.0 KB |
| 5 | [js/game.js](js/game.js) | 29.9 KB |
| 6 | [js/serialization.js](js/serialization.js) | 15.0 KB |
| 7 | [js/history.js](js/history.js) | 14.7 KB |
| 8 | [CLAUDE.md](CLAUDE.md) | 13.2 KB |
| 9 | [js/entities/item.js](js/entities/item.js) | 12.7 KB |
| 10 | [REFACTORING.md](REFACTORING.md) | 12.5 KB |

## Project Structure

<pre>
├── **.claude/**
│   ├── **agents/**
│   │   └── [playwright-test-runner.md](.claude/agents/playwright-test-runner.md) _(8.6 KB)_
│   └── [settings.local.json](.claude/settings.local.json) _(648 B)_
├── **css/**
│   └── [style.css](css/style.css) _(33.0 KB)_
├── **js/**
│   ├── **config/**
│   │   └── [blocks.js](js/config/blocks.js) _(3.3 KB)_
│   ├── **entities/**
│   │   ├── [bomb.js](js/entities/bomb.js) _(9.5 KB)_
│   │   ├── [explosion.js](js/entities/explosion.js) _(11.1 KB)_
│   │   ├── [item.js](js/entities/item.js) _(12.7 KB)_
│   │   └── [player.js](js/entities/player.js) _(8.0 KB)_
│   ├── **testing/**
│   │   ├── [mock-llm.js](js/testing/mock-llm.js) _(12.1 KB)_
│   │   └── [seed-finder.js](js/testing/seed-finder.js) _(11.2 KB)_
│   ├── [actions.js](js/actions.js) _(9.0 KB)_
│   ├── [ai.js](js/ai.js) _(34.5 KB)_
│   ├── [drag-drop.js](js/drag-drop.js) _(6.7 KB)_
│   ├── [game.js](js/game.js) _(29.9 KB)_
│   ├── [history.js](js/history.js) _(14.7 KB)_
│   ├── [npc-characters.js](js/npc-characters.js) _(3.2 KB)_
│   ├── [player.js](js/player.js) _(3.1 KB)_
│   ├── [rng.js](js/rng.js) _(6.0 KB)_
│   ├── [serialization.js](js/serialization.js) _(15.0 KB)_
│   ├── [state.js](js/state.js) _(11.7 KB)_
│   └── [ui.js](js/ui.js) _(45.7 KB)_
├── **scripts/**
├── **tests/**
│   ├── **fixtures/**
│   ├── [.env](tests/.env) _(249 B)_
│   ├── [.env.example](tests/.env.example) _(224 B)_
│   ├── [captured_prompts_20251002_202151.txt](tests/captured_prompts_20251002_202151.txt) _(927 B)_
│   ├── [console_output.txt](tests/console_output.txt) _(216.4 KB)_
│   ├── [debug_ai_decisions.py](tests/debug_ai_decisions.py) _(7.3 KB)_
│   ├── [generate_fixtures.py](tests/generate_fixtures.py) _(4.9 KB)_
│   ├── [helpers.py](tests/helpers.py) _(6.9 KB)_
│   ├── [quick_test.py](tests/quick_test.py) _(1.8 KB)_
│   ├── [test_bomb_throw.py](tests/test_bomb_throw.py) _(11.3 KB)_
│   ├── [test_game_mechanics.py](tests/test_game_mechanics.py) _(6.5 KB)_
│   ├── [test_gameplay.py](tests/test_gameplay.py) _(5.6 KB)_
│   ├── [test_mock_gameplay.py](tests/test_mock_gameplay.py) _(10.0 KB)_
│   ├── [test_mock_llm.py](tests/test_mock_llm.py) _(3.8 KB)_
│   ├── [test_prompt_analysis.py](tests/test_prompt_analysis.py) _(10.6 KB)_
│   ├── [test_seeded_world.py](tests/test_seeded_world.py) _(2.2 KB)_
│   └── [test_simple_prompt_capture.py](tests/test_simple_prompt_capture.py) _(5.5 KB)_
├── **videos/**
├── [BLOCK_CUSTOMIZATION.md](BLOCK_CUSTOMIZATION.md) _(7.6 KB)_
├── [CLAUDE.md](CLAUDE.md) _(13.2 KB)_
├── [debug_game.py](debug_game.py) _(5.1 KB)_
├── [DEBUG.md](DEBUG.md) _(4.1 KB)_
├── [demo.html](demo.html) _(4.7 KB)_
├── [favicon.svg](favicon.svg) _(3.6 KB)_
├── [index.html](index.html) _(7.4 KB)_
├── [QUICKSTART_TESTING.md](QUICKSTART_TESTING.md) _(5.2 KB)_
├── [README.md](README.md) _(11.2 KB)_
├── [REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md) _(8.0 KB)_
├── [REFACTORING.md](REFACTORING.md) _(12.5 KB)_
├── [requirements.txt](requirements.txt) _(19 B)_
├── [run_tests.sh](run_tests.sh) _(2.7 KB)_
└── [TESTING.md](TESTING.md) _(10.8 KB)_
</pre>
