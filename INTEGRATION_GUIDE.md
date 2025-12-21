# Virtual Printer MCP Integration Guide

## Overview

This guide explains how to integrate the **Virtual Printer MCP server** (deployed on Vercel) into your application. Instead of calling a real printer, your app will use this simulated printer to test print workflows.

> **Deployment URL:** `https://virtualprintermcp.vercel.app`

---

## Quick Start

All API calls should be made to:

```
https://virtualprintermcp.vercel.app/api/...
```

---

## Integration: Print Button

When the user clicks "Print", call the `/api/print` endpoint.

### Request

```http
POST /api/print
Content-Type: application/json

{
  "documentName": "Invoice-2024.pdf",
  "pages": 3,
  "color": false,
  "quality": "normal",
  "paperSize": "A4"
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `documentName` | string | ✅ | - | Name of the document to print |
| `pages` | number | ✅ | - | Number of pages |
| `color` | boolean | ❌ | `false` | Color or black & white |
| `quality` | string | ❌ | `"normal"` | `"draft"`, `"normal"`, `"high"`, `"photo"` |
| `paperSize` | string | ❌ | `"A4"` | `"A4"`, `"Letter"`, `"Legal"`, `"A3"`, `"4x6"` |

### Response (Success)

```json
{
  "success": true,
  "jobId": "job-1734567890123",
  "message": "Print job queued: Invoice-2024.pdf (3 pages)",
  "estimatedTimeSeconds": 12
}
```

### Response (Error Examples)

```json
{
  "success": false,
  "error": "Out of paper",
  "canPrint": false
}
```

```json
{
  "success": false,
  "error": "Ink depleted: cyan, magenta",
  "canPrint": false
}
```

---

## Code Examples

### TypeScript/JavaScript

```typescript
interface PrintRequest {
  documentName: string;
  pages: number;
  color?: boolean;
  quality?: 'draft' | 'normal' | 'high' | 'photo';
  paperSize?: 'A4' | 'Letter' | 'Legal' | 'A3' | '4x6';
}

interface PrintResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
  estimatedTimeSeconds?: number;
}

async function printDocument(request: PrintRequest): Promise<PrintResponse> {
  const response = await fetch('https://virtualprintermcp.vercel.app/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return response.json();
}

// Usage
const result = await printDocument({
  documentName: 'Report.pdf',
  pages: 5,
  color: true,
  quality: 'high'
});

if (result.success) {
  console.log(`Print job ${result.jobId} submitted!`);
} else {
  console.error(`Print failed: ${result.error}`);
}
```

### React Hook

```tsx
import { useState } from 'react';

function usePrinter(baseUrl = 'https://virtualprintermcp.vercel.app') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = async (documentName: string, pages: number, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${baseUrl}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentName, pages, ...options })
      });
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error);
        return null;
      }
      return data;
    } catch (e) {
      setError('Failed to connect to printer');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    return res.json();
  };

  return { print, getStatus, loading, error };
}

// Usage in component
function PrintButton() {
  const { print, loading, error } = usePrinter();

  const handlePrint = async () => {
    const result = await print('Document.pdf', 3, { color: true });
    if (result) {
      alert(`Printing! Job ID: ${result.jobId}`);
    }
  };

  return (
    <button onClick={handlePrint} disabled={loading}>
      {loading ? 'Printing...' : 'Print'}
      {error && <span className="error">{error}</span>}
    </button>
  );
}
```

### React Native

```tsx
const API_BASE = 'https://virtualprintermcp.vercel.app';

async function handlePrint(documentName: string, pages: number) {
  try {
    const response = await fetch(`${API_BASE}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentName, pages })
    });
    
    const result = await response.json();
    
    if (result.success) {
      Alert.alert('Success', `Job ${result.jobId} submitted`);
    } else {
      Alert.alert('Print Error', result.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Could not connect to printer');
  }
}
```

---

## Check Printer Status Before Printing

Before showing the print dialog, check if the printer can print:

```typescript
async function canPrint(): Promise<{ canPrint: boolean; issues: string[] }> {
  const res = await fetch('https://virtualprintermcp.vercel.app/api/status');
  const status = await res.json();
  
  return {
    canPrint: status.canPrint,
    issues: status.issues || []
  };
}

// Usage
const { canPrint, issues } = await canPrint();
if (!canPrint) {
  alert(`Cannot print: ${issues.join(', ')}`);
}
```

### Status Response Structure

```json
{
  "name": "Virtual Inkjet Pro",
  "status": "ready",
  "canPrint": true,
  "issues": [],
  "inkLevels": {
    "cyan": 85,
    "magenta": 90,
    "yellow": 75,
    "black": 60
  },
  "paper": {
    "count": 250,
    "capacity": 500,
    "size": "A4"
  }
}
```

---

## Monitor Print Job Progress

### Polling

```typescript
async function waitForJob(jobId: string): Promise<'completed' | 'failed'> {
  while (true) {
    const res = await fetch('https://virtualprintermcp.vercel.app/api/queue');
    const queue = await res.json();
    
    // Check if job is current
    if (queue.currentJob?.id === jobId) {
      console.log(`Progress: ${queue.currentJob.progress}%`);
    }
    
    // Check completed jobs in status
    const status = await (await fetch('/api/status')).json();
    if (!status.queue.jobs.find(j => j.id === jobId)) {
      return 'completed'; // Job no longer in queue = done
    }
    
    await new Promise(r => setTimeout(r, 1000)); // Poll every second
  }
}
```

### Server-Sent Events (Real-time)

```typescript
const eventSource = new EventSource('https://virtualprintermcp.vercel.app/api/stream');

eventSource.onmessage = (event) => {
  const status = JSON.parse(event.data);
  
  if (status.currentJob) {
    console.log(`Printing: ${status.currentJob.progress}%`);
  }
};
```

---

## Handle Printer Errors

| Error Type | User Message | Suggested Action |
|------------|--------------|------------------|
| `out_of_paper` | "Printer is out of paper" | Show "Load Paper" button |
| `low_ink` | "Low ink: {colors}" | Show warning, allow print |
| `ink_depleted` | "Empty ink: {colors}" | Block color printing |
| `paper_jam` | "Paper jam detected" | Show "Clear Jam" button |
| `offline` | "Printer is offline" | Retry connection |

### Error Recovery Actions

```typescript
const API = 'https://virtualprintermcp.vercel.app';

// Clear paper jam
await fetch(`${API}/api/control`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'clear_paper_jam' })
});

// Load paper
await fetch(`${API}/api/control`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'load_paper', count: 100 })
});

// Refill ink
await fetch(`${API}/api/control`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'refill_ink', color: 'cyan' })
});
```

---

## All Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Get printer status |
| `POST` | `/api/print` | Submit print job |
| `GET` | `/api/queue` | Get print queue |
| `POST` | `/api/control` | Execute actions (pause, resume, refill, etc.) |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stream` | Real-time SSE updates |

> All endpoints are prefixed with: `https://virtualprintermcp.vercel.app`

