#!/usr/bin/env node
/**
 * Web UI Server for Virtual Printer
 * Provides a browser-based interface to control and monitor the printer
 */

import express from 'express';
import path from 'path';
import { VirtualPrinter } from './printer.js';
import { StateManager } from './state-manager.js';
import { getMultiPrinterManager } from './multi-printer-manager.js';

const PORT = 3001;

// Initialize printer (shared state with MCP server if needed)
const stateManager = new StateManager();
const printer = new VirtualPrinter(stateManager);
const multiPrinterManager = getMultiPrinterManager();

// Create Express app
const app = express();

// Enable CORS for development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public-react')));

// API Endpoints

// Get current status (supports multi-printer with ?printerId=xxx)
app.get('/api/status', async (req, res) => {
  try {
    const printerId = req.query.printerId as string | undefined;
    
    // Multi-printer mode: get status for specific printer
    if (printerId) {
      console.log(`[StatusAPI] Fetching status for printer: ${printerId}`);
      
      await multiPrinterManager.initialize();
      
      // Debug: list all printers
      const allPrinters = await multiPrinterManager.getAllPrinters();
      console.log(`[StatusAPI] Available printers:`, allPrinters.map(p => ({ id: p.id, name: p.name })));
      
      const printerInstance = await multiPrinterManager.getPrinter(printerId);
      console.log(`[StatusAPI] getPrinter result:`, printerInstance ? { id: printerInstance.id, name: printerInstance.name } : 'null');
      
      if (!printerInstance) {
        console.log(`[StatusAPI] Printer not found: ${printerId}`);
        return res.status(404).json({
          error: 'Printer not found',
          printerId,
          availablePrinters: allPrinters.map(p => ({ id: p.id, name: p.name })),
        });
      }
      
      // Convert PrinterInstance to PrinterStatus format
      const printerType = multiPrinterManager.getPrinterType(printerInstance.typeId);
      
      // Calculate ink status
      const inkStatus = {
        depleted: [] as string[],
        low: [] as string[],
      };
      
      if (printerInstance.inkLevels) {
        for (const [color, level] of Object.entries(printerInstance.inkLevels)) {
          if ((level as number) <= 0) {
            inkStatus.depleted.push(color);
          } else if ((level as number) <= 15) {
            inkStatus.low.push(color);
          }
        }
      }
      
      // Calculate issues
      const issues: string[] = [];
      const canPrint = printerInstance.status === 'ready' && 
                       printerInstance.paperCount > 0 && 
                       inkStatus.depleted.length === 0;
      
      if (printerInstance.paperCount === 0) {
        issues.push('Out of paper');
      } else if (printerInstance.paperCount < 10) {
        issues.push('Low paper');
      }
      
      if (inkStatus.depleted.length > 0) {
        issues.push(`Ink depleted: ${inkStatus.depleted.join(', ')}`);
      } else if (inkStatus.low.length > 0) {
        issues.push(`Low ink: ${inkStatus.low.join(', ')}`);
      }
      
      // Determine operational status
      let operationalStatus: 'ready' | 'not_ready' | 'error' = 'not_ready';
      if (printerInstance.status === 'error') {
        operationalStatus = 'error';
      } else if (canPrint) {
        operationalStatus = 'ready';
      }
      
      // Format queue
      const queue = {
        length: printerInstance.queue?.length || 0,
        jobs: (printerInstance.queue || []).map((job: any) => ({
          id: job.id,
          document: job.documentName || job.document,
          pages: job.pages || 1,
          status: job.status,
          progress: job.progress,
        })),
      };
      
      // Calculate uptime
      const uptimeSeconds = printerInstance.lastStartTime 
        ? Math.floor((Date.now() - printerInstance.lastStartTime) / 1000)
        : 0;
      
      const status = {
        id: printerInstance.id,
        name: printerInstance.name,
        typeId: printerInstance.typeId,
        type: printerType ? {
          brand: printerType.brand,
          model: printerType.model,
          category: printerType.category,
          inkSystem: printerType.inkSystem,
          icon: printerType.icon,
        } : null,
        status: printerInstance.status || 'initializing',
        operationalStatus,
        canPrint,
        issues,
        inkLevels: printerInstance.inkLevels || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        inkStatus,
        paper: {
          count: printerInstance.paperCount || 0,
          capacity: printerInstance.paperTrayCapacity || 100,
          size: printerInstance.paperSize || 'A4',
        },
        currentJob: printerInstance.currentJob || null,
        queue,
        errors: printerInstance.errors || [],
        uptimeSeconds,
        maintenanceNeeded: printerInstance.statistics?.lastMaintenanceDate 
          ? (Date.now() - printerInstance.statistics.lastMaintenanceDate) > (30 * 24 * 60 * 60 * 1000)
          : false,
        statistics: printerInstance.statistics || null,
        locationId: printerInstance.locationId,
      };
      
      console.log('[StatusAPI] Multi-printer status retrieved:', {
        printerId: status.id,
        name: status.name,
        status: status.status,
      });
      
      return res.json(status);
    }
    
    // Legacy single-printer mode
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
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = printer.getLogs(limit).map(log => ({
      timestamp: log.timestamp,
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

// Set paper count to specific value
app.post('/api/set-paper', async (req, res) => {
  try {
    const { count, paperSize } = req.body;

    if (count === undefined || count < 0 || count > 500) {
      return res.status(400).json({
        success: false,
        error: 'count must be between 0 and 500'
      });
    }

    // Load current state, modify it, and save it back
    const state = await stateManager.loadState();
    state.paperCount = count;
    if (paperSize) {
      state.paperSize = paperSize;
    }
    await stateManager.saveState(state);

    // Reload printer state to reflect changes immediately
    await printer.reloadState();

    // Log the change
    console.log(`Set paper count to ${count} sheets${paperSize ? ` (${paperSize})` : ''}`);

    res.json({
      success: true,
      message: `Paper count set to ${count} sheets${paperSize ? ` (${paperSize})` : ''}`
    });
  } catch (error) {
    console.error('Error setting paper count:', error);
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

// Get info (statistics or logs)
app.get('/api/info', (req, res) => {
  try {
    const type = req.query.type as string;
    
    if (type === 'statistics') {
      const stats = printer.getStatistics();
      res.json(stats);
    } else if (type === 'logs') {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = printer.getLogs(limit).map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message
      }));
      res.json({ logs });
    } else {
      res.json({
        name: 'Virtual Printer',
        version: '1.0.0',
        status: printer.getStatus().status
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Multi-Printer API - Get all printers
app.get('/api/printers', async (req, res) => {
  try {
    const [printers, locations, summary] = await Promise.all([
      multiPrinterManager.getAllPrinters(),
      multiPrinterManager.getAllLocations(),
      multiPrinterManager.getStateSummary(),
    ]);

    const printerTypes = multiPrinterManager.getAvailablePrinterTypes();

    // Enhance printers with type info
    const enrichedPrinters = printers.map(printer => {
      const type = multiPrinterManager.getPrinterType(printer.typeId);
      return {
        ...printer,
        type: type ? {
          brand: type.brand,
          model: type.model,
          category: type.category,
          inkSystem: type.inkSystem,
          icon: type.icon,
          features: type.features,
        } : null,
      };
    });

    // Group printers by location
    const printersByLocation: Record<string, typeof enrichedPrinters> = {};
    const unassignedPrinters: typeof enrichedPrinters = [];

    for (const p of enrichedPrinters) {
      if (p.locationId) {
        if (!printersByLocation[p.locationId]) {
          printersByLocation[p.locationId] = [];
        }
        printersByLocation[p.locationId].push(p);
      } else {
        unassignedPrinters.push(p);
      }
    }

    res.json({
      success: true,
      printers: enrichedPrinters,
      locations,
      printersByLocation,
      unassignedPrinters,
      summary,
      availableTypes: printerTypes.map(t => ({
        id: t.id,
        brand: t.brand,
        model: t.model,
        category: t.category,
        inkSystem: t.inkSystem,
        icon: t.icon,
        description: t.description,
      })),
    });
  } catch (error) {
    console.error('Error getting printers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Multi-Printer API - Add a new printer
app.post('/api/printers', async (req, res) => {
  try {
    const { name, typeId, locationId } = req.body;

    if (!name || !typeId) {
      return res.status(400).json({
        success: false,
        error: 'Name and typeId are required',
      });
    }

    const printerType = multiPrinterManager.getPrinterType(typeId);
    if (!printerType) {
      return res.status(400).json({
        success: false,
        error: `Invalid printer type: ${typeId}`,
      });
    }

    const newPrinter = await multiPrinterManager.addPrinter(name, typeId, locationId);

    res.status(201).json({
      success: true,
      printer: {
        ...newPrinter,
        type: {
          brand: printerType.brand,
          model: printerType.model,
          category: printerType.category,
          inkSystem: printerType.inkSystem,
          icon: printerType.icon,
        },
      },
      message: `Printer "${name}" created successfully`,
    });
  } catch (error) {
    console.error('Error adding printer:', error);
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
