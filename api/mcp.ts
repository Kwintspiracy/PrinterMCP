/**
 * Vercel Serverless Function: Consolidated MCP Endpoint
 * Handles tools listing, resources listing, tool execution, and resource access
 * GET /api/mcp?type=tools|resources
 * GET /api/mcp?type=resource&name={resourceName}
 * POST /api/mcp?type=tool&name={toolName}
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { VirtualPrinter } from '../build/printer.js';
import { StateManager } from '../build/state-manager.js';
import { TOOLS, RESOURCES } from '../build/tools.js';
import { smartPrint } from '../build/smart-print.js';

let printerInstance: VirtualPrinter | null = null;

async function getPrinter() {
  if (!printerInstance) {
    const stateManager = new StateManager();
    printerInstance = new VirtualPrinter(stateManager);
  }
  // Critical: Reload state from storage to get latest updates (fixes sync with dashboard)
  await printerInstance.reloadState();
  // Update state based on elapsed time (for serverless environments)
  // This simulates print job progress even when the process wasn't running
  await printerInstance.updateState();
  return printerInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const type = req.query.type as string;
  const name = req.query.name as string;

  try {
    // List all tools
    if (type === 'tools' && req.method === 'GET') {
      return res.status(200).json({
        tools: TOOLS.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          parameters: formatSchemaToParameters(tool.inputSchema)
        }))
      });
    }

    // List all resources
    if (type === 'resources' && req.method === 'GET') {
      return res.status(200).json({
        resources: RESOURCES
      });
    }

    // Execute a tool
    if (type === 'tool' && req.method === 'POST') {
      if (!name) {
        return res.status(400).json({ error: 'Missing tool name parameter' });
      }

      const { arguments: args = {} } = req.body;
      const printer = await getPrinter();
      let result;

      switch (name) {
        case 'print_document':
          // Use smart print with fallback logic
          const smartResult = await smartPrint({
            documentName: args.documentName,
            pages: args.pages,
            color: args.color,
            quality: args.quality,
            paperSize: args.paperSize,
            locationId: args.locationId,
            printerId: args.printerId,
            confirmedFallback: args.confirmedFallback
          });

          if (smartResult.requiresConfirmation) {
            // Return confirmation request - LLM should ask user
            result = {
              status: 'confirmation_required',
              message: smartResult.notificationMessage,
              printerAvailable: smartResult.printerUsed.name,
              fallbackReason: smartResult.fallbackReason,
              hint: 'Call print_document again with confirmedFallback: true to proceed'
            };
          } else if (smartResult.success) {
            result = {
              jobId: smartResult.jobId,
              message: smartResult.usedFallback
                ? smartResult.notificationMessage
                : `Print job queued on ${smartResult.printerUsed.name}`,
              printerUsed: smartResult.printerUsed.name,
              usedFallback: smartResult.usedFallback,
              fallbackReason: smartResult.fallbackReason
            };
          } else {
            result = {
              error: smartResult.error,
              success: false
            };
          }
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
            availableTools: TOOLS.map((t: any) => t.name)
          });
      }

      return res.status(200).json({
        success: true,
        tool: name,
        result
      });
    }

    // Access a resource
    if (type === 'resource' && req.method === 'GET') {
      if (!name) {
        return res.status(400).json({ error: 'Missing resource name parameter' });
      }

      const printer = await getPrinter();
      let result;

      switch (name) {
        case 'state':
          result = printer.getStatus();
          break;

        case 'queue':
          const status = printer.getStatus();
          result = {
            currentJob: status.currentJob,
            queueLength: status.queue.length,
            pendingJobs: status.queue.jobs
          };
          break;

        case 'logs':
          const limit = parseInt(req.query.limit as string) || 100;
          result = printer.getLogs(limit);
          break;

        case 'statistics':
          result = printer.getStatistics();
          break;

        case 'capabilities':
          result = printer.getCapabilities();
          break;

        default:
          return res.status(404).json({
            error: 'Resource not found',
            availableResources: RESOURCES.map((r: any) => r.name)
          });
      }

      return res.status(200).json({
        success: true,
        resource: name,
        data: result
      });
    }

    // Invalid request
    return res.status(400).json({
      error: 'Invalid request',
      usage: {
        'List tools': 'GET /api/mcp?type=tools',
        'List resources': 'GET /api/mcp?type=resources',
        'Execute tool': 'POST /api/mcp?type=tool&name={toolName}',
        'Access resource': 'GET /api/mcp?type=resource&name={resourceName}'
      }
    });

  } catch (error) {
    console.error('MCP endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper to format JSON schema to simple parameters object for display
function formatSchemaToParameters(schema: any): Record<string, string> {
  if (!schema || !schema.properties) return {};

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(schema.properties) as [string, any][]) {
    let desc = value.type;
    if (value.enum) desc += ` (${value.enum.join('|')})`;
    if (schema.required?.includes(key)) desc += ' (required)';
    else desc += ' (optional)';
    params[key] = desc;
  }
  return params;
}
