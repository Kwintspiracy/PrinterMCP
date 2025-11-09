# Deployment Guide

This guide covers deploying the Virtual Printer MCP Server to both local and Vercel environments.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Vercel Deployment](#vercel-deployment)
3. [Environment Variables](#environment-variables)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd virtual-printer-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```
   STORAGE_TYPE=file
   NODE_ENV=development
   WEB_UI_PORT=3001
   MCP_HTTP_PORT=3002
   ```

4. **Build the project**
   ```bash
   npm run build
   npm run build:ui
   ```

### Running Locally

#### Option 1: MCP Server (for Claude/Cline)

```bash
npm run start
```

This runs the stdio-based MCP server for integration with Claude Desktop or Cline.

#### Option 2: Web UI Server

```bash
npm run start:web
```

Access the web dashboard at: `http://localhost:3001`

#### Option 3: MCP HTTP Server (for n8n)

```bash
npm run start:mcp-http
```

The HTTP MCP API will be available at: `http://localhost:3002`

#### Option 4: Full Development Mode

```bash
npm run dev:full
```

This runs both the web server and UI development server with hot-reload.

---

## Vercel Deployment

### Prerequisites

- Vercel account ([sign up](https://vercel.com/signup))
- Vercel CLI installed: `npm i -g vercel`
- Vercel KV database set up

### Step 1: Set Up Vercel KV

1. Go to your Vercel dashboard
2. Navigate to **Storage** → **Create Database**
3. Select **KV** (Redis-compatible)
4. Name your database (e.g., `virtual-printer-kv`)
5. Copy the environment variables provided

### Step 2: Install Vercel Dependencies

```bash
npm install @vercel/node @vercel/kv
```

### Step 3: Configure Environment Variables

In your Vercel project settings, add:

```
STORAGE_TYPE=vercel-kv
NODE_ENV=production
KV_REST_API_URL=<from Vercel KV dashboard>
KV_REST_API_TOKEN=<from Vercel KV dashboard>
KV_REST_API_READ_ONLY_TOKEN=<from Vercel KV dashboard>
```

### Step 4: Deploy

#### Via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Via GitHub Integration

1. Push your code to GitHub
2. Connect repository to Vercel
3. Vercel will automatically deploy on push

### Step 5: Verify Deployment

1. Visit your Vercel URL
2. Check the web UI loads
3. Test API endpoints:
   - `https://your-app.vercel.app/api/status`
   - `https://your-app.vercel.app/health`

---

## Environment Variables

### Required Variables

| Variable | Description | Local Value | Vercel Value |
|----------|-------------|-------------|--------------|
| `STORAGE_TYPE` | Storage backend | `file` | `vercel-kv` |
| `NODE_ENV` | Environment | `development` | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEB_UI_PORT` | Web UI server port | `3001` |
| `MCP_HTTP_PORT` | MCP HTTP API port | `3002` |
| `STATE_FILE_PATH` | Custom state file path | `~/.virtual-printer/printer-state.json` |

### Vercel KV Variables (Vercel only)

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` | Vercel KV REST API URL |
| `KV_REST_API_TOKEN` | Vercel KV write token |
| `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV read-only token |

---

## Testing

### Local Testing

1. **Test MCP stdio server**
   ```bash
   npm run dev
   ```
   Send MCP protocol messages via stdin

2. **Test Web UI**
   ```bash
   npm run start:web
   ```
   Open `http://localhost:3001` in browser

3. **Test HTTP MCP API**
   ```bash
   npm run start:mcp-http
   ```
   Test endpoints:
   ```bash
   # Get status
   curl http://localhost:3002/mcp/tools
   
   # Get printer status
   curl -X POST http://localhost:3002/mcp/tools/get_status \
     -H "Content-Type: application/json" \
     -d '{"arguments":{}}'
   ```

### Vercel Testing

1. **Test API endpoints**
   ```bash
   curl https://your-app.vercel.app/api/status
   ```

2. **Test Web UI**
   Open `https://your-app.vercel.app` in browser

3. **Check logs**
   ```bash
   vercel logs <deployment-url>
   ```

---

## Troubleshooting

### Local Issues

**Problem: "Cannot find module" errors**
```bash
npm run build
```

**Problem: State not persisting**
- Check write permissions on `~/.virtual-printer/`
- Verify `STORAGE_TYPE=file` in `.env`

**Problem: Port already in use**
- Change port in `.env`:
  ```
  WEB_UI_PORT=3003
  MCP_HTTP_PORT=3004
  ```

### Vercel Issues

**Problem: "Module not found" in Vercel**
- Ensure all dependencies are in `package.json`
- Run `npm install` before deploying

**Problem: KV connection errors**
- Verify KV environment variables are set in Vercel dashboard
- Check KV database is in same region as function

**Problem: Timeout errors**
- Vercel free tier has 10s timeout
- Pro tier has 60s timeout
- Long-running operations may need optimization

**Problem: Cold starts**
- First request after inactivity may be slow
- Consider Vercel Pro for better performance

### Storage Issues

**Problem: State resets on Vercel**
- Verify `STORAGE_TYPE=vercel-kv`
- Check KV credentials are correct

**Problem: Can't switch between storage types**
- Clear old state:
  ```bash
  rm -rf ~/.virtual-printer/  # For file storage
  ```
- Or reset via API:
  ```bash
  curl -X POST http://localhost:3001/api/reset
  ```

---

## Architecture Differences

### Local (File Storage)
- ✅ Continuous server process
- ✅ File-based state persistence
- ✅ No timeout limits
- ✅ Full SSE support for real-time updates
- ❌ Not accessible remotely

### Vercel (KV Storage)
- ✅ Globally accessible
- ✅ Auto-scaling
- ✅ Zero DevOps
- ❌ Serverless (stateless functions)
- ❌ 10-60s timeout limits
- ❌ Limited SSE support
- ✅ Database-backed persistence

---

## Next Steps

- [n8n Integration Guide](./N8N_INTEGRATION.md) - Connect with n8n workflows
- [MCP Client Setup](./README.md#installation) - Configure Claude Desktop/Cline
- [API Reference](./README.md#mcp-tools) - Full API documentation
