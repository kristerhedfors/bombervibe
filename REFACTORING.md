# Electric Boogaloo - Architecture Refactoring Documentation

## Overview

This document describes the architectural refactoring performed to enable upcoming features like **playback/replay**, **continue from position**, and **loot/powerup system** without changing existing game functionality.

## Refactoring Goals

✅ **Immutable State Management** - Enable time-travel and replay
✅ **Event Sourcing** - Record all game changes as actions
✅ **Entity System** - Decouple game objects from grid
✅ **History Tracking** - Store complete game timeline
✅ **Serialization** - Save/load any game position
✅ **Foundation for Items** - Ready to add loot system

## Architecture Changes

### Before (Legacy)
```
Game.js ───┬──> Player.js (mutable state)
           ├──> bombs array (direct mutation)
           └──> grid array (direct mutation)

UI.js ─────> Game.js (tightly coupled)
```

**Problems:**
- State mutations everywhere
- No history tracking
- Cannot replay or rewind
- Hard to serialize state
- Items would need grid value hacks

### After (New Architecture)
```
GameState (immutable) <── Actions ──> Engine (pure functions)
    ↓
History (timeline) <── SerializationManager ──> localStorage
    ↓
UI Layer (observer pattern)
```

**Benefits:**
- All state changes flow through actions
- Complete history for replay
- Easy save/load at any point
- Items are first-class entities
- Can implement time-travel debugging

## New File Structure

```
js/
├── actions.js              # Action types and creators
├── state.js                # Immutable GameState class
├── history.js              # Timeline tracking & replay
├── serialization.js        # Save/load functionality
│
├── entities/               # Pure entity classes
│   ├── player.js          # Player entity (decoupled)
│   ├── bomb.js            # Bomb entity
│   ├── item.js            # Item/loot entity (READY FOR ITEMS!)
│   └── explosion.js       # Explosion visual entity
│
├── game.js                # LEGACY - kept for compatibility
├── player.js              # LEGACY - kept for compatibility
├── ai.js                  # Unchanged (works with both)
└── ui.js                  # Unchanged (currently uses legacy)
```

## Key Classes

### 1. GameState (state.js)
**Immutable snapshot** of complete game state.

```javascript
const state = GameState.createInitial();

// Immutable - returns NEW state
const newState = state.clone({
    entities: {
        ...state.entities,
        players: updatedPlayers
    }
});

// Serialization
const json = state.toJSON();
const restored = GameState.fromJSON(json);
```

**Key Features:**
- Frozen objects (cannot be modified)
- Contains: config, entities (players/bombs/items/explosions), grid, metadata
- Helper methods: `getPlayer()`, `isPassable()`, `isGameOver()`

### 2. Actions (actions.js)
**Immutable action objects** that describe state changes.

```javascript
// Create actions
const moveAction = ActionCreators.playerMove(1, 0, 0, 1, 0, 'right');
const bombAction = ActionCreators.playerPlaceBomb(1, 5, 5, 'bomb1', 10, 1);
const itemAction = ActionCreators.itemSpawn('item1', 'bombRange', 3, 3);

// Actions are records of what happened
action.type      // 'PLAYER_MOVE'
action.payload   // {playerId: 1, fromX: 0, toX: 1, ...}
action.timestamp // Date.now()
action.id        // Unique ID
```

**Action Types:**
- Player: MOVE, PLACE_BOMB, DIE, PICKUP_ITEM
- Bomb: TICK, EXPLODE, CHAIN_REACTION
- Item: SPAWN, DESPAWN, ACTIVATE, EXPIRE
- Game: START, PAUSE, END, NEXT_TURN
- Explosion: CREATE, EXPIRE

### 3. GameHistory (history.js)
**Complete timeline** of game states and actions.

```javascript
const history = new GameHistory();

// Record initial state
history.recordInitial(initialState);

// Record state change
history.record(newState, action);

// Time travel
history.undo();           // Go back one turn
history.redo();           // Go forward
history.jumpToTurn(50);   // Jump to specific turn

// Checkpoints
history.createCheckpoint('before_epic_move');
history.loadCheckpoint('before_epic_move');

// Export for replay
const replayData = history.toReplayData();
```

**Features:**
- Stores up to 10,000 entries
- Named checkpoints
- Jump to any turn instantly
- Export minimal replay format

### 4. SerializationManager (serialization.js)
**Save/load** game state to various formats.

