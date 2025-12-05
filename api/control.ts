/**
 * Vercel Serverless Function: Printer Control Operations
 * POST /api/control
 * 
 * Supports both legacy single-printer and multi-printer modes
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { loadPrinter, loadStateManager, loadMultiPrinterManager, type VirtualPrinter } from './_lib';

let printerInstance: VirtualPrinter | null = null;

async function getPrinter(): Promise<VirtualPrinter> {
  if (!printerInstance) {
    const StateManager = await loadStateManager();
    const VirtualPrinter = await loadPrinter();
    const stateManager = new StateManager();
    printerInstance = new VirtualPrinter(stateManager);
  }
  // Always reload state from storage to get latest updates
  await printerInstance!.reloadState();
  return printerInstance!;
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
    const { action, printerId, ...params } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing required field: action' });
    }

    // Multi-printer mode: use MultiPrinterManager
    if (printerId) {
      return await handleMultiPrinterControl(req, res, action, printerId, params);
    }

    // Legacy single-printer mode
    const printer = await getPrinter();
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
        const StateManager = await loadStateManager();
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

/**
 * Handle control actions for multi-printer mode
 */
async function handleMultiPrinterControl(
  req: VercelRequest,
  res: VercelResponse,
  action: string,
  printerId: string,
  params: Record<string, any>
) {
  const getMultiPrinterManager = await loadMultiPrinterManager();
  const manager = getMultiPrinterManager();
  await manager.initialize();

  const printer = await manager.getPrinter(printerId);
  if (!printer) {
    return res.status(404).json({ error: 'Printer not found', printerId });
  }

  // Get all printers to update the specific one
  const allPrinters = await manager.getAllPrinters();
  const printerIndex = allPrinters.findIndex(p => p.id === printerId);
  if (printerIndex === -1) {
    return res.status(404).json({ error: 'Printer not found', printerId });
  }

  switch (action) {
    case 'set_ink': {
      const validColors = ['cyan', 'magenta', 'yellow', 'black', 'photo_black'];
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

      // Update printer ink level using manager's internal state
      // We need to directly access and update the state
      printer.inkLevels[params.color as keyof typeof printer.inkLevels] = levelNum;
      printer.lastUpdated = Date.now();

      // Save via the manager - we need to use updatePrinterInkLevel method
      // For now, directly save the state
      const success = await updatePrinterState(manager, printerId, {
        inkLevels: printer.inkLevels,
      });

      const colorLabel = params.color.charAt(0).toUpperCase() + params.color.slice(1);
      return res.status(200).json({
        success,
        message: `${colorLabel} ink set to ${levelNum}%`,
        level: levelNum,
        color: params.color,
        printerId
      });
    }

    case 'refill_ink': {
      if (!params.color) {
        return res.status(400).json({ error: 'Missing color parameter' });
      }

      printer.inkLevels[params.color as keyof typeof printer.inkLevels] = 100;
      printer.lastUpdated = Date.now();

      const success = await updatePrinterState(manager, printerId, {
        inkLevels: printer.inkLevels,
      });

      const colorLabel = params.color.charAt(0).toUpperCase() + params.color.slice(1);
      return res.status(200).json({
        success,
        message: `${colorLabel} ink refilled to 100%`,
        printerId
      });
    }

    case 'load_paper':
    case 'set_paper_count': {
      if (params.count === undefined) {
        return res.status(400).json({ error: 'Missing count parameter' });
      }
      const count = Number(params.count);
      const newCount = action === 'load_paper'
        ? Math.min(printer.paperCount + count, printer.paperTrayCapacity)
        : Math.min(count, printer.paperTrayCapacity);

      printer.paperCount = newCount;
      if (params.paperSize) {
        printer.paperSize = params.paperSize;
      }
      printer.lastUpdated = Date.now();

      const success = await updatePrinterState(manager, printerId, {
        paperCount: printer.paperCount,
        paperSize: printer.paperSize,
      });

      return res.status(200).json({
        success,
        message: action === 'load_paper'
          ? `Loaded paper. Count: ${newCount}`
          : `Paper count set to ${newCount}`,
        paperCount: newCount,
        printerId
      });
    }

    case 'pause':
      printer.status = 'paused';
      printer.lastUpdated = Date.now();
      await updatePrinterState(manager, printerId, { status: 'paused' });
      return res.status(200).json({ success: true, message: 'Printer paused', printerId });

    case 'resume':
      printer.status = 'ready';
      printer.lastUpdated = Date.now();
      await updatePrinterState(manager, printerId, { status: 'ready' });
      return res.status(200).json({ success: true, message: 'Printer resumed', printerId });

    default:
      return res.status(400).json({
        error: `Action '${action}' not yet supported for multi-printer mode`,
        supportedActions: ['set_ink', 'refill_ink', 'load_paper', 'set_paper_count', 'pause', 'resume']
      });
  }
}

/**
 * Helper to update printer state in MultiPrinterManager
 */
async function updatePrinterState(
  manager: any,
  printerId: string,
  updates: Record<string, any>
): Promise<boolean> {
  try {
    // Access the internal state directly since MultiPrinterManager doesn't have 
    // a dedicated updatePrinterState method, we'll do it manually
    const state = (manager as any).state;
    if (!state || !state.printers[printerId]) {
      return false;
    }

    Object.assign(state.printers[printerId], updates, { lastUpdated: Date.now() });

    // Save state
    state.version++;
    state.lastUpdated = Date.now();

    const storage = (manager as any).storage;
    if (storage && typeof storage.saveState === 'function') {
      await storage.saveState(state, 'multi-printer-state');
    }

    return true;
  } catch (error) {
    console.error('Error updating printer state:', error);
    return false;
  }
}
