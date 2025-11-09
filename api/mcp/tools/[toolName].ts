/**
 * Vercel Serverless Function: MCP Tools Endpoint
 * POST /api/mcp/tools/{toolName}
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { VirtualPrinter } from '../../../build/printer.js';
import { StateManager } from '../../../build/state-manager.js';

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
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { toolName } = req.query;
  const { arguments: args = {} } = req.body;

  try {
    const printer = await getPrinter();
    let result;

    switch (toolName) {
      case 'print_document':
        result = printer.printDocument(args);
        break;
      
      case 'cancel_job':
        result = { message: printer.cancelJob(args.jobId) };
        break;
      
      case 'get_status':
        result = printer.getStatus();
        break;
      
      case 'get_queue':
        const status = printer.getStatus();
        result = {
          currentJob: status.currentJob,
          queueLength: status.queue.length,
          pendingJobs: status.queue.jobs
        };
        break;
      
      case 'get_statistics':
        result = printer.getStatistics();
        break;
      
      case 'pause_printer':
        result = { message: printer.pause() };
        break;
      
      case 'resume_printer':
        result = { message: printer.resume() };
        break;
      
      case 'refill_ink_cartridge':
        result = { message: printer.refillInk(args.color) };
        break;
      
      case 'load_paper':
        result = { message: printer.loadPaper(args.count, args.paperSize) };
        break;
      
      case 'clean_print_heads':
        result = { message: printer.cleanPrintHeads() };
        break;
      
      case 'align_print_heads':
        result = { message: printer.alignPrintHeads() };
        break;
      
      case 'run_nozzle_check':
        result = { message: printer.runNozzleCheck() };
        break;
      
      case 'clear_paper_jam':
        result = { message: printer.clearPaperJam() };
        break;
      
      case 'power_cycle':
        result = { message: printer.powerCycle() };
        break;
      
      case 'reset_printer':
        result = { message: await printer.reset() };
        break;
      
      default:
        return res.status(404).json({
          error: 'Tool not found',
          availableTools: [
            'print_document', 'cancel_job', 'get_status', 'get_queue',
            'get_statistics', 'pause_printer', 'resume_printer',
            'refill_ink_cartridge', 'load_paper', 'clean_print_heads',
            'align_print_heads', 'run_nozzle_check', 'clear_paper_jam',
            'power_cycle', 'reset_printer'
          ]
        });
    }

    return res.status(200).json({
      success: true,
      tool: toolName,
      result
    });
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
