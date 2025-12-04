/**
 * Vercel Serverless Function: Print Queue Management
 * GET /api/queue - Get queue
 * POST /api/queue?action=cancel&jobId=xxx - Cancel job
 * 
 * Combines: queue.ts + cancel/[jobId].ts
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const printer = await getPrinter();
    const action = req.query.action as string;

    // POST - Cancel job action
    if (req.method === 'POST') {
      if (action === 'cancel') {
        const jobId = (req.query.jobId as string) || req.body?.jobId;

        if (!jobId || typeof jobId !== 'string') {
          return res.status(400).json({ 
            success: false,
            error: 'Missing or invalid jobId parameter' 
          });
        }

        try {
          const result = printer.cancelJob(jobId);
          return res.status(200).json({ 
            success: true,
            message: result 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return res.status(errorMessage.includes('not found') ? 404 : 500).json({
            success: false,
            error: errorMessage
          });
        }
      }

      return res.status(400).json({ 
        error: 'Invalid action',
        availableActions: ['cancel']
      });
    }

    // GET - Get queue
    if (req.method === 'GET') {
      const status = printer.getStatus();
      
      return res.status(200).json({
        currentJob: status.currentJob,
        queueLength: status.queue.length,
        pendingJobs: status.queue.jobs
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in queue handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
