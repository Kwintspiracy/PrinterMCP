# Virtual Printer API Endpoints

This document lists all available API endpoints for the Virtual Printer MCP deployed on Vercel.

## Base URL
- Production: `https://virtualprintermcp.vercel.app`
- Local: `http://localhost:3001`

## Endpoints

### Status & Information

#### GET /api/status
Get the current printer status including ink levels, paper count, queue info, and operational status.

**Response:**
```json
{
  "name": "Virtual Inkjet Pro",
  "status": "ready",
  "operationalStatus": "ready",
  "canPrint": true,
  "inkLevels": {
    "cyan": 100,
    "magenta": 100,
    "yellow": 100,
    "black": 100
  },
  "paper": {
    "count": 500,
    "capacity": 500,
    "size": "A4"
  },
  "currentJob": null,
  "queue": {
    "length": 0,
    "jobs": []
  },
  "uptimeSeconds": 0
}
```

#### GET /api/health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "printer": "Virtual Inkjet Pro",
  "storage": {
    "type": "vercel-kv",
    "healthy": true
  },
  "timestamp": "2025-01-18T07:34:00.000Z"
}
```

#### GET /api/diagnostics
Get comprehensive diagnostics including printer status, storage info, statistics, and environment details.

**Response:**
```json
{
  "printer": {
    "name": "Virtual Inkjet Pro",
    "status": "ready",
    "operationalStatus": "ready",
    "canPrint": true,
    "uptime": 0
  },
  "storage": {
    "type": "vercel-kv",
    "healthy": true
  },
  "statistics": {
    "totalJobs": 0,
    "successfulJobs": 0,
    "failedJobs": 0,
    "totalPages": 0
  },
  "environment": {
    "isVercel": true,
    "storageType": "vercel-kv",
    "nodeVersion": "v18.x.x"
  },
  "timestamp": "2025-01-18T07:34:00.000Z"
}
```

#### GET /api/info
Get detailed printer information and capabilities.

**Response:**
```json
{
  "name": "Virtual Inkjet Pro",
  "model": "VIP-3000",
  "version": "1.0.0",
  "capabilities": { ... }
}
```

#### GET /api/capabilities
Get printer capabilities (supported formats, paper sizes, quality settings).

**Response:**
```json
{
  "supportedFormats": ["PDF", "JPEG", "PNG", "TXT"],
  "paperSizes": ["A4", "Letter", "Legal", "A3", "4x6"],
  "qualitySettings": ["draft", "normal", "high", "photo"],
  "colorSupport": true,
  "duplexSupport": false,
  "maxPaperCapacity": 500
}
```

### Queue & Jobs

#### GET /api/queue
Get the current print queue.

**Response:**
```json
{
  "currentJob": null,
  "queueLength": 0,
  "pendingJobs": []
}
```

#### POST /api/print
Submit a print job.

**Request Body:**
```json
{
  "documentName": "Report.pdf",
  "pages": 5,
  "color": false,
  "quality": "normal",
  "paperSize": "A4"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-1234567890",
  "message": "Print job submitted successfully",
  "estimatedTimeSeconds": 15
}
```

#### POST /api/cancel/[jobId]
Cancel a specific print job.

**Example:** `POST /api/cancel/job-1234567890`

**Response:**
```json
{
  "success": true,
  "message": "Print job cancelled successfully"
}
```

### Statistics

#### GET /api/statistics
Get usage statistics.

**Response:**
```json
{
  "totalPagesPrinted": 0,
  "totalJobs": 0,
  "successfulJobs": 0,
  "failedJobs": 0,
  "totalInkUsed": {
    "cyan": 0,
    "magenta": 0,
    "yellow": 0,
    "black": 0
  },
  "maintenanceOperations": 0,
  "lastMaintenanceDate": null
}
```

### Control Operations

#### POST /api/control
Execute control operations on the printer (consolidated endpoint).

**Request Body:**
```json
{
  "action": "pause|resume|refill_ink|load_paper|clean_print_heads|...",
  "color": "cyan",  // for refill_ink
  "count": 100,     // for load_paper
  "paperSize": "A4" // for load_paper
}
```

**Available Actions:**
- `pause` - Pause the printer
- `resume` - Resume the printer
- `cancel_job` - Cancel a job (requires `jobId`)
- `refill_ink` - Refill ink (requires `color`)
- `load_paper` - Load paper (requires `count`, optional `paperSize`)
- `set_paper_count` - Set paper count (requires `count`, optional `paperSize`)
- `clean_print_heads` - Clean print heads
- `align_print_heads` - Align print heads
- `run_nozzle_check` - Run nozzle check
- `clear_paper_jam` - Clear paper jam
- `power_cycle` - Power cycle printer
- `reset` - Reset printer to factory defaults

**Response:**
```json
{
  "message": "Action completed successfully"
}
```

**Examples:**

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

### Ink Management

#### POST /api/set-ink/[color]
Set ink level to a specific percentage.

**Example:** `POST /api/set-ink/black`

**Request Body:**
```json
{
  "level": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Black ink set to 50%"
}
```

### Real-time Updates

#### GET /api/stream
Server-Sent Events (SSE) endpoint for real-time status updates.

**Usage:**
```javascript
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = (event) => {
  const status = JSON.parse(event.data);
  console.log('Printer status:', status);
};
```

### MCP Tools

#### POST /api/mcp
Execute MCP tools via HTTP.

**Request Body:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "print_document",
    "arguments": {
      "documentName": "test.pdf",
      "pages": 3
    }
  }
}
```

## CORS

All endpoints support CORS with:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Testing

Test the API using curl:

```bash
# Get status
curl https://virtualprintermcp.vercel.app/api/status

# Health check
curl https://virtualprintermcp.vercel.app/api/health

# Print a document
curl -X POST https://virtualprintermcp.vercel.app/api/print \
  -H "Content-Type: application/json" \
  -d '{"documentName":"test.pdf","pages":5}'

# Refill cyan ink
curl -X POST https://virtualprintermcp.vercel.app/api/refill/cyan

# Get diagnostics
curl https://virtualprintermcp.vercel.app/api/diagnostics
```
