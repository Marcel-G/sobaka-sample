# Position Tracking System

## Overview

This system efficiently tracks and updates the positions of modules and plugs (connection points) in the workspace. Wire paths are recalculated whenever modules move or change size, ensuring wires always connect to the correct points.

## Key Components

### 1. `positionObserver.ts` - DOM Observer System

Uses native browser APIs to detect position/size changes:

- **ResizeObserver**: Detects when modules resize OR move (ResizeObserver fires for both!)
- **MutationObserver**: Detects style/class changes that might affect position
- **Throttling**: Updates are throttled to ~60fps (16ms) to prevent expensive recalculations

**Key Features:**
- Automatic cleanup when elements are unregistered
- Force update capability for immediate position sync
- Batched updates in requestAnimationFrame for efficiency

### 2. `positions.ts` - Position Store

Manages the position state for all modules and plugs:

- Integrates with the PositionObserver
- Maintains Maps of plug and module positions
- Automatically updates child plugs when parent modules move
- Exposes reactive Svelte stores for wire calculations

**Position Update Flow:**
```
DOM Change (drag/resize) 
  → Observer detects change
  → Throttled callback scheduled
  → Position calculated relative to workspace
  → Store updated
  → Wire paths recalculated (via Svelte reactivity)
```

### 3. Integration Points

#### Module Registration (`ModuleWrapper.svelte`)
```typescript
const handleRegisterElement = (element: HTMLElement) => {
  positions.registerModule(module.id, element)
}
```

#### Plug Registration (`Plug.svelte`)
```typescript
$effect(() => {
  if (registerElement && element) {
    requestAnimationFrame(() => {
      registerElement(ctx.name, element)
    })
  }
})
```

#### Wire Calculation (`Wires.svelte`)
```typescript
const paths = derived(
  throttled(
    derived([activeLink, links, plugPositions, modulePositions], stores => stores)
  ),
  ([activeLink, links, plugs, modules]) =>
    linker([...activeLink, ...links], plugs, modules)
)
```

## Performance Considerations

### Throttling Strategy

The system uses a 16ms throttle (approximately 60fps) to balance:
- **Responsiveness**: Wires update smoothly during drag operations
- **Performance**: Expensive A* pathfinding is limited to 60 calculations/second
- **CPU Usage**: Prevents browser lag on slower devices

**Tuning the throttle:**
Edit `THROTTLE_MS` in `positionObserver.ts`:
- Increase (e.g., 32ms) for better performance on slower devices
- Decrease (e.g., 8ms) for smoother updates on high-end devices

### Cascade Updates

When a module moves, all its plugs are updated automatically:
```typescript
// When a module moves, also update all its plug positions
const plugs = Array.from(plugElements.entries()).filter(([key]) => {
  const linkPoint = keyToLinkPoint(key)
  return linkPoint.moduleId === moduleId
})

for (const [key, plugElement] of plugs) {
  const linkPoint = keyToLinkPoint(key)
  updatePlugPosition(linkPoint, plugElement)
}
```

This ensures wires stay connected even when modules are being dragged.

## Special Cases

### Fixed Position Modules (e.g., Output Mixer)

The output mixer is positioned with `position: fixed` in CSS, which creates a unique challenge:
- Fixed elements stay in place relative to the **viewport**, not the workspace
- When the workspace scrolls, fixed elements appear to move relative to the workspace
- Wire endpoints need to be recalculated when scroll position changes

**Solution:**
1. Observer tracks the workspace scroll container and window resize events
2. When scroll or resize occurs, **all** positions are recalculated (throttled to 60fps)
3. Position calculations use `getBoundingClientRect()` which accounts for viewport position
4. This ensures wires connect correctly even as the workspace scrolls

**Event Flow:**
```
User scrolls workspace
  → scrollHandler triggered (throttled)
  → scheduleUpdateAll() called
  → All plug and module positions recalculated
  → Wire paths updated
  → Wires stay connected to fixed mixer
```

### Grid-Based Positioning

Modules are positioned on a CSS grid. Position changes happen via:
- CSS `grid-column` and `grid-row` style changes
- The MutationObserver detects these style attribute changes
- ResizeObserver also fires when grid position changes cause movement

## Testing

Run the test suite:
```bash
npm test apps/web/src/context/positionObserver.test.ts
```

Tests cover:
- Initial observation and callback
- Duplicate observation prevention
- Unobserve cleanup
- Throttling behavior
- Force updates
- Observer destruction

## Troubleshooting

### Wires not updating during drag

**Check:**
1. Is the module element registered with `positions.registerModule()`?
2. Is the Panel component calling `registerElement` in its `$effect`?
3. Check browser console for errors from the observers

### Performance issues

**Try:**
1. Increase `THROTTLE_MS` in `positionObserver.ts`
2. Reduce `GRID_STEP` in `linker.ts` for simpler paths
3. Check if too many observers are registered (use Chrome DevTools)

### Memory leaks

**Ensure:**
1. `positions.destroy()` is called when workspace unmounts (in `Workspace.svelte`)
2. Individual modules call `positions.removeModule()` on unmount
3. Plugs call `positions.removePlug()` on unmount

## Future Improvements

Potential optimizations:
1. **Dirty tracking**: Only recalculate paths for wires connected to moved modules
2. **Web Workers**: Move A* pathfinding to a worker thread
3. **Spatial indexing**: Use quadtree for faster obstacle detection
4. **Incremental updates**: Adjust existing paths rather than full recalculation