```javascript
const manager = new SerializationManager();

// Save complete session
const data = manager.serializeSession(state, history, {
    playerNames: ['Alice', 'Bob', 'Charlie', 'Diana']
});

// Load session
const {state, history, metadata} = manager.deserializeSession(data);

// Quick save/load
manager.exportToFile(data, 'my_game.json');
const importedData = await manager.importFromFile(file);

// Shareable URLs
const url = manager.createShareableURL(state);
// → https://example.com/#state=eyJzdGF0ZSI6...
```

**Storage Options:**
- JSON file download/upload
- localStorage (auto-save, quick-save, save slots)
- URL fragment (shareable links)
- Compressed format for smaller size

### 5. Entity Classes (entities/*)

#### PlayerEntity
```javascript
const player = new PlayerEntity(1, 0, 0, 'cyan', 'Player 1');
player.alive = true;
player.score = 100;
player.stats.bombRange = 2;  // Can be modified by items!
player.activeItems = [
    {itemType: 'speed', effectValue: 1, expiresOnTurn: 150}
];
```

#### BombEntity
```javascript
const bomb = BombEntity.createStandard('bomb1', 1, 5, 5, currentTurn);
bomb.getTurnsRemaining(currentTurn);  // → 8
bomb.shouldExplode(currentTurn);      // → false
bomb.getExplosionPattern(13, 11);     // → [{x, y}, ...]
```

#### ItemEntity (NEW - Ready for loot system!)
```javascript
const item = ItemHelpers.createRandomItem(3, 3, currentTurn, 1);
// → ItemEntity {type: 'bombRange', rarity: 'common', ...}

item.emoji     // → '💥'
item.effectValue  // → +1 bomb range
item.effectDuration  // → null (permanent)

// Item spawning
if (ItemHelpers.shouldSpawnItem({spawnChance: 0.3, blockType: 1})) {
    const item = ItemHelpers.createRandomItem(x, y, turn, seq);
    // Add to state.entities.items
}
```

**Available Item Types:**
- `speed` - Speed boost (⚡)
- `bombRange` - Increase explosion range (💥)
- `extraBomb` - Place more bombs (💣)
- `invincibility` - Temporary immunity (✨)
- `shield` - Block one hit (🛡️)
- `bombKick` - Kick bombs (👟)
- `wallPass` - Walk through walls (👻)
- `bonusPoints` - Instant points (💎)

#### ExplosionEntity
```javascript
const explosion = ExplosionEntity.fromBomb('exp1', bomb, cells, turn);
explosion.hasExpired(currentTurn, Date.now());
explosion.getIntensity(Date.now());  // → 0.0 to 1.0 (fade in/out)
```

## How to Use New Architecture

### Current Status: DUAL IMPLEMENTATION
The game currently uses the **legacy code** (game.js, player.js). The new architecture is **ready but not connected** to the UI yet.

### To Enable Playback Feature (Future)

```javascript
// 1. Initialize new architecture
const state = GameState.createInitial();
const history = new GameHistory();
history.recordInitial(state);

// 2. When action happens:
const action = ActionCreators.playerMove(1, 0, 0, 1, 0, 'right');
const newState = Engine.applyAction(state, action);  // Engine.js not created yet
history.record(newState, action);

// 3. Replay later:
const replayPlayer = new ReplayPlayer(history);
replayPlayer.play();
replayPlayer.onStateChange = (state) => renderGame(state);
```

### To Enable Save/Load (Future)

```javascript
// Save game
const storage = new LocalStorageManager();
storage.saveSession('slot1', currentState, history, {
    playerNames: ['Alice', 'Bob']
});

// Load game
const {state, history, metadata} = storage.loadSession('slot1');
game.restoreFromState(state);
```

### To Enable Items (Future)

```javascript
// When soft block destroyed:
if (ItemHelpers.shouldSpawnItem({blockType: 1, turnCount})) {
    const item = ItemHelpers.createRandomItem(x, y, turnCount, itemSeq++);

    const action = ActionCreators.itemSpawn(
        item.id,
        item.type,
        x,
        y,
        {rarity: item.rarity, effectDuration: item.effectDuration}
    );

    newState = Engine.applyAction(state, action);
}

// When player moves onto item:
const item = state.getEntityAt(x, y, 'item');
if (item) {
    const pickupAction = ActionCreators.playerPickupItem(
        playerId,
        item.id,
        item.type,
        x,
        y
    );

    newState = Engine.applyAction(state, pickupAction);
}
```

