/**
 * Vercel Serverless Function: Health Check
 * GET /api/health
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { loadStateManager } from './_lib';

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
    const StateManager = await loadStateManager();
    const stateManager = new StateManager();
    const storageType = await stateManager.getStorageType();
    const storageHealthy = await stateManager.healthCheck();

    // Get state version info
    let stateInfo: any = {
      exists: false,
      version: null
    };

    try {
      const state = await stateManager.loadState();
      if (state) {
        stateInfo = {
          exists: true,
          version: state.version || 0,
          status: state.status,
          lastUpdated: state.lastUpdated
        };
      }
    } catch (error) {
      console.warn('Could not load state for health check:', error);
    }

    return res.status(storageHealthy ? 200 : 503).json({
      status: storageHealthy ? 'healthy' : 'degraded',
      printer: 'Virtual Inkjet Pro',
      storage: {
        type: storageType,
        healthy: storageHealthy
      },
      state: stateInfo,
      environment: process.env.VERCEL ? 'vercel' : 'local',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
