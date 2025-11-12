/**
 * Vercel Serverless Function: Status Stream
 * GET /api/stream
 * 
 * Note: Full SSE streaming is limited on Vercel serverless.
 * This endpoint returns current status and suggests polling.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { VirtualPrinter } from '../build/printer.js';
import { StateManager } from '../build/state-manager.js';

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
    const printer = await getPrinter();
    
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial status
    const status = printer.getStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);

    // Set up interval to send updates
    const interval = setInterval(async () => {
      try {
        // Reload state before each update to ensure fresh data
        await printer.reloadState();
        const status = printer.getStatus();
        res.write(`data: ${JSON.stringify(status)}\n\n`);
      } catch (error) {
        console.error('Error sending status update:', error);
      }
    }, 1000);

    // Clean up on connection close
    req.on('close', () => {
      clearInterval(interval);
    });
  } catch (error) {
    console.error('Error setting up SSE stream:', error);
    // Return safe default status for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    const defaultStatus = {
      name: 'Virtual Printer',
      status: 'offline',
      inkLevels: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      paper: { count: 0, capacity: 100, size: 'A4' },
      currentJob: null,
      queue: { length: 0, jobs: [] },
      errors: [{ type: 'connection', message: 'Printer initialization failed' }],
      uptimeSeconds: 0,
      maintenanceNeeded: false
    };
    res.write(`data: ${JSON.stringify(defaultStatus)}\n\n`);
  }
}
