# Vercel API Endpoints Fix

## Problem
Only 2 API endpoints were working on Vercel (`/api/status` and `/api/print`), while all other endpoints returned 404 errors like `/api/diagnostics`.

## Root Cause
Vercel uses a serverless function model where each API route must be a separate file in the `/api` directory. The `src/web-server.ts` file that defines all routes only works for local development with Express, but Vercel doesn't use that file.

## Vercel Free Tier Limitation
**Important:** Vercel free accounts are limited to **12 serverless functions**. We designed the API to stay within this limit by using consolidated endpoints where possible.

## Solution
Created 4 new API endpoint files to complement the existing 8, totaling exactly 12 endpoints:

### New API Endpoints Created (4)

1. **api/queue.ts** - GET /api/queue
   - Returns current print queue and pending jobs

2. **api/statistics.ts** - GET /api/statistics
   - Returns usage statistics (total jobs, pages printed, ink used, etc.)

3. **api/diagnostics.ts** - GET /api/diagnostics
   - Returns comprehensive diagnostics (printer status, storage info, statistics, environment)

4. **api/health.ts** - GET /api/health
   - Health check endpoint for monitoring

### Existing Endpoints (8)

1. **api/status.ts** - GET /api/status
   - Get printer status

2. **api/print.ts** - POST /api/print
   - Submit print job

3. **api/control.ts** - POST /api/control
   - **Consolidated endpoint** for all printer actions (pause, resume, clean, align, etc.)
   - Handles multiple actions via the `action` parameter

4. **api/info.ts** - GET /api/info
   - Get printer information and capabilities

5. **api/mcp.ts** - POST /api/mcp
   - MCP protocol endpoint

6. **api/stream.ts** - GET /api/stream
   - Server-sent events for real-time updates

7. **api/cancel/[jobId].ts** - POST /api/cancel/[jobId]
   - Cancel specific print job

8. **api/set-ink/[color].ts** - POST /api/set-ink/[color]
   - Set ink level to specific percentage

## Complete API Endpoint List (12 Total)

**Status & Information (5):**
- GET /api/status ✅
- GET /api/health ✅ (NEW)
- GET /api/diagnostics ✅ (NEW)
- GET /api/info ✅
- GET /api/queue ✅ (NEW)

**Statistics & Monitoring (2):**
- GET /api/statistics ✅ (NEW)
- GET /api/stream ✅

**Print Operations (2):**
- POST /api/print ✅
- POST /api/cancel/[jobId] ✅

**Control & Actions (1 consolidated):**
- POST /api/control ✅
  - Actions: pause, resume, load_paper, refill_ink, clean_print_heads, align_print_heads, run_nozzle_check, clear_paper_jam, power_cycle, reset

**Ink Management (1):**
- POST /api/set-ink/[color] ✅

**MCP Protocol (1):**
- POST /api/mcp ✅

## Using the Consolidated /api/control Endpoint

Instead of having separate endpoints for each action, use the `/api/control` endpoint with the `action` parameter:

```bash
# Pause printer
curl -X POST https://virtualprintermcp.vercel.app/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "pause"}'

# Resume printer
curl -X POST https://virtualprintermcp.vercel.app/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "resume"}'

# Load paper
curl -X POST https://virtualprintermcp.vercel.app/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "load_paper", "count": 100, "paperSize": "A4"}'

# Clean print heads
curl -X POST https://virtualprintermcp.vercel.app/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "clean_print_heads"}'

# Refill ink
curl -X POST https://virtualprintermcp.vercel.app/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "refill_ink", "color": "cyan"}'
```

## Deployment Steps

1. **Commit the changes:**
   ```bash
   git add api/
   git add API_ENDPOINTS.md VERCEL_API_FIX.md
   git commit -m "Fix: Add missing API endpoints within Vercel free tier limit"
   git push origin dev
   ```

2. **Vercel will automatically deploy** from the dev branch

3. **Verify the deployment** by testing the new endpoints:
   ```bash
   # Test diagnostics
   curl https://virtualprintermcp.vercel.app/api/diagnostics
   
   # Test health
   curl https://virtualprintermcp.vercel.app/api/health
   
   # Test queue
   curl https://virtualprintermcp.vercel.app/api/queue
   
   # Test statistics
   curl https://virtualprintermcp.vercel.app/api/statistics
   
   # Test control endpoint
   curl -X POST https://virtualprintermcp.vercel.app/api/control \
     -H "Content-Type: application/json" \
     -d '{"action": "pause"}'
   ```

## Architecture Notes

### Local Development
- Uses `src/web-server.ts` with Express
- All routes defined in a single file
- Runs on port 3001
- Has individual REST endpoints for convenience

### Vercel Production
- Uses serverless functions (one per route)
- Limited to 12 functions on free tier
- Uses consolidated `/api/control` endpoint for multiple actions
- Automatically scales and deploys

### Shared Code
Both environments use:
- `build/printer.js` - VirtualPrinter class
- `build/state-manager.js` - StateManager with Vercel KV storage
- Vercel KV for persistent state across serverless invocations

## Why This Design?

1. **Stays within free tier**: 12 endpoints fits perfectly within Vercel's limit
2. **Consolidated control**: Single `/api/control` endpoint handles all printer actions
3. **Essential endpoints**: Separate endpoints for most-used operations (status, print, queue)
4. **Extensible**: Easy to add new actions to `/api/control` without creating new endpoints

## Documentation
See `API_ENDPOINTS.md` for complete API documentation with request/response examples.
