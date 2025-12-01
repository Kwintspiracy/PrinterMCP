/**
 * Vercel Serverless Function: Get Diagnostics
 * GET /api/diagnostics
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
  await printerInstance.reloadState();
  return printerInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const stateManager = new StateManager();
    
    const status = printer.getStatus();
    const stats = printer.getStatistics();
    const storageType = await stateManager.getStorageType();
    const storageHealthy = await stateManager.healthCheck();
    
    return res.status(200).json({
      printer: {
        name: status.name,
        status: status.status,
        operationalStatus: status.operationalStatus,
        canPrint: status.canPrint,
        uptime: status.uptimeSeconds
      },
      storage: {
        type: storageType,
        healthy: storageHealthy
      },
      statistics: {
        totalJobs: stats.totalJobs,
        successfulJobs: stats.successfulJobs,
        failedJobs: stats.failedJobs,
        totalPages: stats.totalPagesPrinted
      },
      environment: {
        isVercel: !!(process.env.VERCEL || process.env.VERCEL_ENV),
        storageType: process.env.STORAGE_TYPE || 'file',
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting diagnostics:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
