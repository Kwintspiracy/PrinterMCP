#!/usr/bin/env node
/**
 * HTTP MCP Server for Virtual Printer
 * Provides HTTP endpoint for n8n and remote access to MCP tools
 */

import express, { Request, Response, NextFunction } from 'express';
import { VirtualPrinter } from './printer.js';
import { StateManager } from './state-manager.js';

const PORT = process.env.MCP_HTTP_PORT || 3002;

// Initialize printer
const stateManager = new StateManager();
const printer = new VirtualPrinter(stateManager);

// Create Express app
const app = express();
app.use(express.json());

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

/**
 * MCP Tools Endpoint
 * POST /mcp/tools/{toolName}
 * Body: { arguments: {...} }
 */
app.post('/mcp/tools/:toolName', async (req: Request, res: Response) => {
  const { toolName } = req.params;
  const { arguments: args = {} } = req.body;

  try {
    let result;

    switch (toolName) {
      case 'print_document':
        result = printer.printDocument(args);
        break;
      
      case 'cancel_job':
        result = { message: printer.cancelJob(args.jobId) };
        break;
      
      case 'get_status':
        result = printer.getStatus();
        break;
      
      case 'get_queue':
        const status = printer.getStatus();
        result = {
          currentJob: status.currentJob,
          queueLength: status.queue.length,
          pendingJobs: status.queue.jobs
        };
        break;
      
      case 'get_statistics':
        result = printer.getStatistics();
        break;
      
      case 'pause_printer':
        result = { message: printer.pause() };
        break;
      
      case 'resume_printer':
        result = { message: printer.resume() };
        break;
      
      case 'refill_ink_cartridge':
        result = { message: printer.refillInk(args.color) };
        break;
      
      case 'load_paper':
        result = { message: printer.loadPaper(args.count, args.paperSize) };
        break;
      
      case 'clean_print_heads':
        result = { message: printer.cleanPrintHeads() };
        break;
      
      case 'align_print_heads':
        result = { message: printer.alignPrintHeads() };
        break;
      
      case 'run_nozzle_check':
        result = { message: printer.runNozzleCheck() };
        break;
      
      case 'clear_paper_jam':
        result = { message: printer.clearPaperJam() };
        break;
      
      case 'power_cycle':
        result = { message: printer.powerCycle() };
        break;
      
      case 'reset_printer':
        result = { message: printer.reset() };
        break;
      
      default:
        return res.status(404).json({
          error: 'Tool not found',
          availableTools: [
            'print_document', 'cancel_job', 'get_status', 'get_queue',
            'get_statistics', 'pause_printer', 'resume_printer',
            'refill_ink_cartridge', 'load_paper', 'clean_print_heads',
            'align_print_heads', 'run_nozzle_check', 'clear_paper_jam',
            'power_cycle', 'reset_printer'
          ]
        });
    }

    res.json({
      success: true,
      tool: toolName,
      result
    });
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * MCP Resources Endpoint
 * GET /mcp/resources/{resourceName}
 */
app.get('/mcp/resources/:resourceName', async (req: Request, res: Response) => {
  const { resourceName } = req.params;

  try {
    let result;

    switch (resourceName) {
      case 'state':
        result = printer.getStatus();
        break;
      
      case 'queue':
        const status = printer.getStatus();
        result = {
          currentJob: status.currentJob,
          queueLength: status.queue.length,
          pendingJobs: status.queue.jobs
        };
        break;
      
      case 'logs':
        const limit = parseInt(req.query.limit as string) || 100;
        result = printer.getLogs(limit);
        break;
      
      case 'statistics':
        result = printer.getStatistics();
        break;
      
      case 'capabilities':
        result = printer.getCapabilities();
        break;
      
      default:
        return res.status(404).json({
          error: 'Resource not found',
          availableResources: ['state', 'queue', 'logs', 'statistics', 'capabilities']
        });
    }

    res.json({
      success: true,
      resource: resourceName,
      data: result
    });
  } catch (error) {
    console.error(`Error accessing resource ${resourceName}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * List available tools
 * GET /mcp/tools
 */
app.get('/mcp/tools', (req: Request, res: Response) => {
  res.json({
    tools: [
      { name: 'print_document', description: 'Submit a print job' },
      { name: 'cancel_job', description: 'Cancel a print job' },
      { name: 'get_status', description: 'Get printer status' },
      { name: 'get_queue', description: 'Get print queue' },
      { name: 'get_statistics', description: 'Get usage statistics' },
      { name: 'pause_printer', description: 'Pause the printer' },
      { name: 'resume_printer', description: 'Resume the printer' },
      { name: 'refill_ink_cartridge', description: 'Refill ink cartridge' },
      { name: 'load_paper', description: 'Load paper' },
      { name: 'clean_print_heads', description: 'Clean print heads' },
      { name: 'align_print_heads', description: 'Align print heads' },
      { name: 'run_nozzle_check', description: 'Run nozzle check' },
      { name: 'clear_paper_jam', description: 'Clear paper jam' },
      { name: 'power_cycle', description: 'Power cycle printer' },
      { name: 'reset_printer', description: 'Reset printer to factory defaults' }
    ]
  });
});

/**
 * List available resources
 * GET /mcp/resources
 */
app.get('/mcp/resources', (req: Request, res: Response) => {
  res.json({
    resources: [
      { name: 'state', description: 'Complete printer state' },
      { name: 'queue', description: 'Print queue' },
      { name: 'logs', description: 'Printer logs' },
      { name: 'statistics', description: 'Usage statistics' },
      { name: 'capabilities', description: 'Printer capabilities' }
    ]
  });
});

/**
 * Health check
 * GET /health
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    const storageType = await stateManager.getStorageType();
    const storageHealthy = await stateManager.healthCheck();
    
    res.json({
      status: 'ok',
      printer: 'Virtual Inkjet Pro',
      storage: {
        type: storageType,
        healthy: storageHealthy
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP HTTP Server running at http://localhost:${PORT}`);
  console.log(`Use POST http://localhost:${PORT}/mcp/tools/{toolName} to call tools`);
  console.log(`Use GET http://localhost:${PORT}/mcp/resources/{resourceName} to access resources`);
  console.log(`Storage type: ${process.env.STORAGE_TYPE || 'file'}`);
});
