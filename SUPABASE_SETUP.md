# Supabase + Vercel Deployment Guide

This guide walks you through deploying the Virtual Printer MCP to Vercel with Supabase as the database backend.

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- GitHub repository with this code

---

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Fill in:
   - **Project name**: `virtual-printer-mcp`
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **Create new project** and wait for setup (~2 minutes)

---

## Step 2: Run Database Schema

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql` from this repo
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" message

### Verify Tables Created

Go to **Table Editor** in Supabase. You should see these tables:
- `printer_state` - Simple state storage
- `locations` - Office, Home locations  
- `printers` - 6 HP printers
- `print_queue` - Job queue
- `printer_logs` - Activity logs
- `user_settings` - User preferences

---

## Step 3: Get Supabase Credentials

1. In Supabase, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## Step 4: Deploy to Vercel

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kwintspiracy/PrinterMCP)

### Option B: Manual Deploy

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Click **Deploy**

---

## Step 5: Configure Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `STORAGE_TYPE` | `supabase` |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key |

### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |

---

## Step 6: Redeploy

After adding environment variables:
1. Go to **Deployments** tab in Vercel
2. Click **⋮** on the latest deployment
3. Click **Redeploy**

---

## Step 7: Test Your Deployment

Your app will be available at:
- **Dashboard**: `https://your-project.vercel.app`
- **API Health**: `https://your-project.vercel.app/api/health`
- **API Status**: `https://your-project.vercel.app/api/status`

### Quick Health Check

```bash
curl https://your-project.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "storage": {
    "type": "supabase",
    "healthy": true
  }
}
```

---

## Troubleshooting

### "Supabase credentials not found"
- Double-check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Ensure there are no trailing spaces in the values
- Redeploy after adding variables

### "relation 'printer_state' does not exist"
- Run the SQL schema again in Supabase SQL Editor
- Make sure you ran the entire `supabase/schema.sql` file

### Dashboard shows no printers
- The schema includes seed data - check if `printers` table has rows
- If empty, re-run the schema SQL

### API returns 500 errors
- Check Vercel function logs in the dashboard
- Verify Supabase URL is correct (includes `https://`)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Vercel CDN    │     │    Vercel       │
│  (Static Files) │     │  (API Routes)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │    Supabase     │
         │              │   (PostgreSQL)  │
         │              └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│             React Dashboard              │
│  - Location selector (Home/Office)      │
│  - Multi-printer management             │
│  - Real-time status updates             │
└─────────────────────────────────────────┘
```

---

## Cost Estimates

### Supabase Free Tier
- 500 MB database
- 2 GB bandwidth
- Unlimited API requests
- ✅ More than enough for this app

### Vercel Free Tier  
- 100 GB bandwidth
- Unlimited serverless function invocations
- ✅ More than enough for this app

**Total Monthly Cost: $0** (for typical usage)

---

## Next Steps

- [ ] Connect n8n for automation (see `N8N_INTEGRATION.md`)
- [ ] Add custom printers via API
- [ ] Enable Row Level Security for multi-user support
