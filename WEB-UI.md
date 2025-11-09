# Virtual Printer Web UI

A browser-based dashboard for controlling and monitoring the virtual printer with real-time updates.

## Quick Start

1. **Start the Web UI Server**
   ```bash
   npm run dev:web
   ```

2. **Open in Browser**
   ```
   http://localhost:3001
   ```

3. **Start Testing**
   - The dashboard will automatically connect and display real-time printer status
   - All controls are accessible through the UI
   - Changes update instantly via Server-Sent Events (SSE)

## Features

### 🎛️ Dashboard Panels

#### Status Panel
- Current printer status (ready, printing, paused, error, etc.)
- Printer model and configuration
- Current print job with progress bar
- Active error messages

#### Ink Levels Display
- Visual gauges for all four colors (Cyan, Magenta, Yellow, Black)
- Percentage displays with color-coded indicators
- Quick refill buttons for each cartridge
- Low ink warnings (below 15%)

#### Paper Management
- Current paper count with visual indicator
- Paper tray capacity display
- Load paper controls with quantity and size selection
- Support for multiple paper sizes (A4, Letter, Legal, A3, 4x6)

#### Print Queue
- Real-time queue status
- List of pending jobs with details
- Cancel individual jobs
- Queue length counter

#### Control Panel
- **Pause/Resume**: Control print queue processing
- **Power Cycle**: Restart the printer (15 seconds)
- **Reset**: Factory reset (clears all data)
- **Maintenance Operations**:
  - Clean Print Heads (8s, uses 2% ink)
  - Align Print Heads (6s, uses 1 sheet)
  - Run Nozzle Check (4s, uses 1 sheet)
  - Clear Paper Jam

#### Test Print Section
- Submit test print jobs directly from UI
- Configure:
  - Document name
  - Page count
  - Color or black & white
  - Quality (draft, normal, high, photo)
  - Paper size
- Instant feedback on job submission

#### Statistics
- Total pages printed
- Success rate percentage
- Completed job count
- Failed job count

#### Event Log
- Real-time event stream
- Color-coded by severity (info, warning, error)
- Timestamp for each event
- Auto-scroll to latest events
- Refresh and clear controls

## Real-Time Updates

The dashboard uses **Server-Sent Events (SSE)** to provide real-time updates:

- Status updates every second
- Automatic reconnection on connection loss
- No page refresh needed
- Instant feedback on all operations

## User Interface

### Visual Design
- Modern, responsive layout
- Purple gradient theme
- Clean card-based design
- Smooth animations and transitions
- Mobile-friendly (responsive grid)

### Interactive Elements
- Toast notifications for all actions
- Progress bars for active jobs
- Visual ink level gauges
- Color-coded status indicators
- Confirmation dialogs for destructive actions

## API Endpoints

The web server exposes these REST API endpoints:

### Status & Monitoring
- `GET /api/status` - Current printer status
- `GET /api/queue` - Print queue
- `GET /api/statistics` - Usage statistics
- `GET /api/logs?limit=N` - Recent logs
- `GET /api/capabilities` - Printer specifications
- `GET /api/stream` - SSE endpoint for real-time updates

### Print Operations
- `POST /api/print` - Submit print job
- `POST /api/cancel/:jobId` - Cancel specific job
- `POST /api/pause` - Pause printer
- `POST /api/resume` - Resume printer

### Resource Management
- `POST /api/refill/:color` - Refill ink (cyan/magenta/yellow/black)
- `POST /api/load-paper` - Load paper

### Maintenance
- `POST /api/clean` - Clean print heads
- `POST /api/align` - Align print heads
- `POST /api/nozzle-check` - Run nozzle check
- `POST /api/clear-jam` - Clear paper jam

### System
- `POST /api/power-cycle` - Power cycle printer
- `POST /api/reset` - Reset to factory defaults

## Usage Examples

### Testing Low Ink Scenarios

1. Start with full ink (100%)
2. Submit several high-quality color print jobs
3. Watch ink levels decrease in real-time
4. When ink is low (< 15%), warning appears
5. Click "Refill" button to refill specific color

### Simulating Paper Jam

1. Print a large job (20+ pages)
2. If error simulation is enabled, paper jam may occur (5% chance)
3. Error appears in status panel
4. Click "Clear Jam" in maintenance section
5. Resume printing

