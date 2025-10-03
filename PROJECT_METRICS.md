# Project Metrics

**Generated:** 2025-10-03

> **Note:** This report excludes non-code files including:
> - Dependencies (.venv, node_modules)
> - Media files (.mp4, .jpg, .png, etc.)
> - Binary/compiled files (.pyc, .so, .dll, etc.)
> - Lock files (package-lock.json, etc.)
> - System files (.DS_Store, .git, __pycache__, etc.)

## Overview

| Metric | Value |
|--------|-------|
| Total Files | 48 |
| Total Lines | 13,245 |
| Code Lines | 9,263 |
| Comment Lines | 2,006 |
| Blank Lines | 1,976 |
| Total Size | 395.4 KB |
| Avg Lines/File | 276 |
| Avg Size/File | 8.2 KB |
| Comment Ratio | 21.7% |

## File Types

| Extension | Files | Lines | Size |
|-----------|-------|-------|------|
| .js | 23 | 7,800 | 231.6 KB |
| .py | 15 | 3,054 | 102.2 KB |
| .css | 1 | 1,586 | 33.0 KB |
| .html | 4 | 598 | 21.2 KB |
| .svg | 1 | 96 | 3.6 KB |
| .sh | 1 | 72 | 2.7 KB |
| .json | 1 | 28 | 696 B |
| .example | 1 | 9 | 224 B |
| (none) | 1 | 2 | 249 B |

## Categories

### Source

- **Files:** 23
- **Lines:** 7,800
- **Size:** 231.6 KB

### Styles

- **Files:** 1
- **Lines:** 1,586
- **Size:** 33.0 KB

### Markup

- **Files:** 5
- **Lines:** 694
- **Size:** 24.8 KB

### Config

- **Files:** 19
- **Lines:** 3,165
- **Size:** 106.0 KB

## Largest Files

### By Lines

| Rank | File | Lines |
|------|------|-------|
| 1 | [css/style.css](css/style.css) | 1,586 |
| 2 | [js/games/bombervibe/BombervibeGame.js](js/games/bombervibe/BombervibeGame.js) | 918 |
| 3 | [js/engine/ReplaySystem.js](js/engine/ReplaySystem.js) | 560 |
| 4 | [js/engine/Serialization.js](js/engine/Serialization.js) | 551 |
| 5 | [js/games/bombervibe/BombervibeRenderer.js](js/games/bombervibe/BombervibeRenderer.js) | 427 |
| 6 | [js/entities/item.js](js/entities/item.js) | 421 |
| 7 | [js/engine/StateManager.js](js/engine/StateManager.js) | 403 |
| 8 | [js/testing/mock-llm.js](js/testing/mock-llm.js) | 381 |
| 9 | [js/entities/explosion.js](js/entities/explosion.js) | 374 |
| 10 | [js/engine/ActionSystem.js](js/engine/ActionSystem.js) | 361 |

### By Size

| Rank | File | Size |
|------|------|------|
| 1 | [css/style.css](css/style.css) | 33.0 KB |
| 2 | [js/games/bombervibe/BombervibeGame.js](js/games/bombervibe/BombervibeGame.js) | 31.1 KB |
| 3 | [js/engine/Serialization.js](js/engine/Serialization.js) | 15.0 KB |
| 4 | [js/engine/ReplaySystem.js](js/engine/ReplaySystem.js) | 14.7 KB |
| 5 | [js/games/bombervibe/BombervibeRenderer.js](js/games/bombervibe/BombervibeRenderer.js) | 14.5 KB |
| 6 | [js/entities/item.js](js/entities/item.js) | 12.7 KB |
| 7 | [js/testing/mock-llm.js](js/testing/mock-llm.js) | 12.1 KB |
| 8 | [js/engine/StateManager.js](js/engine/StateManager.js) | 11.7 KB |
| 9 | [tests/test_bomb_throw.py](tests/test_bomb_throw.py) | 11.3 KB |
| 10 | [js/testing/seed-finder.js](js/testing/seed-finder.js) | 11.2 KB |

## Project Structure

