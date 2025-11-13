/**
 * Vercel Serverless Function: Cancel Print Job
 * POST /api/cancel/{jobId}
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { VirtualPrinter } from '../../build/printer.js';
import { StateManager } from '../../build/state-manager.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid jobId parameter' 
      });
    }

    const printer = await getPrinter();
    const result = printer.cancelJob(jobId);

    return res.status(200).json({ 
      success: true,
      message: result 
    });
  } catch (error) {
    console.error('Error cancelling print job:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return res.status(errorMessage.includes('not found') ? 404 : 500).json({
      success: false,
      error: errorMessage
    });
  }
}
