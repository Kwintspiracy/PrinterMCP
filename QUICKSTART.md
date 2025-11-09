# Quick Start Guide

Get your virtual printer running in 5 minutes!

## 1. Install (Choose One Method)

### Method A: npx (Easiest - No Installation)
Skip to step 2!

### Method B: Local Setup
```bash
cd virtual-printer-mcp
npm install
npm run build
```

## 2. Configure Your MCP Client

### For Claude Desktop

**Windows:**
1. Press `Win + R`
2. Type `%APPDATA%\Claude` and press Enter
3. Create/edit `claude_desktop_config.json`:

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

**Mac:**
```bash
# Edit config
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Linux:**
```bash
# Edit config
nano ~/.config/Claude/claude_desktop_config.json
```

### For Cline (VS Code)
Automatically detects from Claude Desktop config, or add to VS Code settings.

## 3. Restart Your MCP Client

Completely quit and restart Claude Desktop or reload VS Code.

## 4. Test It!

Ask your AI assistant:

```
Check the printer status
```

You should see:
- Status: warming_up → ready (takes ~12 seconds)
- Ink: All at 100%
- Paper: 100 sheets
- Queue: Empty

## 5. Print Something!

```
Print a test document with 5 pages in color
```

The assistant will:
1. Submit the print job
2. Return a job ID
3. Estimate completion time

## 6. Monitor Progress

```
Show me the current printer status
```

Watch as:
- Pages print one by one
- Ink levels decrease
- Paper count goes down

## Common First Commands

### Check Status
```
What's the printer status?
```

### Print a Document
```
Print a 10-page color document called "Monthly Report"
```

### View Queue
```
Show me the print queue
```

### Check Ink Levels
```
What are the current ink levels?
```

### Refill Ink
```
Refill the cyan ink cartridge
```

### Add Paper
```
Load 50 sheets of A4 paper
```

### Get Statistics
```
Show me printing statistics
```

## Understanding the Output

### Status Values
- `offline` - Printer is off
- `warming_up` - Starting up (~12 seconds)
- `ready` - Ready to print
- `printing` - Currently printing
- `maintenance` - Running maintenance cycle
- `error` - Has an error (check errors array)
- `paused` - Queue processing paused

### Ink Levels
- 100-75%: Good
- 75-25%: Normal
- 25-15%: Low (warning)
- 15-0%: Very low
- 0%: Empty (cannot print)

### Print Quality Impact

| Quality | Speed | Ink Usage |
|---------|-------|-----------|
| Draft | Fastest (30% faster) | Lowest (0.5% per page) |
| Normal | Standard (15 ppm) | Standard (1% per page) |
| High | Slower (50% slower) | Higher (1.5% per page) |
| Photo | Slowest (150% slower) | Highest (2.5% per page) |

## Troubleshooting

### "Printer not found"
- Wait 15 seconds after starting Claude Desktop
- Check MCP config file syntax
- Restart the application completely

### "Out of paper"
```
Load 100 sheets of paper
```

### "Low ink"
```
Refill the cyan ink
Refill the magenta ink
Refill the yellow ink
Refill the black ink
```

### "Paper jam"
```
Clear the paper jam
```

### Hard Reset
```
Reset the printer to factory defaults
```
⚠️ This clears all jobs, statistics, and resets ink/paper to 100%

## What's Happening Behind the Scenes?

1. **State File Created**: `~/.virtual-printer/printer-state.json`
2. **Automatic Saves**: State persists across restarts
3. **Realistic Timing**: Jobs take real time to "print"
4. **Error Simulation**: 5% chance of paper jams (can be disabled)
5. **Maintenance Tracking**: Reminds you after 500 pages

## Next Steps

1. ✅ You've got it running!
2. 📖 Read [README.md](README.md) for all features
3. 🔧 Check [SETUP.md](SETUP.md) for advanced config
4. 🧪 Experiment with different scenarios:
   - Run out of ink
   - Cause a paper jam
   - Try different quality settings
   - Monitor statistics over time

## Fun Things to Try

### Stress Test
```
Print 5 documents:
- Document 1: 20 pages, draft, black & white
- Document 2: 10 pages, high quality, color
- Document 3: 5 pages, photo quality, color
- Document 4: 15 pages, normal, black & white
- Document 5: 3 pages, high quality, color
```

### Maintenance Routine
```
After printing 100 pages, run a full maintenance:
1. Run nozzle check
2. Clean print heads
3. Align print heads
4. Check statistics
```

### Recovery Scenario
```
1. Start printing a large job
2. Simulate running out of paper mid-job
3. Load more paper
4. Resume printing
```

## Support

Having issues? Check:
- [README.md](README.md) - Full documentation
- [SETUP.md](SETUP.md) - Detailed setup guide
- Node.js version: Should be 18+
- Config file: Valid JSON syntax

Happy printing! 🖨️✨
