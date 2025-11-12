/**
 * Vercel Serverless Function: Diagnostics
 * GET /api/diagnostics
 * 
 * Returns diagnostic information about the printer environment
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
    const stateManager = new StateManager();
    
    // Get environment info
    const environmentInfo = {
      VERCEL: process.env.VERCEL || 'not set',
      STORAGE_TYPE: process.env.STORAGE_TYPE || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? 'set' : 'not set',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'set' : 'not set',
    };

    // Check storage health
    let storageInfo;
    try {
      const storageType = await stateManager.getStorageType();
      const isHealthy = await stateManager.healthCheck();
      storageInfo = {
        type: storageType,
        healthy: isHealthy,
        error: null
      };
    } catch (error) {
      storageInfo = {
        type: 'unknown',
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Get printer status
    let printerInfo;
    try {
      const printer = await getPrinter();
      await printer.ensureInitialized();
      const status = printer.getStatus();
      const logs = printer.getLogs(10);
      
      printerInfo = {
        initialized: true,
        status: status.status,
        name: status.name,
        inkLevels: status.inkLevels,
        paperCount: status.paper.count,
        errors: status.errors,
        recentLogs: logs,
        error: null
      };
    } catch (error) {
      printerInfo = {
        initialized: false,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
    }

    // Return comprehensive diagnostic info
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: environmentInfo,
      storage: storageInfo,
      printer: printerInfo,
      serverless: !!(process.env.VERCEL || process.env.STORAGE_TYPE === 'vercel-kv')
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return res.status(500).json({
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
