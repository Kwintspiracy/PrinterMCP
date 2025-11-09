# n8n Integration Guide

This guide shows you how to integrate the Virtual Printer MCP Server with n8n for workflow automation.

## Table of Contents

1. [Overview](#overview)
2. [Setup Options](#setup-options)
3. [HTTP API Endpoints](#http-api-endpoints)
4. [n8n Workflow Examples](#n8n-workflow-examples)
5. [Authentication](#authentication)
6. [Error Handling](#error-handling)

---

## Overview

The Virtual Printer MCP Server provides an HTTP API that can be accessed from n8n workflows using the HTTP Request node. This allows you to:

- Trigger print jobs from n8n workflows
- Monitor printer status in real-time
- Automate printer maintenance
- Integrate with other services (email, webhooks, databases, etc.)

### Architecture

```
n8n Workflow
    ↓ (HTTP Request)
MCP HTTP Server (localhost:3002 or Vercel)
    ↓
Virtual Printer
    ↓
Storage (File or Vercel KV)
```

---

## Setup Options

### Option 1: Local n8n + Local MCP Server (Recommended for Development)

**Pros:**
- No external dependencies
- Fastest response times
- Full control over both services

**Setup:**

1. Start the MCP HTTP server:
   ```bash
   npm run start:mcp-http
   ```
   Server runs at: `http://localhost:3002`

2. In n8n, use `http://localhost:3002` as the base URL

### Option 2: Cloud n8n + Vercel MCP Server (Recommended for Production)

**Pros:**
- Accessible from anywhere
- No local infrastructure needed
- Auto-scaling

**Setup:**

1. Deploy MCP server to Vercel (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. In n8n, use your Vercel URL: `https://your-app.vercel.app`

### Option 3: Local n8n + Vercel MCP Server

**Pros:**
- Test workflows locally against production server
- Good for development/testing

**Setup:**

1. Deploy to Vercel
2. In n8n, use your Vercel URL

---

## HTTP API Endpoints

### Base URLs

- **Local:** `http://localhost:3002`
- **Vercel:** `https://your-app.vercel.app`

### Tool Endpoints

All tool endpoints follow this pattern:

```
POST /mcp/tools/{toolName}
Content-Type: application/json

{
  "arguments": {
    // tool-specific parameters
  }
}
```

### Available Tools

#### 1. Get Printer Status

**Endpoint:** `POST /mcp/tools/get_status`

**Request:**
```json
{
  "arguments": {}
}
```

**Response:**
```json
{
  "success": true,
  "tool": "get_status",
  "result": {
    "name": "Virtual Inkjet Pro",
    "status": "ready",
    "inkLevels": {
      "cyan": 85,
      "magenta": 92,
      "yellow": 78,
      "black": 95
    },
    "paper": {
      "count": 45,
      "capacity": 100,
      "size": "A4"
    },
    "currentJob": null,
    "queue": {
      "length": 0,
      "jobs": []
    }
  }
}
```

#### 2. Print Document

**Endpoint:** `POST /mcp/tools/print_document`

**Request:**
```json
{
  "arguments": {
    "documentName": "Invoice #1234",
    "pages": 5,
    "color": true,
    "quality": "normal",
    "paperSize": "A4"
  }
}
```

**Response:**
```json
{
  "success": true,
  "tool": "print_document",
  "result": {
    "jobId": "job-abc123",
    "message": "Print job queued successfully",
    "estimatedTime": 20
  }
}
```

#### 3. Other Tools

See [Full Tool Reference](#full-tool-reference) below for all available tools.

### Resource Endpoints

Get read-only data:

```
GET /mcp/resources/{resourceName}
```

Available resources:
- `state` - Complete printer state
- `queue` - Print queue
- `logs` - Printer logs (append `?limit=50` for custom limit)
- `statistics` - Usage statistics
- `capabilities` - Printer specifications

### Discovery Endpoints

```
GET /mcp/tools              # List all available tools
GET /mcp/resources          # List all available resources
GET /health                 # Health check
```

---

## n8n Workflow Examples

### Example 1: Print When Email Received

**Trigger:** Email received
**Action:** Print email as PDF

```
1. Email Trigger Node
   ↓
2. HTTP Request Node
   - Method: POST
   - URL: http://localhost:3002/mcp/tools/print_document
   - Body:
     {
       "arguments": {
         "documentName": "{{$node['Email Trigger'].json['subject']}}",
         "pages": 1,
         "color": false,
         "quality": "draft"
       }
     }
   ↓
3. (Optional) Send confirmation email
```

### Example 2: Daily Ink Level Report

**Trigger:** Schedule (daily at 9 AM)
**Action:** Check ink levels and send alert if low

```
1. Schedule Trigger (Cron: 0 9 * * *)
   ↓
2. HTTP Request - Get Status
   - Method: POST
   - URL: http://localhost:3002/mcp/tools/get_status
   - Body: {"arguments": {}}
   ↓
3. IF Node - Check if any ink < 20%
   ↓
4. Send Email Alert
   - Subject: "Low Ink Alert"
   - Body: "Cyan: {{$json.result.inkLevels.cyan}}%"
```

### Example 3: Automated Maintenance

**Trigger:** Schedule (weekly)
**Action:** Run maintenance if needed

```
1. Schedule Trigger (Cron: 0 0 * * 0)  # Every Sunday midnight
   ↓
2. HTTP Request - Get Status
   ↓
3. IF Node - Check maintenanceNeeded
   ↓
4. HTTP Request - Clean Print Heads
   - Method: POST
   - URL: http://localhost:3002/mcp/tools/clean_print_heads
   - Body: {"arguments": {}}
   ↓
5. Wait 10 seconds
   ↓
6. HTTP Request - Align Print Heads
   ↓
7. Send completion notification
```

### Example 4: Print Queue Monitor

**Trigger:** Webhook
**Action:** Monitor and report queue status

```
1. Webhook Trigger
   ↓
2. HTTP Request - Get Queue
   - URL: http://localhost:3002/mcp/resources/queue
   ↓
3. Function Node - Format data
   ↓
4. HTTP Request - Post to Slack/Discord
```

### Example 5: Auto-Refill Ink

**Trigger:** Schedule (hourly check)
**Action:** Refill ink if below 15%

```
1. Schedule Trigger (every hour)
   ↓
2. HTTP Request - Get Status
   ↓
3. Function Node - Check each ink color
   ↓
4. Loop through colors
   ↓
5. IF - ink < 15%
   ↓
6. HTTP Request - Refill Ink
   - URL: http://localhost:3002/mcp/tools/refill_ink_cartridge
   - Body: {"arguments": {"color": "{{$json.color}}"}}
```

---

## n8n HTTP Request Node Configuration

### Basic Setup

1. Add **HTTP Request** node
2. Configure:
   - **Method:** POST (for tools) or GET (for resources)
   - **URL:** `http://localhost:3002/mcp/tools/tool_name`
   - **Authentication:** None (add if needed)
   - **Headers:**
     ```
     Content-Type: application/json
     ```
   - **Body (JSON):**
     ```json
     {
       "arguments": {
         // parameters here
       }
     }
     ```

### Using Expressions

Access data from previous nodes:

```json
{
  "arguments": {
    "documentName": "{{$node['Trigger'].json['filename']}}",
    "pages": {{$node['Trigger'].json['pageCount']}},
    "color": true
  }
}
```

### Error Handling

Add **Error Trigger** node after HTTP Request:

```
HTTP Request Node
   ↓ (on success)
Process Result
   ↓ (on error)
Error Trigger
   ↓
Log Error / Send Alert
```

---

## Authentication

### Current State

The MCP HTTP server currently runs **without authentication** for simplicity.

### Adding Authentication (Recommended for Production)

For production deployments, add API key authentication:

1. **Set environment variable:**
   ```
   MCP_API_KEY=your-secret-key-here
   ```

2. **In n8n HTTP Request node, add header:**
   ```
   Authorization: Bearer your-secret-key-here
   ```

3. **Update server code** to validate the API key (modify `src/mcp-http-server.ts`)

---

## Full Tool Reference

### Printing Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `print_document` | `documentName`, `pages`, `color`, `quality`, `paperSize` | Submit a print job |
| `cancel_job` | `jobId` | Cancel a print job |

### Status Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `get_status` | none | Get complete printer status |
| `get_queue` | none | Get current print queue |
| `get_statistics` | none | Get usage statistics |

### Control Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `pause_printer` | none | Pause printer |
| `resume_printer` | none | Resume printer |

### Maintenance Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `clean_print_heads` | none | Run cleaning cycle |
| `align_print_heads` | none | Align print heads |
| `run_nozzle_check` | none | Test nozzles |

### Resource Management

| Tool | Arguments | Description |
|------|-----------|-------------|
| `refill_ink_cartridge` | `color` (cyan/magenta/yellow/black) | Refill ink |
| `load_paper` | `count`, `paperSize` (optional) | Load paper |

### Error Recovery

| Tool | Arguments | Description |
|------|-----------|-------------|
| `clear_paper_jam` | none | Clear paper jam |
| `power_cycle` | none | Restart printer |
| `reset_printer` | none | Factory reset |

---

## Error Handling

### Common Errors

**404 - Tool Not Found**
```json
{
  "error": "Tool not found",
  "availableTools": [...]
}
```
→ Check tool name spelling

**500 - Internal Server Error**
```json
{
  "success": false,
  "error": "Error message here"
}
```
→ Check tool arguments and printer state

**Connection Refused**
→ Ensure MCP HTTP server is running

### Best Practices

1. **Always check response status**
   ```javascript
   if ($json.success === false) {
     throw new Error($json.error);
   }
   ```

2. **Add retry logic** for transient failures

3. **Log errors** to a database or monitoring service

4. **Set timeouts** in n8n HTTP Request node

---

## Testing Your Integration

### 1. Test Tool Discovery

```bash
curl http://localhost:3002/mcp/tools
```

### 2. Test Get Status

```bash
curl -X POST http://localhost:3002/mcp/tools/get_status \
  -H "Content-Type: application/json" \
  -d '{"arguments":{}}'
```

### 3. Test Print Job

```bash
curl -X POST http://localhost:3002/mcp/tools/print_document \
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

---

## Next Steps

- [Deployment Guide](./DEPLOYMENT.md) - Deploy to Vercel
- [README](./README.md) - Full project documentation
- [n8n Documentation](https://docs.n8n.io/) - Learn more about n8n
