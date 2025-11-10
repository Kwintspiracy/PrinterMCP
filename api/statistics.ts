/**
 * Vercel Serverless Function: Get Printer Statistics
 * GET /api/statistics
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
    const statistics = printer.getStatistics();
    return res.status(200).json(statistics);
  } catch (error) {
    console.error('Error getting printer statistics:', error);
    // Return safe default statistics instead of 500 error
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
}
