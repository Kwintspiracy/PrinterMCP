# Vercel Deployment Guide - Virtual Printer MCP

This guide will walk you through deploying your Virtual Printer MCP Server to Vercel for n8n integration.

## ✅ Prerequisites Completed

- [x] Vercel dependencies installed (`@vercel/node`, `@vercel/kv`)
- [x] Project built successfully
- [x] Configuration files ready

## 🚀 Deployment Steps

### Step 1: Create Vercel Account & Install CLI

1. **Sign up for Vercel** (if you haven't): https://vercel.com/signup
2. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
3. **Login to Vercel**:
   ```bash
   vercel login
   ```

### Step 2: Create Vercel KV Database

1. Go to https://vercel.com/dashboard
2. Click **Storage** in the left sidebar
3. Click **Create Database**
4. Select **KV** (Redis-compatible)
5. Name it: `virtual-printer-kv`
6. Click **Create**

**Important:** Copy these three environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### Step 3: Deploy to Vercel

Run this command in your project directory:

```bash
vercel
```

**First-time setup prompts:**
1. "Set up and deploy?" → **Yes**
2. "Which scope?" → Select your account
3. "Link to existing project?" → **No**
4. "Project name?" → `virtual-printer-mcp` (or your choice)
5. "Directory?" → Press Enter (current directory)
6. "Override settings?" → **No**

Vercel will:
- Build your project
- Deploy it
- Give you a preview URL (e.g., `https://virtual-printer-mcp-abc123.vercel.app`)

### Step 4: Configure Environment Variables

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

| Variable | Value |
|----------|-------|
| `STORAGE_TYPE` | `vercel-kv` |
| `NODE_ENV` | `production` |
| `KV_REST_API_URL` | (from Step 2) |
| `KV_REST_API_TOKEN` | (from Step 2) |
| `KV_REST_API_READ_ONLY_TOKEN` | (from Step 2) |

4. Click **Save**

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

This deploys to production with your environment variables.

**Your production URL:** `https://your-project-name.vercel.app`

## 🧪 Testing Your Deployment

### Test 1: Health Check

```bash
curl https://your-project-name.vercel.app/api/status
```

Expected response: JSON with printer status

### Test 2: List MCP Tools (for n8n)

```bash
curl https://your-project-name.vercel.app/mcp/tools
```

Expected: List of all 15 MCP tools

### Test 3: Get Printer Status

```bash
curl -X POST https://your-project-name.vercel.app/mcp/tools/get_status \
  -H "Content-Type: application/json" \
  -d '{"arguments":{}}'
```

Expected: Complete printer status

### Test 4: Print Document

```bash
curl -X POST https://your-project-name.vercel.app/mcp/tools/print_document \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "documentName": "Test Document",
      "pages": 1,
      "color": false,
      "quality": "draft"
    }
  }'
```

Expected: Success message with job ID

## 📱 Using with n8n

### Basic n8n Setup

1. **Add HTTP Request Node** in n8n
2. **Configure:**
   - Method: `POST`
   - URL: `https://your-project-name.vercel.app/mcp/tools/TOOL_NAME`
   - Authentication: None (add later if needed)
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "arguments": {
         // tool-specific parameters
       }
     }
     ```

### Example n8n Workflows

#### Workflow 1: Daily Status Check
```
Schedule Trigger (Daily at 9am)
  ↓
HTTP Request: Get Status
  URL: /mcp/tools/get_status
  ↓
IF Node: Check ink levels < 20%
  ↓
Send Email Alert
```

#### Workflow 2: Print on Email Received
```
Email Trigger
  ↓
HTTP Request: Print Document
  URL: /mcp/tools/print_document
  Body: {
    "arguments": {
      "documentName": "{{$json.subject}}",
      "pages": 1
    }
  }
```

#### Workflow 3: Automated Maintenance
```
Schedule Trigger (Weekly)
  ↓
HTTP Request: Get Statistics
  ↓
IF Node: Pages printed > 450
  ↓
HTTP Request: Clean Print Heads
  ↓
Wait 10 seconds
  ↓
HTTP Request: Align Print Heads
```

## 🔑 Available MCP Tools

All tools accessible via POST to:
`https://your-project-name.vercel.app/mcp/tools/{TOOL_NAME}`

**Printing:**
- `print_document` - Submit print job
- `cancel_job` - Cancel job
- `get_queue` - View queue

**Status:**
- `get_status` - Full printer status
- `get_statistics` - Usage stats

**Control:**
- `pause_printer` - Pause
- `resume_printer` - Resume

**Maintenance:**
- `clean_print_heads` - Clean heads
- `align_print_heads` - Align heads
- `run_nozzle_check` - Test nozzles

**Resources:**
- `refill_ink_cartridge` - Refill ink
- `load_paper` - Load paper

**Recovery:**
- `clear_paper_jam` - Clear jam
- `power_cycle` - Restart
- `reset_printer` - Factory reset

## 🎯 Quick Reference

**Your URLs:**
- Web UI: `https://your-project-name.vercel.app`
- API Status: `https://your-project-name.vercel.app/api/status`
- MCP Tools: `https://your-project-name.vercel.app/mcp/tools/{tool}`
- MCP Resources: `https://your-project-name.vercel.app/mcp/resources/{resource}`

**For Detailed Examples:**
- See `N8N_INTEGRATION.md` for complete n8n workflows
- See `DEPLOYMENT.md` for troubleshooting

## 🔧 Troubleshooting

**Problem: "Module not found" error**
- Run `npm install` locally
- Commit changes
- Redeploy: `vercel --prod`

**Problem: "KV connection failed"**
- Verify environment variables in Vercel Dashboard
- Check KV database is in same region
- Try redeploying

**Problem: Function timeout**
- Vercel free tier: 10s timeout
- Vercel Pro: 60s timeout
- Most operations complete in <5s

**Problem: CORS errors**
- CORS is already configured in the code
- If issues persist, check Vercel logs: `vercel logs`

## 📊 Monitoring

**View Logs:**
```bash
vercel logs
```

**View Specific Deployment:**
```bash
vercel logs https://your-deployment-url.vercel.app
```

**Dashboard:** https://vercel.com/dashboard
- View analytics
- Monitor function invocations
- Check KV storage usage

## 🎉 Success!

Once deployed, you can:
- ✅ Access printer from anywhere via HTTP
- ✅ Build n8n workflows
- ✅ Create webhooks
- ✅ Use in custom applications
- ✅ Monitor via web UI

**Next Steps:**
1. Test all endpoints
2. Build your first n8n workflow
3. Set up monitoring/alerts
4. (Optional) Add authentication

Happy automating! 🚀