<pre>
├── **.claude/**
│   ├── **agents/**
│   └── [settings.local.json](.claude/settings.local.json) _(696 B)_
├── **css/**
│   └── [style.css](css/style.css) _(33.0 KB)_
├── **js/**
│   ├── **config/**
│   │   └── [blocks.js](js/config/blocks.js) _(3.3 KB)_
│   ├── **engine/**
│   │   ├── [ActionSystem.js](js/engine/ActionSystem.js) _(9.0 KB)_
│   │   ├── [GameEngine.js](js/engine/GameEngine.js) _(9.0 KB)_
│   │   ├── [LLMAdapter.js](js/engine/LLMAdapter.js) _(10.4 KB)_
│   │   ├── [ReplaySystem.js](js/engine/ReplaySystem.js) _(14.7 KB)_
│   │   ├── [Serialization.js](js/engine/Serialization.js) _(15.0 KB)_
│   │   ├── [StateManager.js](js/engine/StateManager.js) _(11.7 KB)_
│   │   └── [UIRenderer.js](js/engine/UIRenderer.js) _(6.4 KB)_
│   ├── **entities/**
│   │   ├── [bomb.js](js/entities/bomb.js) _(9.5 KB)_
│   │   ├── [explosion.js](js/entities/explosion.js) _(11.1 KB)_
│   │   ├── [item.js](js/entities/item.js) _(12.7 KB)_
│   │   └── [player.js](js/entities/player.js) _(8.0 KB)_
│   ├── **games/**
│   │   └── **bombervibe/**
│   │       ├── [BombervibeGame.js](js/games/bombervibe/BombervibeGame.js) _(31.1 KB)_
│   │       ├── [BombervibePlayer.js](js/games/bombervibe/BombervibePlayer.js) _(3.1 KB)_
│   │       ├── [BombervibePrompts.js](js/games/bombervibe/BombervibePrompts.js) _(9.5 KB)_
│   │       ├── [BombervibeRenderer.js](js/games/bombervibe/BombervibeRenderer.js) _(14.5 KB)_
│   │       └── [config.js](js/games/bombervibe/config.js) _(3.4 KB)_
│   ├── **testing/**
│   │   ├── [mock-llm.js](js/testing/mock-llm.js) _(12.1 KB)_
│   │   └── [seed-finder.js](js/testing/seed-finder.js) _(11.2 KB)_
│   ├── [drag-drop.js](js/drag-drop.js) _(6.7 KB)_
│   ├── [npc-characters.js](js/npc-characters.js) _(3.2 KB)_
│   ├── [rng.js](js/rng.js) _(6.0 KB)_
│   └── [ui-init.js](js/ui-init.js) _(10.0 KB)_
├── **scripts/**
├── **tests/**
│   ├── **fixtures/**
│   ├── [.env](tests/.env) _(249 B)_
│   ├── [.env.example](tests/.env.example) _(224 B)_
│   ├── [debug_ai_decisions.py](tests/debug_ai_decisions.py) _(7.3 KB)_
│   ├── [generate_fixtures.py](tests/generate_fixtures.py) _(4.9 KB)_
│   ├── [helpers.py](tests/helpers.py) _(6.9 KB)_
│   ├── [index-new.html](tests/index-new.html) _(6.5 KB)_
│   ├── [quick_test.py](tests/quick_test.py) _(1.8 KB)_
│   ├── [test_bomb_throw.py](tests/test_bomb_throw.py) _(11.3 KB)_
│   ├── [test_bombervibe_game.py](tests/test_bombervibe_game.py) _(9.6 KB)_
│   ├── [test_bombervibe_simple.html](tests/test_bombervibe_simple.html) _(2.1 KB)_
│   ├── [test_game_mechanics.py](tests/test_game_mechanics.py) _(6.5 KB)_
│   ├── [test_gameplay.py](tests/test_gameplay.py) _(5.6 KB)_
│   ├── [test_migration_baseline.py](tests/test_migration_baseline.py) _(10.9 KB)_
│   ├── [test_mock_gameplay.py](tests/test_mock_gameplay.py) _(10.0 KB)_
│   ├── [test_mock_llm.py](tests/test_mock_llm.py) _(3.8 KB)_
│   ├── [test_prompt_analysis.py](tests/test_prompt_analysis.py) _(10.6 KB)_
│   ├── [test_seeded_world.py](tests/test_seeded_world.py) _(2.2 KB)_
│   └── [test_simple_prompt_capture.py](tests/test_simple_prompt_capture.py) _(5.5 KB)_
├── **videos/**
├── [debug_game.py](debug_game.py) _(5.1 KB)_
├── [demo.html](demo.html) _(4.7 KB)_
├── [favicon.svg](favicon.svg) _(3.6 KB)_
├── [index.html](index.html) _(8.0 KB)_
└── [run_tests.sh](run_tests.sh) _(2.7 KB)_
</pre>
