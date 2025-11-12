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
  // Always reload state from storage to get latest updates
  await printerInstance.reloadState();
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
    console.log('[StatusAPI] Fetching printer status...');
    const printer = await getPrinter();
    await printer.ensureInitialized();
    
    const status = printer.getStatus();
    console.log('[StatusAPI] Status retrieved:', status.status);
    
    // Ensure the response has the correct structure with proper fallbacks
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
    
    // Add debug info if requested
    if (req.query.debug === 'true') {
      (safeStatus as any).debug = {
        isServerless: !!(process.env.VERCEL || process.env.STORAGE_TYPE === 'vercel-kv'),
        storageType: process.env.STORAGE_TYPE || 'file',
        hasVercelEnv: !!process.env.VERCEL,
        timestamp: new Date().toISOString()
      };
    }
    
    return res.status(200).json(safeStatus);
  } catch (error) {
    console.error('Error getting printer status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      // Return a safe default status on error
      fallback: {
        name: 'Virtual Inkjet Pro',
        status: 'error',
        inkLevels: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        paper: { count: 0, capacity: 100, size: 'A4' },
        currentJob: null,
        queue: { length: 0, jobs: [] },
        errors: [{ type: 'system', message: 'Failed to load printer state' }],
        uptimeSeconds: 0,
        maintenanceNeeded: false
      }
    });
  }
}
