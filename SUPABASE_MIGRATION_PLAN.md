# Supabase Storage Migration Plan

This guide explains how to migrate from ephemeral file storage to persistent Supabase storage for the Virtual Printer MCP server.

## 📋 Table of Contents

1. [Why Supabase?](#why-supabase)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Code Implementation](#code-implementation)
5. [Environment Configuration](#environment-configuration)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Rollback Plan](#rollback-plan)

---

## 🎯 Why Supabase?

**Benefits:**
- ✅ **Persistent storage** - State survives across Vercel deployments
- ✅ **Generous free tier** - 500MB database (vs Vercel KV's 256MB)
- ✅ **PostgreSQL** - Flexible, queryable, reliable
- ✅ **Built-in tools** - Supabase Studio for data management
- ✅ **Backups** - Automatic point-in-time recovery
- ✅ **Already integrated** - You have Supabase MCP server

**Current Issue:**
```
Error: Vercel KV is not available. Install @vercel/kv or use STORAGE_TYPE=file
```

With file storage, printer state resets frequently due to serverless cold starts.

---

## ✅ Prerequisites

- [x] Supabase account (already have)
- [ ] Supabase project created
- [ ] Project URL and anon key ready
- [ ] Access to Supabase SQL Editor

---

## 🗄️ Database Setup

### Step 1: Create the Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create printer state table
CREATE TABLE IF NOT EXISTS printer_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster updates
CREATE INDEX IF NOT EXISTS idx_printer_state_updated 
ON printer_state(updated_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE printer_state ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role full access" ON printer_state
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Allow anon key to read/write (for API)
CREATE POLICY "API can manage state" ON printer_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_printer_state_updated_at
  BEFORE UPDATE ON printer_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default row if not exists
INSERT INTO printer_state (id, state)
VALUES (
  'default',
  '{
    "name": "Virtual Inkjet Pro",
    "status": "offline",
    "inkLevels": {"cyan": 100, "magenta": 100, "yellow": 100, "black": 100},
    "paperCount": 100,
    "paperSize": "A4",
    "paperTrayCapacity": 100,
    "queue": [],
    "currentJob": null,
    "completedJobs": [],
    "errors": [],
    "maintenanceHistory": [],
    "statistics": {
      "totalPagesPrinted": 0,
      "totalInkUsed": {"cyan": 0, "magenta": 0, "yellow": 0, "black": 0},
      "totalJobs": 0,
      "successfulJobs": 0,
      "failedJobs": 0,
      "maintenanceOperations": 0,
      "lastMaintenanceDate": null
    },
    "logs": [],
    "lastUpdated": 0,
    "lastStartTime": 0,
    "capabilities": {
      "name": "Virtual Inkjet Pro",
      "type": "Inkjet",
      "colorSupport": true,
      "duplexSupport": false,
      "maxPaperSize": "A3",
      "supportedPaperSizes": ["A4", "Letter", "Legal", "A3", "4x6"],
      "maxResolutionDPI": 4800,
      "printSpeedPPM": 15,
      "printSpeedPPMColor": 12,
      "paperTrayCapacity": 100,
      "inkType": "CMYK",
      "connectivity": ["USB", "WiFi", "Ethernet"]
    },
    "configuration": {
      "printerName": "Virtual Inkjet Pro",
      "printSpeedPPM": 15,
      "maintenanceInterval": 500,
      "paperTrayCapacity": 100,
      "enableErrorSimulation": true,
      "errorProbability": 0.05
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
```

### Step 2: Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM printer_state;
```

You should see one row with id='default'.

---

## 💻 Code Implementation

### Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Storage Adapter

Create file: `src/adapters/supabase-storage.ts`

```typescript
/**
 * Supabase Storage Adapter
 * Stores printer state in Supabase PostgreSQL database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageAdapter, PrinterState } from './storage-adapter.js';

export class SupabaseStorage implements IStorageAdapter {
  private client: SupabaseClient | null = null;
  private readonly stateId = 'default';

  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Supabase credentials not found. Set SUPABASE_URL and SUPABASE_KEY environment variables.'
        );
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    }

    return this.client;
  }

  async loadState(): Promise<PrinterState | null> {
    try {
      const client = this.getClient();

      const { data, error } = await client
        .from('printer_state')
        .select('state')
        .eq('id', this.stateId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - state doesn't exist yet
          return null;
        }
        throw error;
      }

      return data?.state || null;
    } catch (error) {
      console.error('Error loading state from Supabase:', error);
      throw error;
    }
  }

  async saveState(state: PrinterState): Promise<void> {
    try {
      const client = this.getClient();

      const { error } = await client
        .from('printer_state')
        .upsert({
          id: this.stateId,
          state: state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving state to Supabase:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();

      const { error } = await client
        .from('printer_state')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }

  async clearState(): Promise<void> {
    try {
      const client = this.getClient();

      const { error } = await client
        .from('printer_state')
        .delete()
        .eq('id', this.stateId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error clearing state from Supabase:', error);
      throw error;
    }
  }

  getType(): string {
    return 'supabase';
  }
}
```

### Step 3: Update Storage Adapter Factory

Edit `src/adapters/storage-adapter.ts`:

```typescript
export async function createStorageAdapter(): Promise<IStorageAdapter> {
  const storageType = process.env.STORAGE_TYPE || 'file';
  
  switch (storageType) {
    case 'supabase':
      const { SupabaseStorage } = await import('./supabase-storage.js');
      return new SupabaseStorage();
    
    case 'vercel-kv':
      const { VercelKVStorage } = await import('./vercel-storage.js');
      return new VercelKVStorage();
    
    case 'file':
    default:
      const { FileStorage } = await import('./file-storage.js');
      return new FileStorage();
  }
}
```

### Step 4: Update package.json Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

---

## ⚙️ Environment Configuration

### Local Development (.env)

```bash
# Storage Configuration
STORAGE_TYPE=supabase

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here

# Server Ports
WEB_UI_PORT=3001
MCP_HTTP_PORT=3002

# Node Environment
NODE_ENV=development
```

### Vercel Production

Add these environment variables in Vercel Dashboard:

```bash
STORAGE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
NODE_ENV=production
```

**How to add:**
1. Go to: https://vercel.com/dashboard
2. Select your **PrinterMCP** project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Click **Save**

---

## 🧪 Testing

### Test 1: Local Testing

```bash
# Install dependencies
npm install

# Build project
npm run build:all

# Start server
npm run start:web

# Visit http://localhost:3001
# Verify printer state loads and persists
```

### Test 2: API Testing

```bash
# Test status endpoint
curl http://localhost:3001/api/status

# Should return printer state from Supabase
```

### Test 3: State Persistence Test

1. Print a test job
2. Check ink levels (should decrease)
3. Restart the server
4. Check ink levels again (should remain decreased) ✅

If ink levels reset, Supabase storage is not working.

### Test 4: Supabase Direct Query

In Supabase SQL Editor:

```sql
SELECT state->>'status' as status,
       state->'inkLevels' as ink_levels,
       updated_at
FROM printer_state
WHERE id = 'default';
```

You should see current printer state.

---

## 🚀 Deployment

### Step 1: Commit Code Changes

```bash
git add .
git commit -m "Add Supabase storage adapter for persistent state"
git push
```

### Step 2: Configure Vercel

1. Add environment variables (see above)
2. Trigger redeploy

### Step 3: Verify Deployment

```bash
# Test status endpoint
curl https://virtualprintermcp.vercel.app/api/status

# Should return 200 OK with printer state
```

### Step 4: Monitor Logs

Check Vercel logs for errors:
- No "Vercel KV not available" errors ✅
- State saves successfully ✅

---

## 🔄 Rollback Plan

### If Supabase Migration Fails

**Quick Rollback (5 minutes):**

1. **Change environment variable:**
   ```bash
   STORAGE_TYPE=file
   ```

2. **Redeploy in Vercel**

3. **Verify:** System works (with ephemeral storage)

### If Need to Keep Supabase

**Debug checklist:**

- [ ] Verify SUPABASE_URL is correct
- [ ] Verify SUPABASE_KEY is valid (anon key, not service_role)
- [ ] Check Supabase project is active
- [ ] Verify table `printer_state` exists
- [ ] Check RLS policies allow access
- [ ] Review Vercel logs for error details

### Data Recovery

If data is lost or corrupted:

```sql
-- Reset to default state
UPDATE printer_state
SET state = '{
  "name": "Virtual Inkjet Pro",
  "status": "offline",
  ...
}'::jsonb
WHERE id = 'default';
```

---

## 📊 Monitoring

### Supabase Dashboard

Monitor in Supabase Dashboard:
- **Database** → View table contents
- **Logs** → Check for errors
- **API** → Monitor request rate

### Health Check Endpoint

Create monitoring endpoint:

```bash
curl https://virtualprintermcp.vercel.app/health

# Should return:
{
  "status": "ok",
  "storage": {
    "type": "supabase",
    "healthy": true
  }
}
```

---

## 🎯 Success Criteria

✅ **Migration is successful when:**

1. UI loads without crashing
2. Printer state persists across cold starts
3. No "Vercel KV" errors in logs
4. Print jobs survive server restarts
5. Statistics accumulate over time
6. Ink levels decrease and stay decreased

---

## 💡 Tips

**Performance:**
- Supabase has connection pooling built-in
- Each API call = 1-2 database queries
- Free tier: 500MB, 2GB bandwidth/month

**Security:**
- Use anon key (not service_role key)
- RLS policies protect the data
- Only printer service can modify state

**Cost:**
- Free tier is generous (500MB database)
- Unlikely to exceed free tier with single printer
- Upgrade if needed: $25/month for Pro

---

## 📞 Support

**Issues?**
- Check Vercel logs
- Check Supabase logs
- Verify environment variables
- Test locally first

**Questions?**
- Review this guide
- Check Supabase documentation
- Test with Supabase MCP tools

---

## ✅ Checklist

Use this checklist to track migration progress:

- [ ] Create Supabase table
- [ ] Verify table with test query
- [ ] Install @supabase/supabase-js
- [ ] Create supabase-storage.ts adapter
- [ ] Update storage-adapter.ts factory
- [ ] Update package.json
- [ ] Add local .env variables
- [ ] Test locally
- [ ] Commit code changes
- [ ] Add Vercel environment variables
- [ ] Deploy to Vercel
- [ ] Verify deployment
- [ ] Test state persistence
- [ ] Monitor for 24 hours
- [ ] Migration complete! 🎉

---

**Created:** 2025-11-10  
**Status:** Ready for implementation  
**Estimated Time:** 15-20 minutes
