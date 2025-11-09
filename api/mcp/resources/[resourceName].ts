/**
 * Vercel Serverless Function: MCP Resources Endpoint
 * GET /api/mcp/resources/{resourceName}
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { VirtualPrinter } from '../../../build/printer.js';
import { StateManager } from '../../../build/state-manager.js';

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
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resourceName } = req.query;

  try {
    const printer = await getPrinter();
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

    return res.status(200).json({
      success: true,
      resource: resourceName,
      data: result
    });
  } catch (error) {
    console.error(`Error accessing resource ${resourceName}:`, error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
