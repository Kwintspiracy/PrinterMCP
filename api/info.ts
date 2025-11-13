/**
 * Vercel Serverless Function: Consolidated Information Endpoint
 * GET /api/info?type=logs|statistics|diagnostics
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

  const type = req.query.type as string;

  try {
    const printer = await getPrinter();

    switch (type) {
      case 'logs': {
        const limit = parseInt(req.query.limit as string) || 100;
        const logs = printer.getLogs(limit);
        return res.status(200).json(logs);
      }

      case 'statistics': {
        const stats = printer.getStatistics();
        return res.status(200).json(stats);
      }

      case 'diagnostics': {
        const status = printer.getStatus();
        const stats = printer.getStatistics();
        const logs = printer.getLogs(20);

        return res.status(200).json({
          status,
          statistics: stats,
          recentLogs: logs,
          timestamp: new Date().toISOString(),
          environment: {
            nodeVersion: process.version,
            platform: process.platform,
            storageType: process.env.STORAGE_TYPE || 'file',
            isVercel: !!(process.env.VERCEL || process.env.STORAGE_TYPE === 'vercel-kv')
          }
        });
      }

      default:
        return res.status(400).json({ 
          error: 'Invalid type parameter',
          availableTypes: ['logs', 'statistics', 'diagnostics']
        });
    }
  } catch (error) {
    console.error('Error getting information:', error);
    
    // Return safe defaults based on type
    if (type === 'logs') {
      return res.status(200).json({ logs: [] });
    } else if (type === 'statistics') {
      return res.status(200).json({
        totalPagesPrinted: 0,
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        completedJobs: 0,
        totalInkUsed: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        maintenanceCycles: 0,
        totalErrors: 0,
        averageJobSize: 0,
        successRate: 0
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
