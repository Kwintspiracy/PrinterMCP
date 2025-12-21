/**
 * Vercel Serverless Function: Consolidated MCP Endpoint
 * Handles tools listing, resources listing, tool execution, and resource access
 * GET /api/mcp?type=tools|resources
 * GET /api/mcp?type=resource&name={resourceName}
 * POST /api/mcp?type=tool&name={toolName}
 * 
 * Now uses multi-printer system with location-based default printer
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { TOOLS, RESOURCES } from '../build/tools.js';

let printerInstance: VirtualPrinter | null = null;

async function getPrinter() {
  if (!printerInstance) {
    const stateManager = new StateManager();
    printerInstance = new VirtualPrinter(stateManager);
  }

  // Get the location details
  const location = await storage.getLocation(settings.current_location_id);
  if (!location) {
    return { printer: null, location: null, wasDefault: false, fallbackReason: 'Current location not found' };
  }

  // Find the best printer for this location
  const result = await storage.findBestPrinter(settings.current_location_id);
  return {
    ...result,
    location: { id: location.id, name: location.name }
  };
}

/**
 * Convert DbPrinter to status response format
 */
function formatPrinterStatus(printer: DbPrinter, locationName?: string) {
  // Calculate ink status
  const inkStatus = {
    depleted: [] as string[],
    low: [] as string[],
  };

  const inkLevels = {
    cyan: printer.ink_cyan,
    magenta: printer.ink_magenta,
    yellow: printer.ink_yellow,
    black: printer.ink_black,
  };

  for (const [color, level] of Object.entries(inkLevels)) {
    if (level <= 0) {
      inkStatus.depleted.push(color);
    } else if (level <= 15) {
      inkStatus.low.push(color);
    }
  }

  // Calculate issues
  const issues: string[] = [];
  const canPrint = printer.status === 'ready' &&
    printer.paper_count > 0 &&
    inkStatus.depleted.length === 0;

  if (printer.paper_count === 0) {
    issues.push('Out of paper');
  } else if (printer.paper_count < 10) {
    issues.push('Low paper');
  }

  if (inkStatus.depleted.length > 0) {
    issues.push(`Ink depleted: ${inkStatus.depleted.join(', ')}`);
  } else if (inkStatus.low.length > 0) {
    issues.push(`Low ink: ${inkStatus.low.join(', ')}`);
  }

  // Determine operational status
  let operationalStatus: 'ready' | 'not_ready' | 'error' = 'not_ready';
  if (printer.status === 'error') {
    operationalStatus = 'error';
  } else if (canPrint) {
    operationalStatus = 'ready';
  }

  return {
    id: printer.id,
    name: printer.name,
    location: locationName,
    status: printer.status || 'ready',
    operationalStatus,
    canPrint,
    issues,
    inkLevels,
    inkStatus,
    paper: {
      count: printer.paper_count,
      capacity: printer.paper_tray_capacity,
      size: printer.paper_size,
    },
    currentJob: null,
    queue: {
      length: 0,
      jobs: []
    },
    errors: [],
    uptimeSeconds: 0,
    maintenanceNeeded: false
  };
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
      const storage = getSupabaseMultiPrinter();
      let result;

      switch (name) {
        case 'print_document':
          result = printer.printDocument(args);
          break;
      }

        case 'cancel_job': {
        if (!args.jobId) {
          return res.status(200).json({
            success: false,
            tool: name,
            error: 'Missing jobId parameter'
          });
        }

        const success = await storage.updatePrintJob(args.jobId, { status: 'cancelled' });
        result = {
          success,
          message: success ? `Job ${args.jobId} cancelled` : 'Failed to cancel job'
        };
        break;
      }

        case 'refill_ink_cartridge': {
        const { printer } = await getDefaultPrinter();
        if (!printer) {
          return res.status(200).json({
            success: false,
            tool: name,
            error: 'No printer available'
          });
        }

        const color = args.color?.toLowerCase();
        if (!color || !['cyan', 'magenta', 'yellow', 'black'].includes(color)) {
          return res.status(200).json({
            success: false,
            tool: name,
            error: 'Invalid color. Use: cyan, magenta, yellow, or black'
          });
        }

        const success = await storage.setInkLevel(printer.id, color, 100);
        result = {
          success,
          message: success ? `${color} ink cartridge refilled to 100%` : 'Failed to refill ink'
        };
        break;
      }

        case 'load_paper': {
        const { printer } = await getDefaultPrinter();
        if (!printer) {
          return res.status(200).json({
            success: false,
            tool: name,
            error: 'No printer available'
          });
        }

        const count = Math.min(args.count || 100, printer.paper_tray_capacity);
        const success = await storage.setPaperCount(printer.id, count);
        result = {
          success,
          message: success ? `Loaded ${count} sheets of paper` : 'Failed to load paper'
        };
        break;
      }

        case 'get_statistics': {
        const { printer, location } = await getDefaultPrinter();
        if (!printer) {
          result = { message: 'No printer configured' };
        } else {
          result = {
            printer: printer.name,
            location: location?.name,
            totalPagesPrinted: printer.total_pages_printed,
            totalJobs: printer.total_jobs,
            successfulJobs: printer.successful_jobs,
            failedJobs: printer.failed_jobs,
            totalInkUsed: printer.total_ink_used,
            lastUsedAt: printer.last_used_at
          };
        }
        break;
      }

        // Operations that aren't fully implemented yet but return sensible responses
        case 'pause_printer':
        case 'resume_printer':
        case 'clean_print_heads':
        case 'align_print_heads':
        case 'run_nozzle_check':
        case 'clear_paper_jam':
        case 'power_cycle':
        case 'reset_printer': {
        const { printer } = await getDefaultPrinter();
        if (!printer) {
          return res.status(200).json({
            success: false,
            tool: name,
            error: 'No printer available'
          });
        }
        result = {
          success: true,
          message: `${name.replace(/_/g, ' ')} completed on ${printer.name}`
        };
        break;
      }

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

    let result;

    switch (name) {
      case 'state': {
        const { printer, location } = await getDefaultPrinter();
        if (!printer) {
          result = { error: 'No printer configured' };
        } else {
          result = formatPrinterStatus(printer, location?.name);
        }
        break;
      }

      case 'queue': {
        const storage = getSupabaseMultiPrinter();
        const { printer, location } = await getDefaultPrinter();

        if (!printer) {
          result = {
            currentJob: null,
            queueLength: 0,
            pendingJobs: []
          };
        } else {
          const queue = await storage.getQueue(printer.id);
          result = {
            printer: printer.name,
            location: location?.name,
            currentJob: queue.find(j => j.status === 'printing') || null,
            queueLength: queue.length,
            pendingJobs: queue.map(j => ({
              id: j.id,
              document: j.document_name,
              pages: j.pages,
              status: j.status,
              progress: j.progress
            }))
          };
        }
        break;
      }

      case 'logs': {
        const storage = getSupabaseMultiPrinter();
        const { printer } = await getDefaultPrinter();
        const limit = parseInt(req.query.limit as string) || 100;

        if (!printer) {
          result = [];
        } else {
          result = await storage.getLogs(printer.id, limit);
        }
        break;
      }

      case 'statistics': {
        const { printer, location } = await getDefaultPrinter();
        if (!printer) {
          result = { message: 'No printer configured' };
        } else {
          result = {
            printer: printer.name,
            location: location?.name,
            totalPagesPrinted: printer.total_pages_printed,
            totalJobs: printer.total_jobs,
            successfulJobs: printer.successful_jobs,
            failedJobs: printer.failed_jobs
          };
        }
        break;
      }

      case 'capabilities': {
        const { printer } = await getDefaultPrinter();
        result = {
          printer: printer?.name || 'No printer',
          supportedPaperSizes: ['A4', 'Letter', 'Legal', 'A5'],
          supportedQualities: ['draft', 'normal', 'high'],
          colorPrinting: true,
          duplexPrinting: true,
          maxPaperCapacity: printer?.paper_tray_capacity || 100
        };
        break;
      }

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
