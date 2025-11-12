#!/usr/bin/env node
/**
 * Web UI Server for Virtual Printer
 * Provides a browser-based interface to control and monitor the printer
 */

import express from 'express';
import path from 'path';
// Note: Import paths will work after initial build
const { VirtualPrinter } = require('../build/printer.js');
const { StateManager } = require('../build/state-manager.js');

const PORT = 3001;

// Initialize printer (shared state with MCP server if needed)
const stateManager = new StateManager();
const printer = new VirtualPrinter(stateManager);

// Create Express app
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public-react')));

// API Endpoints

// Get current status
app.get('/api/status', (req, res) => {
  try {
    const status = printer.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get print queue
app.get('/api/queue', (req, res) => {
  try {
    const status = printer.getStatus();
    res.json({
      currentJob: status.currentJob,
      queueLength: status.queue.length,
      pendingJobs: status.queue.jobs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get statistics
app.get('/api/statistics', (req, res) => {
  try {
    const stats = printer.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get logs
app.get('/api/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = printer.getLogs(limit).map((log: any) => ({
      timestamp: new Date(log.timestamp).toISOString(),
      level: log.level,
      message: log.message
    }));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get capabilities
app.get('/api/capabilities', (req, res) => {
  try {
    const capabilities = printer.getCapabilities();
    res.json(capabilities);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Print document
app.post('/api/print', (req, res) => {
  try {
    const { documentName, pages, color, quality, paperSize } = req.body;
    
    if (!documentName || !pages) {
      return res.status(400).json({ 
        success: false, 
        error: 'documentName and pages are required' 
      });
    }

    const result = printer.printDocument({
      documentName,
      pages,
      color: color ?? false,
      quality: quality ?? 'normal',
      paperSize: paperSize ?? 'A4'
    });

    res.json({
      success: true,
      jobId: result.jobId,
      message: result.message,
      estimatedTimeSeconds: result.estimatedTime
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Cancel job
app.post('/api/cancel/:jobId', (req, res) => {
  try {
    const message = printer.cancelJob(req.params.jobId);
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Pause printer
app.post('/api/pause', (req, res) => {
  try {
    const message = printer.pause();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Resume printer
app.post('/api/resume', (req, res) => {
  try {
    const message = printer.resume();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Refill ink
app.post('/api/refill/:color', (req, res) => {
  try {
    const color = req.params.color as 'cyan' | 'magenta' | 'yellow' | 'black';
    const message = printer.refillInk(color);
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Set ink level to specific percentage
app.post('/api/set-ink/:color', async (req, res) => {
  try {
    const color = req.params.color as 'cyan' | 'magenta' | 'yellow' | 'black';
    const { level } = req.body;
    
    if (level === undefined || level < 0 || level > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'level must be between 0 and 100' 
      });
    }

    // Load current state, modify it, and save it back
    const state = await stateManager.loadState();
    state.inkLevels[color] = level;
    await stateManager.saveState(state);
    
    // Reload printer state to reflect changes immediately
    await printer.reloadState();
    
    // Log the change
    console.log(`Set ${color} ink to ${level}%`);
    
    res.json({ 
      success: true, 
      message: `${color.charAt(0).toUpperCase() + color.slice(1)} ink set to ${level}%` 
    });
  } catch (error) {
    console.error('Error setting ink level:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Load paper
app.post('/api/load-paper', (req, res) => {
  try {
    const { count, paperSize } = req.body;
    
    if (!count) {
      return res.status(400).json({ 
        success: false, 
        error: 'count is required' 
      });
    }

    const message = printer.loadPaper(count, paperSize);
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Clean print heads
app.post('/api/clean', (req, res) => {
  try {
    const message = printer.cleanPrintHeads();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Align print heads
app.post('/api/align', (req, res) => {
  try {
    const message = printer.alignPrintHeads();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Run nozzle check
app.post('/api/nozzle-check', (req, res) => {
  try {
    const message = printer.runNozzleCheck();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Clear paper jam
app.post('/api/clear-jam', (req, res) => {
  try {
    const message = printer.clearPaperJam();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Power cycle
app.post('/api/power-cycle', (req, res) => {
  try {
    const message = printer.powerCycle();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Reset printer
app.post('/api/reset', (req, res) => {
  try {
    const message = printer.reset();
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Server-Sent Events for real-time updates
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send status updates every 1 second
  const interval = setInterval(() => {
    try {
      const status = printer.getStatus();
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    } catch (error) {
      console.error('Error streaming status:', error);
    }
  }, 1000);

  // Cleanup on connection close
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Virtual Printer Web UI running at http://localhost:${PORT}`);
  console.log(`Open your browser to access the dashboard`);
});
