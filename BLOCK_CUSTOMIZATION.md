# Block Customization Guide

## Overview

The game now uses a centralized block configuration system that makes it easy to customize the appearance of all block types. All block definitions are in **one place**, and visual styling uses CSS variables for quick changes.

## Quick Changes

### Change Soft Block (Brick) Colors

**File**: `css/style.css`

```css
:root {
    /* Change these two variables to recolor soft blocks */
    --soft-brick-color: #888;      /* Main brick color (currently grey) */
    --soft-mortar-color: #aaa;     /* Mortar/grout color (currently light grey) */
}
```

**Examples:**

```css
/* Red bricks with white mortar */
--soft-brick-color: #8B4513;
--soft-mortar-color: #F5F5DC;

/* Dark green bricks (forest theme) */
--soft-brick-color: #2d5016;
--soft-mortar-color: #3a6b1e;

/* Purple cyber bricks */
--soft-brick-color: #663399;
--soft-mortar-color: #9966CC;
```

### Change Hard Block (Stone) Colors

**File**: `css/style.css`

```css
:root {
    /* Change these three variables to recolor hard blocks */
    --hard-stone-color: #808080;      /* Main stone color */
    --hard-border-light: #b0b0b0;     /* Light edge (top-left) */
    --hard-border-dark: #404040;      /* Dark edge (bottom-right) */
}
```

**Examples:**

```css
/* Blue metal blocks */
--hard-stone-color: #4A5568;
--hard-border-light: #718096;
--hard-border-dark: #2D3748;

/* Gold blocks */
--hard-stone-color: #D4AF37;
--hard-border-light: #FFD700;
--hard-border-dark: #B8860B;
```

### Change Empty Tile Color

**File**: `css/style.css`

```css
:root {
    --empty-color: #2a4a2a;  /* Currently dark green grass */
}
```

**Examples:**

```css
/* Sandy desert */
--empty-color: #C2B280;

/* Dark void */
--empty-color: #1a1a1a;

/* Ice/snow */
--empty-color: #E0F2F7;
```

## Advanced Customization

### Block Configuration Reference

**File**: `js/config/blocks.js`

All block properties are defined here:

```javascript
const BLOCK_TYPES = {
    EMPTY: {
        id: 0,                    // Cell type ID in grid
        name: 'empty',            // Internal name
        className: 'empty',       // CSS class name
        color: '#2a4a2a',        // Base color
        destructible: false,      // Can be destroyed by bombs?
        walkable: true,           // Can players walk on it?
        scoreValue: 0             // Points for destroying
    },
    SOFT: {
        id: 1,
        name: 'soft-block',
        className: 'soft-block',
        brickColor: '#888',
        mortarColor: '#aaa',
        destructible: true,
        walkable: false,
        scoreValue: 10            // +10 points when destroyed
    },
    HARD: {
        id: 2,
        name: 'hard-block',
        className: 'hard-block',
        color: '#808080',
        destructible: false,
        walkable: false,
        scoreValue: 0
    }
};
```

### Helper Functions

Use these functions to query block properties:

```javascript
// Get full configuration for a cell type
const config = BlockUtils.getBlockConfig(cellType);

// Check if block can be destroyed
if (BlockUtils.isDestructible(cellType)) {
    // Award points
    const points = BlockUtils.getScoreValue(cellType);
}

// Check if player can walk through
if (BlockUtils.isWalkable(cellType)) {
    // Allow movement
}

// Get CSS class name
const className = BlockUtils.getClassName(cellType);
```

### Change Brick Pattern

**File**: `css/style.css`

The soft block uses a grid pattern with horizontal and vertical mortar lines:

```css
.cell.soft-block {
    background-color: var(--soft-brick-color);  /* Base brick color */
    background-image:
        /* Horizontal mortar lines (rows) */
        repeating-linear-gradient(
            0deg,
            transparent,
            transparent 32%,
            var(--soft-mortar-color) 32%,
            var(--soft-mortar-color) 34%,
            transparent 34%
        ),
        /* Vertical mortar lines (columns) */
        repeating-linear-gradient(
            90deg,
            transparent,
            transparent 32%,
            var(--soft-mortar-color) 32%,
            var(--soft-mortar-color) 34%,
            transparent 34%
        );
    background-size: 100% 100%, 33.33% 100%;
}
```

