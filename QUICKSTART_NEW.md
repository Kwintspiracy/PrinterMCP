# Quick Start Guide - Enhanced Virtual Printer MCP

This guide helps you get started with the enhanced Virtual Printer MCP Server that now supports **local development**, **Vercel deployment**, **Claude/Cline integration**, and **n8n workflow automation**.

## What's New? 🎉

The Virtual Printer MCP Server now supports:

1. ✅ **Local Development** - File-based storage for development
2. ✅ **Vercel Deployment** - Serverless functions with Vercel KV storage
3. ✅ **MCP Integration** - Claude Desktop, Cline (existing)
4. ✅ **HTTP API** - n8n workflow automation
5. ✅ **Web UI** - Browser-based dashboard (both local and Vercel)

---

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` for local development:
```env
STORAGE_TYPE=file
NODE_ENV=development
WEB_UI_PORT=3001
MCP_HTTP_PORT=3002
```

### 3. Build the Project

```bash
npm run build:all
```

This builds:
- MCP stdio server (for Claude/Cline)
- Web server (for browser UI)
- MCP HTTP server (for n8n)
- React UI (web dashboard)

---

## Usage Options

### Option 1: MCP Server for Claude/Cline

**What:** stdio-based MCP server  
**For:** Claude Desktop, Cline  
**Start:**
```bash
npm run start
```

**Configure in Cline/Claude:**
Already configured in your `cline_mcp_settings.json` as the "virtual-printer" server.

### Option 2: Web UI (Local)

**What:** Browser-based dashboard  
**For:** Visual management and testing  
**Start:**
```bash
npm run start:web
```

**Access:** http://localhost:3001

**Features:**
- View printer status
- Submit print jobs
- Monitor ink levels
- Manage paper tray
- View print queue
- Check statistics
- Real-time updates

### Option 3: MCP HTTP API (n8n Integration)

**What:** HTTP REST API for MCP tools  
**For:** n8n workflows, external integrations  
**Start:**
```bash
npm run start:mcp-http
```

**Access:** http://localhost:3002

**Example Usage:**
```bash
# Get printer status
curl -X POST http://localhost:3002/mcp/tools/get_status \
  -H "Content-Type: application/json" \
  -d '{"arguments":{}}'

# Print document
curl -X POST http://localhost:3002/mcp/tools/print_document \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "documentName": "Test",
      "pages": 1,
      "color": false,
      "quality": "draft"
    }
  }'
```

### Option 4: Full Development Mode

**What:** All servers running simultaneously  
**For:** Full-stack development  
**Start:**
```bash
npm run dev:full
```

This starts:
- Web server (port 3001)
- Vite dev server with hot reload (port 5173)

---

## Deployment to Vercel

### Prerequisites

1. Vercel account
2. Vercel CLI: `npm i -g vercel`

### Steps

1. **Set up Vercel KV database:**
   - Go to Vercel dashboard → Storage → Create Database
   - Select KV (Redis)
   - Copy environment variables

2. **Install Vercel dependencies:**
   ```bash
   npm install @vercel/node @vercel/kv
   ```

3. **Configure environment variables in Vercel:**
   ```
   STORAGE_TYPE=vercel-kv
   NODE_ENV=production
   KV_REST_API_URL=<from Vercel dashboard>
   KV_REST_API_TOKEN=<from Vercel dashboard>
   KV_REST_API_READ_ONLY_TOKEN=<from Vercel dashboard>
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Access your deployment:**
   - Web UI: `https://your-app.vercel.app`
   - API: `https://your-app.vercel.app/api/status`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Virtual Printer MCP                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MCP stdio    │  │  Web Server  │  │ MCP HTTP API │     │
│  │ (Claude/     │  │  (Browser    │  │  (n8n)       │     │
│  │  Cline)      │  │   UI)        │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                    ┌───────────────┐                        │
│                    │ Printer Core  │                        │
│                    │   Logic       │                        │
│                    └───────┬───────┘                        │
│                            │                                 │
│         ┌──────────────────┴──────────────────┐            │
│         ▼                                      ▼             │
│  ┌─────────────┐                      ┌─────────────┐      │
│  │File Storage │                      │ Vercel KV   │      │
│  │  (Local)    │                      │  (Cloud)    │      │
│  └─────────────┘                      └─────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run start` | Start MCP stdio server | Claude/Cline integration |
| `npm run start:web` | Start web server | Browser dashboard |
| `npm run start:mcp-http` | Start HTTP API | n8n integration |
| `npm run dev:full` | Full development mode | Development |
| `npm run build:all` | Build everything | Before deployment |
| `npm run dev:ui` | Vite dev server | UI development |

---

## Testing Your Setup

### Test 1: Build Success
```bash
npm run build:all
```
Expected: No errors, all files built successfully

### Test 2: Web UI
```bash
npm run start:web
```
Open http://localhost:3001 - should see printer dashboard

### Test 3: HTTP API
```bash
npm run start:mcp-http
```
Test with:
```bash
curl http://localhost:3002/mcp/tools
```
Should return list of available tools

### Test 4: MCP stdio
```bash
npm run start
```
Should see "Virtual Printer MCP Server running on stdio"

---

## Common Issues & Solutions

### Issue: TypeScript errors

**Solution:**
```bash
npm run build
```

### Issue: Port already in use

**Solution:** Change port in `.env`:
```env
WEB_UI_PORT=3003
MCP_HTTP_PORT=3004
```

### Issue: State not persisting

**Solution:** Check storage type and permissions:
```bash
# For file storage
ls -la ~/.virtual-printer/

# Or reset state
curl -X POST http://localhost:3001/api/reset
```

### Issue: Vercel deployment fails

**Solution:**
1. Verify all environment variables are set in Vercel dashboard
2. Check KV database is created and connected
3. Review deployment logs: `vercel logs`

---

## Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[N8N_INTEGRATION.md](./N8N_INTEGRATION.md)** - n8n workflow examples
- **[README.md](./README.md)** - Full project documentation
- **[.env.example](./.env.example)** - Environment variables reference

---

## Next Steps

1. ✅ **Test locally** with `npm run start:web`
2. ✅ **Integrate with Claude/Cline** (already configured)
3. ✅ **Set up n8n workflows** (see N8N_INTEGRATION.md)
4. ✅ **Deploy to Vercel** (see DEPLOYMENT.md)

---

## Support

For issues or questions:
1. Check documentation in `/docs`
2. Review error messages in console
3. Test with `curl` commands
4. Verify environment variables

Happy printing! 🖨️
