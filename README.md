# Virtual Printer MCP Server

A fully-featured virtual inkjet printer simulator accessible through the Model Context Protocol (MCP). This server provides realistic printer behavior including ink levels, paper management, job queues, maintenance operations, and error simulation.

## Features

### 🖨️ Complete Printer Simulation
- **CMYK Ink System**: Realistic ink consumption based on print quality and color
- **Paper Management**: Tray capacity, multiple paper sizes, out-of-paper detection
- **Job Queue**: FIFO processing with real-time status updates
- **Print Quality Settings**: Draft, Normal, High, and Photo modes
- **Maintenance Operations**: Print head cleaning, alignment, and nozzle checks
- **Error Simulation**: Paper jams, hardware errors, low ink warnings
- **Persistent State**: Survives restarts, stored in user's home directory

### 🔧 MCP Integration
- **15 Tools**: Complete printer control and management
- **5 Resources**: Real-time access to printer state, logs, and statistics
- **LLM-Friendly**: Clear descriptions and error messages for AI interaction

## Installation

### Option 1: Using npx (Recommended)
No installation required! Just add to your MCP configuration:

```json
{
  "mcpServers": {
    "virtual-printer": {
      "command": "npx",
      "args": ["-y", "virtual-printer-mcp"]
    }
  }
}
```

### Option 2: Global Installation
```bash
npm install -g virtual-printer-mcp
```

Then use in MCP config:
```json
{
  "mcpServers": {
    "virtual-printer": {
      "command": "virtual-printer-mcp"
    }
  }
}
```

### Option 3: Local Installation
```bash
git clone <repository-url>
cd virtual-printer-mcp
npm install
npm run build
```

Use in MCP config:
```json
{
  "mcpServers": {
    "virtual-printer": {
      "command": "node",
      "args": ["C:/path/to/virtual-printer-mcp/build/index.js"]
    }
  }
}
```

## Quick Start

1. **Add to your MCP client** (Claude Desktop, ChatGPT, etc.)
2. **The printer auto-starts** and warms up (~12 seconds)
3. **Check printer status**:
   ```
   use_mcp_tool("get_status")
   ```
4. **Print a document**:
   ```
   use_mcp_tool("print_document", {
     documentName: "Test Document",
     pages: 5,
     color: true,
     quality: "normal"
   })
   ```

## MCP Tools

### Printing Operations
- **`print_document`** - Submit a print job
  - Parameters: `documentName` (string), `pages` (number), `color` (boolean), `quality` (draft/normal/high/photo), `paperSize` (A4/Letter/Legal/A3/4x6)
  - Returns: Job ID and estimated completion time

- **`cancel_job`** - Cancel a print job
  - Parameters: `jobId` (string)

- **`pause_printer`** - Pause job processing
- **`resume_printer`** - Resume job processing

### Status & Monitoring
- **`get_status`** - Get current printer state
  - Returns: Status, ink levels, paper count, current job, queue, errors

- **`get_queue`** - View print queue
- **`get_statistics`** - Usage statistics and metrics

### Maintenance
- **`clean_print_heads`** - Run cleaning cycle (8s, uses 2% ink)
- **`align_print_heads`** - Align print heads (6s, uses 1 sheet)
- **`run_nozzle_check`** - Test nozzle operation (4s, uses 1 sheet)

### Resource Management
- **`refill_ink_cartridge`** - Refill ink to 100%
  - Parameters: `color` (cyan/magenta/yellow/black)

- **`load_paper`** - Add paper to tray
  - Parameters: `count` (number), `paperSize` (optional)

### Error Recovery
- **`clear_paper_jam`** - Clear paper jam errors
- **`power_cycle`** - Restart printer (15s)
- **`reset_printer`** - Factory reset (clears all data)

## MCP Resources

Access read-only data via `access_mcp_resource`:

- **`printer://state`** - Complete printer state
- **`printer://queue`** - Current print queue
- **`printer://logs`** - Recent event logs (last 100)
- **`printer://statistics`** - Usage statistics
- **`printer://capabilities`** - Printer specifications

