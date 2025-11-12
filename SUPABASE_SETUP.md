# Supabase Setup Guide for PrinterMCP

## ✅ Code Changes Complete

The Supabase storage adapter has been successfully implemented! Now you just need to configure the environment variables in Vercel.

---

## 🔧 Vercel Configuration Steps

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (project ref: `moouetlmkuadjwudaewi`)
3. Click **Settings** (gear icon in left sidebar)
4. Click **API** in the settings menu

You'll need two values:
- **Project URL**: `https://moouetlmkuadjwudaewi.supabase.co`
- **Anon (public) key**: Copy the `anon` `public` key (NOT the service_role key)

### Step 2: Add Environment Variables to Vercel

1. Go to https://vercel.com/dashboard
2. Click on your **PrinterMCP** project
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Add these three variables:

#### Variable 1: STORAGE_TYPE
```
Name: STORAGE_TYPE
Value: supabase
Environment: Production ✓  Preview ✓  Development ✓
```

#### Variable 2: SUPABASE_URL
```
Name: SUPABASE_URL
Value: https://moouetlmkuadjwudaewi.supabase.co
Environment: Production ✓  Preview ✓  Development ✓
```

#### Variable 3: SUPABASE_KEY
```
Name: SUPABASE_KEY
Value: [paste your anon/public key here]
Environment: Production ✓  Preview ✓  Development ✓
```

**Important:** Make sure to select all three environments (Production, Preview, Development) for each variable!

### Step 3: Redeploy Your Application

After adding the environment variables:

1. Go to the **Deployments** tab
2. Find your latest deployment
3. Click the three dots (...) menu
4. Click **Redeploy**
5. Wait for deployment to complete

---

## 🧪 Testing

### Test 1: Check Status Endpoint

After redeployment, visit:
```
https://virtualprintermcp.vercel.app/api/status
```

You should see:
```json
{
  "storage": {
    "type": "supabase",
    "healthy": true
  },
  "printer": {
    "initialized": true,
    "status": "ready"
  }
}
```

### Test 2: Verify Persistent Storage

1. Print a test job (ink levels will decrease)
2. Wait a few minutes
3. Check status again - ink levels should remain decreased ✅

This confirms state is persisting in Supabase!

---

## 📊 What Changed

### Files Added
- `src/adapters/supabase-storage.ts` - Supabase storage adapter implementation

### Files Modified
- `src/adapters/storage-adapter.ts` - Added Supabase support to factory function
- `package.json` - Added `@supabase/supabase-js` dependency

### Environment Variables Required
- `STORAGE_TYPE=supabase`
- `SUPABASE_URL=https://moouetlmkuadjwudaewi.supabase.co`
- `SUPABASE_KEY=your-anon-key`

---

## ✅ Benefits

- **Persistent storage** - State survives Vercel cold starts
- **No more errors** - Fixes "Vercel KV not available" issue
- **Better integration** - Works with your existing Supabase setup
- **Free tier** - 500MB database storage

---

## 🔍 Troubleshooting

### If you see "storage healthy: false"

1. Verify environment variables are set correctly in Vercel
2. Check you're using the **anon key** (not service_role key)
3. Verify the `printer_state` table exists in Supabase
4. Check Vercel logs for specific error messages

### If state doesn't persist

1. Verify `STORAGE_TYPE` is set to `supabase` (not `file` or `vercel-kv`)
2. Redeploy after adding environment variables
3. Check Supabase logs for connection errors

---

## 📝 Next Steps

1. Add the three environment variables in Vercel (see Step 2 above)
2. Redeploy your application
3. Test the status endpoint
4. Commit and push these code changes to GitHub

That's it! Your printer will now have persistent storage through Supabase.