## Migration Path

### Phase 1: Foundation (✅ COMPLETE)
- ✅ Create action system
- ✅ Create immutable state
- ✅ Create entity classes
- ✅ Create history tracking
- ✅ Create serialization

### Phase 2: Engine (TODO)
- [ ] Create `engine.js` - pure functions that apply actions to state
- [ ] Port game logic from `Game.js` to pure functions
- [ ] Implement action handlers (move, bomb, item, etc.)

### Phase 3: Integration (TODO)
- [ ] Refactor `ui.js` to use new architecture
- [ ] Add observer pattern for state changes
- [ ] Keep legacy code as fallback

### Phase 4: Features (TODO)
- [ ] Implement replay UI controls
- [ ] Add save/load menu
- [ ] Enable item spawning
- [ ] Add item pickup logic
- [ ] Create item effect system

## Testing Strategy

### Current State
The new architecture is **passive** - it doesn't affect the running game yet. Both old and new code can coexist:

```javascript
// Legacy game (currently running)
const game = new Game();
game.movePlayer(1, 'right');

// New architecture (available but unused)
const state = GameState.createInitial();
const action = ActionCreators.playerMove(1, 0, 0, 1, 0, 'right');
// Engine.applyAction(state, action) would produce new state
```

### Testing Approach
1. **Parallel Implementation**: New code alongside old
2. **No Breaking Changes**: Legacy code untouched
3. **Gradual Migration**: Feature by feature
4. **Rollback Ready**: Can disable new code anytime

## Performance Considerations

### Memory Usage
- **History**: ~2KB per turn, max 10,000 entries = ~20MB
- **Immutable State**: More memory than mutable, but manageable
- **Optimization**: Can limit history size, compress old entries

### CPU Usage
- **State Cloning**: Fast with Object.assign and frozen objects
- **Action Processing**: Pure functions are fast
- **Serialization**: Only on save/load, not during gameplay

## Future Enhancements Enabled

### ✅ Ready to Implement
1. **Replay System** - Play back recorded games
2. **Save/Load** - Continue from any position
3. **Loot System** - Items spawn after block destruction
4. **Undo/Redo** - Time-travel during gameplay
5. **Spectator Mode** - Watch games live or recorded

### 🔄 Partially Ready
6. **AI Training** - Record games for ML training data
7. **Tournament Mode** - Track multiple games
8. **Analytics** - Analyze player strategies from history

### 📋 Requires Additional Work
9. **Network Multiplayer** - Synchronize state via actions
10. **Competitive Rankings** - Store game outcomes
11. **Custom Game Modes** - Different rules via config

## Code Examples

### Example 1: Simple Replay
```javascript
// Record a game
const history = new GameHistory();
history.recordInitial(GameState.createInitial());

// ... game plays, actions recorded ...

// Replay it
const replayPlayer = new ReplayPlayer(history);
replayPlayer.speed = 2.0;  // 2x speed
replayPlayer.onStateChange = (state) => {
    renderGrid(state);
};
replayPlayer.play();
```

### Example 2: Save/Load
```javascript
// Save at any point
const storage = new LocalStorageManager();
storage.quickSave(currentState);

// Load later
const restored = storage.quickLoad();
if (restored) {
    game.loadState(restored);
}
```

### Example 3: Item Spawn
```javascript
// After destroying soft block
const shouldSpawn = ItemHelpers.shouldSpawnItem({
    spawnChance: 0.3,
    blockType: 1,
    turnCount: game.turnCount
});

if (shouldSpawn) {
    const item = ItemHelpers.createRandomItem(x, y, game.turnCount, itemSeq++);
    // item.type might be 'bombRange', 'speed', 'extraBomb', etc.
    // Add to game state
}
```

## API Reference

See individual files for complete API documentation:
- `actions.js` - 40+ action types
- `state.js` - GameState class with 20+ methods
- `history.js` - Timeline management, checkpoints, replay
- `serialization.js` - JSON export/import, compression
- `entities/*.js` - Entity classes and helpers

## Questions?

This refactoring maintains **100% backward compatibility**. The game currently runs on the old code. New features can be added incrementally by migrating components to the new architecture.

**Next Step**: Create `engine.js` to connect actions → state transformations.
