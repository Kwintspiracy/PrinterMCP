/**
 * Vercel Serverless Function: Printer Control Operations
 * POST /api/control
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const printer = await getPrinter();
    const { action, ...params } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing required field: action' });
    }

    let result: string;

    switch (action) {
      case 'pause':
        result = printer.pause();
        break;

      case 'resume':
        result = printer.resume();
        break;

      case 'cancel_job':
        if (!params.jobId) {
          return res.status(400).json({ error: 'Missing jobId parameter' });
        }
        result = printer.cancelJob(params.jobId);
        break;

      case 'refill_ink':
        if (!params.color) {
          return res.status(400).json({ error: 'Missing color parameter' });
        }
        result = printer.refillInk(params.color);
        break;

      case 'load_paper':
        if (!params.count) {
          return res.status(400).json({ error: 'Missing count parameter' });
        }
        result = printer.loadPaper(params.count, params.paperSize);
        break;

      case 'clean_print_heads':
        result = printer.cleanPrintHeads();
        break;

      case 'align_print_heads':
        result = printer.alignPrintHeads();
        break;

      case 'run_nozzle_check':
        result = printer.runNozzleCheck();
        break;

      case 'clear_paper_jam':
        result = printer.clearPaperJam();
        break;

      case 'power_cycle':
        result = printer.powerCycle();
        break;

      case 'reset':
        result = await printer.reset();
        break;

      default:
        return res.status(400).json({ 
          error: `Unknown action: ${action}`,
          availableActions: [
            'pause', 'resume', 'cancel_job', 'refill_ink', 'load_paper',
            'clean_print_heads', 'align_print_heads', 'run_nozzle_check',
            'clear_paper_jam', 'power_cycle', 'reset'
          ]
        });
    }

    return res.status(200).json({ message: result });
  } catch (error) {
    console.error('Error executing control action:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