**How it works:**
- `background-color` = solid brick color base
- Two `transparent` gradients overlay mortar lines
- `32%-34%` controls mortar line thickness (2% wide)
- `background-size: 100% 100%, 33.33% 100%` creates 3 bricks per row

**Example - Thicker mortar lines:**

```css
/* Change from 32%-34% to 30%-36% for thicker mortar */
repeating-linear-gradient(
    0deg,
    transparent,
    transparent 30%,
    var(--soft-mortar-color) 30%,
    var(--soft-mortar-color) 36%,
    transparent 36%
)
```

**Example - 4 bricks per row instead of 3:**

```css
background-size: 100% 100%, 25% 100%;  /* Change 33.33% to 25% */
```

### Use Emoji Instead of Patterns

Replace gradient backgrounds with emojis:

**File**: `js/config/blocks.js`

```javascript
SOFT: {
    ...
    emoji: '🧱',  // Set emoji here
    ...
}
```

**File**: `css/style.css`

```css
.cell.soft-block::after {
    content: '🧱';  /* Use emoji from config */
    font-size: inherit;
}
```

## Adding New Block Types

1. **Add configuration** in `js/config/blocks.js`:

```javascript
const BLOCK_TYPES = {
    ...existing types...,
    ICE: {
        id: 3,
        name: 'ice-block',
        className: 'ice-block',
        color: '#E0F2F7',
        destructible: false,
        walkable: true,  // Slippery!
        scoreValue: 0
    }
};
```

2. **Add CSS styling** in `css/style.css`:

```css
.cell.ice-block {
    background: linear-gradient(135deg, #E0F2F7 25%, #B3E5FC 25%, #B3E5FC 50%, #E0F2F7 50%, #E0F2F7 75%, #B3E5FC 75%, #B3E5FC);
    background-size: 20px 20px;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.8);
}
```

3. **Use in game logic** - reference by `BLOCK_TYPES.ICE.id`

## Complete Theme Examples

### Desert Theme

```css
:root {
    --empty-color: #C2B280;           /* Sand */
    --soft-brick-color: #8B4513;      /* Adobe bricks */
    --soft-mortar-color: #DEB887;     /* Light sand mortar */
    --hard-stone-color: #696969;      /* Dark stone */
    --hard-border-light: #A9A9A9;
    --hard-border-dark: #2F4F4F;
}
```

### Ice/Winter Theme

```css
:root {
    --empty-color: #E0F2F7;           /* Snow/ice */
    --soft-brick-color: #87CEEB;      /* Ice blocks */
    --soft-mortar-color: #B0E0E6;     /* Frost */
    --hard-stone-color: #4682B4;      /* Frozen stone */
    --hard-border-light: #87CEFA;
    --hard-border-dark: #4169E1;
}
```

### Neon/Cyber Theme

```css
:root {
    --empty-color: #0a0a0a;           /* Dark void */
    --soft-brick-color: #663399;      /* Purple blocks */
    --soft-mortar-color: #9966CC;     /* Light purple */
    --hard-stone-color: #FF00FF;      /* Magenta */
    --hard-border-light: #FF69B4;
    --hard-border-dark: #8B008B;
}
```

## Architecture Benefits

✅ **Single source of truth** - All block properties in `blocks.js`
✅ **CSS variables** - Change colors without editing gradients
✅ **Type safety** - Use `BLOCK_TYPES.SOFT.id` instead of magic number `1`
✅ **Helper functions** - Query block properties easily
✅ **Extensible** - Add new block types without touching game logic
✅ **Maintainable** - Clear separation between data and presentation

## Files Modified

- **NEW**: `js/config/blocks.js` - Block configuration and helper functions
- **UPDATED**: `css/style.css` - Uses CSS variables for all block colors
- **UPDATED**: `js/ui.js` - Uses `BlockUtils` for rendering
- **UPDATED**: `js/game.js` - Uses `BLOCK_TYPES` constants instead of magic numbers
- **UPDATED**: `index.html` - Includes `blocks.js` script

---

**Questions?** See [CLAUDE.md](CLAUDE.md) for full project documentation.
