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
    
    // Check if client wants SSE
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/event-stream')) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send initial status
      const status = printer.getStatus();
      res.write(`data: ${JSON.stringify(status)}\n\n`);
      
      // Note: Vercel serverless functions timeout after 10s (hobby) or 60s (pro)
      // For true real-time updates, use polling from the client instead
      
      // Send a few updates then close
      const intervalId = setInterval(() => {
        try {
          const status = printer.getStatus();
          res.write(`data: ${JSON.stringify(status)}\n\n`);
        } catch (err) {
          clearInterval(intervalId);
          res.end();
        }
      }, 2000);
      
      // Close after 8 seconds to avoid timeout
      setTimeout(() => {
        clearInterval(intervalId);
        res.write('event: close\ndata: Connection closing due to serverless timeout\n\n');
        res.end();
      }, 8000);
      
    } else {
      // Return current status as JSON
      const status = printer.getStatus();
      return res.status(200).json({
        ...status,
        _meta: {
          note: 'For live updates, use polling to /api/status every 2-3 seconds',
          sse_available: false,
          reason: 'Vercel serverless functions have limited SSE support'
        }
      });
    }
  } catch (error) {
    console.error('Error in stream endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
