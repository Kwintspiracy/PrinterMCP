# Vercel Deployment Fixes

## Issues Fixed

### 1. "Cannot read properties of undefined (reading 'inkLevels')"
**Root Cause**: Race conditions in Vercel's serverless environment where multiple API calls could create separate printer instances that weren't synchronized.

**Solution**: 
- Added `await printer.reloadState()` to all API endpoints before processing requests
- Ensures fresh state is loaded from Vercel KV storage on every request
- Prevents stale cached data from causing undefined property errors

### 2. Ink Level Always Showing 100%
**Root Cause**: The `/api/set-ink/[color].ts` endpoint was only calling `printer.refillInk()` which always sets ink to 100%, regardless of the desired level.

**Solution**:
- Completely rewrote the endpoint to read the `level` parameter from request body
- Directly manipulates Vercel KV state instead of going through printer instance
- Validates level is between 0-100
- Properly saves the custom level to storage

## Changes Made

### Modified Files

1. **`api/set-ink/[color].ts`**
   - Removed printer instance dependency
   - Added direct StateManager manipulation
   - Added proper validation for `level` parameter
   - Ensures `inkLevels` object exists before updating

2. **`api/status.ts`**
   - Added `await printer.reloadState()` before getting status
   - Enhanced error handling with fallback default status

3. **`api/control.ts`**
   - Added `await printer.reloadState()` before control operations

4. **`api/print.ts`**
   - Added `await printer.reloadState()` before print operations

5. **`api/stream.ts`**
   - Added `await printer.reloadState()` in initial load
   - Added `await printer.reloadState()` in SSE update interval for real-time accuracy

6. **`api/statistics.ts`**
   - Added `await printer.reloadState()` before getting statistics

7. **`api/logs.ts`**
   - Added `await printer.reloadState()` before getting logs

## How It Works

### State Synchronization Pattern

```typescript
async function getPrinter() {
  if (!printerInstance) {
    const stateManager = new StateManager();
    printerInstance = new VirtualPrinter(stateManager);
  }
  // Always reload state from storage to get latest updates
  await printerInstance.reloadState();
  return printerInstance;
}
```

This pattern ensures:
1. Printer instance is created once and cached (for efficiency)
2. State is always reloaded from Vercel KV before each operation (for consistency)
3. Multiple concurrent requests see the latest state

### Direct State Manipulation for Critical Operations

For the ink level setting, we bypass the printer instance entirely:

```typescript
// Directly manipulate state to avoid race conditions
const stateManager = new StateManager();
const state = await stateManager.loadState();

// Ensure inkLevels exists
if (!state.inkLevels) {
  state.inkLevels = { cyan: 100, magenta: 100, yellow: 100, black: 100 };
}

// Update the specific color
state.inkLevels[color] = levelNum;
state.lastUpdated = Date.now();

// Save state back to storage
await stateManager.saveState(state);
```

This approach:
- Reads the current state
- Modifies only what needs to change
- Saves immediately
- Avoids any caching issues

## Testing

After deploying these changes to Vercel:

1. **Test Ink Level Setting**:
   - Set cyan ink to 50% → Should show 50%
   - Set magenta to 25% → Should show 25%
   - Refresh the page → Values should persist
   - Set multiple colors rapidly → All should update correctly

2. **Test State Persistence**:
   - Make changes (print jobs, ink levels, paper)
   - Refresh the page
   - All changes should be preserved

3. **Test Concurrent Operations**:
   - Open multiple tabs
   - Make changes in different tabs
   - All tabs should show synchronized state

## Vercel KV Configuration

Ensure these environment variables are set in Vercel:

```bash
STORAGE_TYPE=vercel-kv
KV_REST_API_URL=your-kv-url
KV_REST_API_TOKEN=your-kv-token
```

The StateManager automatically detects the Vercel environment and uses KV storage when deployed.

## Performance Considerations

- Each API call reloads state (small overhead but necessary for consistency)
- Vercel KV is fast (Redis-based), so overhead is minimal (<10ms typically)
- Printer instance caching reduces initialization overhead
- State is only saved when modifications are made

## Rollback

If issues occur, you can temporarily switch to file-based storage:

```bash
# In Vercel environment variables
STORAGE_TYPE=file
```

Note: File storage won't persist in serverless environment but can help diagnose issues.
