/**
 * Vercel Serverless Function: Get Printer Status
 * GET /api/status
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { VirtualPrinter } from '../build/printer.js';
import { StateManager } from '../build/state-manager.js';

// Initialize printer (state will be loaded from Vercel KV)
let printerInstance: VirtualPrinter | null = null;

async function getPrinter() {
  if (!printerInstance) {
    const stateManager = new StateManager();
    printerInstance = new VirtualPrinter(stateManager);
  }
  return printerInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const printer = await getPrinter();
    
    // Give printer a moment to initialize if needed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const status = printer.getStatus();
    
    // Ensure the response has the correct structure
    const safeStatus = {
      name: status.name || 'Virtual Inkjet Pro',
      status: status.status || 'initializing',
      inkLevels: status.inkLevels || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      paper: status.paper || { count: 0, capacity: 100, size: 'A4' },
      currentJob: status.currentJob || null,
      queue: {
        length: status.queue?.length || 0,
        jobs: status.queue?.jobs || []
      },
      errors: status.errors || [],
      uptimeSeconds: status.uptimeSeconds || 0,
      maintenanceNeeded: status.maintenanceNeeded || false
    };
    
    return res.status(200).json(safeStatus);
  } catch (error) {
    console.error('Error getting printer status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
