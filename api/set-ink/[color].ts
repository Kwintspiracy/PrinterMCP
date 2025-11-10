/**
 * Vercel Serverless Function: Set Ink Level
 * POST /api/set-ink/{color}
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

  const { color } = req.query;
  
  if (!color || typeof color !== 'string') {
    return res.status(400).json({ error: 'Color parameter required' });
  }

  const validColors = ['cyan', 'magenta', 'yellow', 'black'];
  if (!validColors.includes(color)) {
    return res.status(400).json({ 
      error: 'Invalid color',
      validColors 
    });
  }

  try {
    const printer = await getPrinter();
    const message = printer.refillInk(color as 'cyan' | 'magenta' | 'yellow' | 'black');
    
    return res.status(200).json({ 
      success: true,
      message 
    });
  } catch (error) {
    console.error(`Error refilling ${color} ink:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