### Testing Different Quality Settings

1. Print same document with different qualities:
   - Draft: Fast, low ink usage
   - Normal: Standard quality
   - High: Better quality, more ink
   - Photo: Best quality, highest ink usage
2. Observe different:
   - Print speeds
   - Ink consumption rates
   - Completion times

### Monitoring Statistics

1. Print various jobs over time
2. Check statistics panel for:
   - Total pages printed
   - Success rate
   - Completed vs failed jobs
3. Statistics persist across sessions

## Running with MCP Server

You can run both the MCP server (for Claude/Cline) and the Web UI simultaneously:

### Terminal 1 - MCP Server (for Claude/Cline)
```bash
node build/index.js
```

### Terminal 2 - Web UI Server
```bash
npm run start:web
```

**Note**: Both servers create their own printer instance with separate state. If you want shared state, you would need to implement a state synchronization mechanism.

## Configuration

### Port
Default port is `3001`. To change:

Edit `src/web-server.ts`:
```typescript
const PORT = 3001; // Change this
```

Then rebuild:
```bash
npm run build:web
```

### Update Interval
Real-time updates are sent every 1 second. To change:

Edit `src/web-server.ts` in the `/api/stream` endpoint:
```typescript
const interval = setInterval(() => {
  // ...
}, 1000); // Change this (milliseconds)
```

## Troubleshooting

### Port Already in Use
If port 3001 is already in use:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**: Change the port in `src/web-server.ts` or stop the process using port 3001.

### Dashboard Not Updating
1. Check browser console for errors
2. Verify EventSource connection is active
3. Ensure web server is running
4. Try refreshing the page

### Printer State Not Persisting
The web server creates its own printer instance separate from the MCP server. Each maintains its own state file at `~/.virtual-printer/printer-state.json`.

### Build Errors
If you encounter TypeScript errors:
```bash
npm install
npm run build:web
```

## Development

### File Structure
```
virtual-printer-mcp/
├── src/
│   └── web-server.ts          # Express server
├── public/
│   ├── index.html             # Dashboard HTML
│   ├── styles.css             # Styling
│   └── app.js                 # Frontend JavaScript
├── build/
│   └── web-server.js          # Compiled server
└── package.json
```

### Making Changes

**Backend (API)**:
1. Edit `src/web-server.ts`
2. Run `npm run build:web`
3. Restart server with `npm run start:web`

**Frontend (UI)**:
1. Edit files in `public/` directory
2. No build step needed (static files)
3. Refresh browser to see changes

### Adding New Features

**New API Endpoint**:
```typescript
app.post('/api/my-feature', (req, res) => {
  try {
    // Your code here
    res.json({ success: true, message: 'Feature works!' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});
```

**New UI Button**:
```javascript
// In app.js
async function myFeature() {
  try {
    const response = await fetch(`${API_BASE}/api/my-feature`, {
      method: 'POST'
    });
    const result = await response.json();
    showToast(result.message, result.success ? 'success' : 'error');
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}
```

## Browser Support

Tested on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Requirements**:
- JavaScript enabled
- EventSource API support (for real-time updates)
- Modern CSS support (Grid, Flexbox)

## Security Notes

⚠️ **This is a development tool**. The web server:
- Has no authentication
- Should only be run locally
- Should not be exposed to the internet
- Is intended for testing and development only

## Performance

- Updates: ~1KB per second (status updates)
- Memory: ~50MB average
- CPU: Minimal (<1% on modern systems)
- Network: Local only (no external requests)

## Keyboard Shortcuts

Currently none implemented, but could be added:
- `Ctrl+P`: Submit print job
- `Ctrl+R`: Reload statistics
- `Ctrl+L`: Focus on log panel
- `Esc`: Close dialogs/confirmations

## Future Enhancements

Potential features to add:
- [ ] Dark mode toggle
- [ ] Multiple printer support
- [ ] Historical charts/graphs
- [ ] Export statistics to CSV
- [ ] Print job templates
- [ ] Keyboard shortcuts
- [ ] Printer sound effects
- [ ] Job scheduling
- [ ] Batch operations
- [ ] WebSocket for even faster updates

## License

Same as the main project (MIT).

## Support

For issues or questions:
1. Check this documentation
2. Review the main README.md
3. Check browser console for errors
4. Verify server is running on port 3001
