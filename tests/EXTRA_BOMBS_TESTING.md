# Extra Bombs Loot Feature - Testing Guide

## Overview

Comprehensive test suite for validating the `extra_bomb` loot feature, which allows players to place multiple bombs simultaneously.

## Quick Start - URL Parameter Testing

The fastest way to test extra bombs is using URL parameters:

```bash
# Run the test script (opens browser with extra_bomb next to P1)
./test_loot_url.sh
```

### Manual URL Testing

```bash
# Basic: Extra bomb for Player 1
file://$(pwd)/index.html#YOUR_API_KEY&extrabomb_player1=true

# With round limit
file://$(pwd)/index.html#YOUR_API_KEY&extrabomb_player1=true&maxRounds=10

# Multiple loot types
file://$(pwd)/index.html#YOUR_API_KEY&extrabomb_player1=true&flashradius_player2=true

# All players get loot
file://$(pwd)/index.html#YOUR_API_KEY&extrabomb_player1=true&extrabomb_player2=true&extrabomb_player3=true&extrabomb_player4=true
```

## URL Parameters Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `extrabomb_player1=true` | Place extra_bomb next to Player 1 | Increases maxBombs from 1→2 |
| `flashradius_player2=true` | Place flash_radius next to Player 2 | Increases bomb range |
| `bombpickup_player3=true` | Place bomb_pickup next to Player 3 | Enables pickup/throw |
| `maxRounds=10` | Auto-stop after 10 rounds | Prevents infinite games |

## Automated Test Suite

Comprehensive Playwright test suite with 7 scenarios:

```bash
# Run full test suite
source .venv/bin/activate
python tests/test_extra_bombs_loot.py
```

### Test Scenarios

1. **Basic Extra Bomb Pickup** - Player picks up extra_bomb, places 2 bombs simultaneously
2. **Multiple Pickups** - Player picks up 2 extra_bombs → maxBombs: 1→2→3
3. **Bomb Limit Enforcement** - Verify placement blocked when at limit
4. **Extra + Flash Combo** - Test interaction with flash_radius power-up
5. **Safe Escape** - Player navigates to safety after placing 2 bombs
6. **Chain Reaction** - Multiple player bombs trigger cascade
7. **Advanced Combo** - Test extra_bomb + bomb_pickup interaction

### Expected Test Output

```
======================================================================
TEST 1: Basic Extra Bomb Pickup & Simultaneous Placement
======================================================================

🌐 Loading game for: Test 1: Basic Extra Bomb
💎 Setting up initial loot: [{'type': 'extra_bomb', 'x': 1, 'y': 0}]
▶️  Starting game...

[MOCK] R1 P1: right bomb:False - Moving to extra_bomb loot at B11
[P1] Picked up Extra Bomb! Max bombs now: 2
[R2] P1 💣 BOMB at (1,0)
[R3] P1 💣 BOMB at (2,0)
[EXPLODE] 💥 bomb1_... activeBombs: 2 → 1

======================================================================
VALIDATION
======================================================================
✅ Extra bomb pickup detected: [P1] Picked up Extra Bomb! Max bombs now: 2
✅ P1 placed 2 bombs:
   [R2] P1: RIGHT +BOMB (1,0)->(2,0)
   [R3] P1: RIGHT +BOMB (2,0)->(3,0)
✅ P1 had 2 active bombs simultaneously
✅ 2 explosions detected

======================================================================
✅ TEST 1 PASSED!
======================================================================
```

## What to Look For

### Console Logs

Key console messages to verify:

- ✅ `Picked up Extra Bomb! Max bombs now: N`
- ✅ `[P1] activeBombs: X → Y` (tracking bomb count)
- ✅ `[RX] P1: DIRECTION +BOMB` (bomb placement)
- ✅ `[EXPLODE] 💥 bombX_...` (explosions)
- ❌ `activeBombs >= maxBombs` (blocked placement)

### Visual Indicators

- 💣 emoji appears next to player at loot location
- Multiple bomb emojis visible on grid (when 2+ bombs placed)
- Bombs show countdown timer (4→3→2→1→EXPLODE)
- Explosions appear as 💥 with blast radius

### Game State

Check these values in browser console:

```javascript
// Get Player 1 state
game.players[0].maxBombs       // Should be 2 after pickup
game.players[0].activeBombs    // Current active bombs (0-2)
game.bombs.length              // Total bombs on grid

// Check loot
game.loot  // Array of loot items
```

## Common Issues

### Loot Not Appearing

**Problem:** Loot doesn't show on grid  
**Solution:** Check that position is valid (not on hard block)

```javascript
// Debug in console
console.log(game.loot);
console.log(game.grid[0][1]);  // Cell at (1,0)
```

### Bomb Placement Blocked

**Problem:** Second bomb won't place  
**Solution:** Check activeBombs vs maxBombs

```javascript
// Debug
console.log(`Active: ${game.players[0].activeBombs}, Max: ${game.players[0].maxBombs}`);
```

### Test Timeout

**Problem:** Test runs forever  
**Solution:** Always use `maxRounds` parameter

```bash
# Add round limit to URL
&maxRounds=10
```

## Implementation Details

### Player Class

```javascript
class Player {
    maxBombs = 1;        // Starts at 1
    activeBombs = 0;     // Current bombs on grid
    
    pickupLoot(lootType) {
        if (lootType === 'extra_bomb') {
            this.maxBombs += 1;  // Increment max
        }
    }
    
    placeBomb(grid, bombs) {
        // Check limit
        if (this.activeBombs >= this.maxBombs) {
            return false;  // Blocked
        }
        this.activeBombs++;
        // ... place bomb
    }
}
```

### Bomb Explosion

```javascript
explodeBomb(bomb) {
    // Decrement active count
    player.activeBombs = Math.max(0, player.activeBombs - 1);
    
    // Player can now place another bomb if below maxBombs
}
```

## Future Enhancements

- [ ] Test bomb placement patterns (grid formations)
- [ ] Test all 4 players with extra bombs simultaneously
- [ ] Test edge case: 5+ bombs with multiple pickups
- [ ] Test interaction with bomb throw mechanics
- [ ] Performance test: 10+ bombs exploding in chain reaction

## Resources

- Main test suite: [tests/test_extra_bombs_loot.py](test_extra_bombs_loot.py)
- Player class: [js/games/bombervibe/BombervibePlayer.js](../js/games/bombervibe/BombervibePlayer.js)
- Game logic: [js/games/bombervibe/BombervibeGame.js](../js/games/bombervibe/BombervibeGame.js)
- Configuration: [js/games/bombervibe/config.js](../js/games/bombervibe/config.js)
