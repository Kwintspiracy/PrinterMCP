/**
 * Vercel Serverless Function: Printer Control Operations
 * POST /api/control
 * 
 * Absorbs: set-ink/[color].ts functionality via set_ink action
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

      case 'set_ink': {
        // Set specific ink level (from set-ink/[color].ts)
        const validColors = ['cyan', 'magenta', 'yellow', 'black'];
        if (!params.color || !validColors.includes(params.color)) {
          return res.status(400).json({ 
            error: 'Invalid or missing color parameter',
            validColors 
          });
        }
        if (params.level === undefined || params.level === null) {
          return res.status(400).json({ error: 'Missing level parameter (0-100)' });
        }
        const levelNum = Number(params.level);
        if (isNaN(levelNum) || levelNum < 0 || levelNum > 100) {
          return res.status(400).json({ error: 'level must be a number between 0 and 100' });
        }
        
        // Directly manipulate state
        const stateManager = new StateManager();
        const state = await stateManager.loadState();
        if (!state.inkLevels) {
          state.inkLevels = { cyan: 100, magenta: 100, yellow: 100, black: 100 };
        }
        state.inkLevels[params.color as keyof typeof state.inkLevels] = levelNum;
        state.lastUpdated = Date.now();
        await stateManager.saveState(state);
        
        const colorLabel = params.color.charAt(0).toUpperCase() + params.color.slice(1);
        return res.status(200).json({ 
          success: true,
          message: `${colorLabel} ink set to ${levelNum}%`,
          level: levelNum,
          color: params.color
        });
      }

      case 'load_paper':
        if (!params.count) {
          return res.status(400).json({ error: 'Missing count parameter' });
        }
        result = printer.loadPaper(params.count, params.paperSize);
        break;

      case 'set_paper_count':
        if (params.count === undefined) {
          return res.status(400).json({ error: 'Missing count parameter' });
        }
        result = printer.setPaperCount(params.count, params.paperSize);
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
            'pause', 'resume', 'cancel_job', 'refill_ink', 'set_ink', 'load_paper', 'set_paper_count',
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