## Configuration

### Default Configuration
The printer uses these defaults:
- **Name**: Virtual Inkjet Pro
- **Print Speed**: 15 pages per minute
- **Ink Capacity**: 100% (all colors)
- **Paper Capacity**: 100 sheets
- **Error Simulation**: Enabled (5% probability)
- **State File**: `~/.virtual-printer/printer-state.json`

### State Persistence
Printer state is automatically saved to:
- **Windows**: `C:\Users\<username>\.virtual-printer\printer-state.json`
- **Mac/Linux**: `~/.virtual-printer/printer-state.json`

State persists across restarts unless you use `reset_printer`.

## Realistic Behavior

### Ink Consumption
- **Draft Mode**: 0.5% per page (color), 0.6% black only
- **Normal Mode**: 1% per page (color), 1.2% black only
- **High Quality**: 1.5% per page (color), 1.8% black only
- **Photo Mode**: 2.5% per page (color), 3% black only

### Print Speed
- **Draft**: ~70% faster than normal
- **Normal**: 15 pages/minute (baseline)
- **High**: 50% slower than normal
- **Photo**: 150% slower than normal

### Errors
When error simulation is enabled (default):
- **Paper Jams**: 5% chance during printing
- **Hardware Errors**: Rare, requires power cycle
- **Low Ink Warnings**: Below 15%
- **Out of Paper**: Automatic detection

## Example Usage

### Basic Printing
```javascript
// Check status
use_mcp_tool("get_status")

// Print a document
use_mcp_tool("print_document", {
  documentName: "Report.pdf",
  pages: 10,
  color: true,
  quality: "normal"
})

// Monitor progress
use_mcp_tool("get_status")
// Wait for completion...

// Check statistics
use_mcp_tool("get_statistics")
```

### Handling Errors
```javascript
// Paper jam occurred!
use_mcp_tool("get_status")
// Shows: status: "error", errors: [{ type: "paper_jam", ... }]

// Clear the jam
use_mcp_tool("clear_paper_jam")

// Resume printing
use_mcp_tool("resume_printer")
```

### Maintenance
```javascript
// Check if maintenance needed
use_mcp_tool("get_status")
// maintenanceNeeded: true after 450+ pages

// Run cleaning cycle
use_mcp_tool("clean_print_heads")
// Wait 8 seconds...

// Verify with nozzle check
use_mcp_tool("run_nozzle_check")
```

### Resource Management
```javascript
// Refill low ink
use_mcp_tool("refill_ink_cartridge", { color: "cyan" })

// Load more paper
use_mcp_tool("load_paper", { 
  count: 50, 
  paperSize: "Letter" 
})
```

## Transferring to New Computer

### Method 1: Copy Project Folder
1. Copy the `virtual-printer-mcp` folder
2. Run `npm install && npm run build`
3. Update MCP config with new path
4. (Optional) Copy `~/.virtual-printer/printer-state.json` to preserve state

### Method 2: Use npx
Just update your MCP config on the new computer - npx handles everything!

### Method 3: Publish to npm
```bash
npm publish
```
Then install globally on any computer.

## Troubleshooting

### Printer Won't Start
- Check MCP server is running: Look for "Virtual Printer MCP Server running on stdio"
- Verify Node.js version: Requires Node 18+
- Check file permissions on state directory

### State Not Persisting
- Verify `~/.virtual-printer/` directory exists
- Check write permissions
- Look for errors in MCP logs

### Tools Not Appearing
- Restart your MCP client
- Verify server is in MCP config correctly
- Check for syntax errors in config JSON

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Testing Manually
```bash
node build/index.js
```
Then send MCP protocol messages via stdin.

## Technical Details

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Protocol**: MCP (Model Context Protocol)
- **State Storage**: JSON files
- **Architecture**: Event-driven with async job processing

## License

MIT

## Author

Created for prototyping and testing MCP integration with simulated hardware devices.
