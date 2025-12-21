/**
 * Vercel Serverless Function: Consolidated MCP Endpoint
 * Handles tools listing, resources listing, tool execution, and resource access
 * 
 * Uses multi-printer system with location-based default printer and smart fallback
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { TOOLS, RESOURCES } from '../build/tools.js';
import { SupabaseMultiPrinterStorage, DbPrinter } from '../build/adapters/supabase-multi-printer.js';
import { getTemplateEngine, ResponseStyle } from '../build/response-templates.js';

// Singleton storage instance
let storageInstance: SupabaseMultiPrinterStorage | null = null;

function getStorage(): SupabaseMultiPrinterStorage {
  if (!storageInstance) {
    storageInstance = new SupabaseMultiPrinterStorage();
  }
  return storageInstance;
}

/**
 * Get the best printer for printing based on user's current location
 */
async function getDefaultPrinter(): Promise<{
  printer: DbPrinter | null;
  locationName: string;
  wasDefault: boolean;
  fallbackReason?: string;
}> {
  const storage = getStorage();
  const settings = await storage.getUserSettings();

  if (!settings?.current_location_id) {
    return { printer: null, locationName: '', wasDefault: false, fallbackReason: 'No location set' };
  }

  const location = await storage.getLocation(settings.current_location_id);
  if (!location) {
    return { printer: null, locationName: '', wasDefault: false, fallbackReason: 'Location not found' };
  }

  const result = await storage.findBestPrinter(settings.current_location_id);
  return {
    ...result,
    locationName: location.name
  };
}

/**
 * Format printer status for API response
 */
function formatPrinterStatus(printer: DbPrinter, locationName?: string) {
  const inkLevels = {
    cyan: printer.ink_cyan,
    magenta: printer.ink_magenta,
    yellow: printer.ink_yellow,
    black: printer.ink_black,
  };

  const inkStatus = {
    depleted: [] as string[],
    low: [] as string[],
  };

  for (const [color, level] of Object.entries(inkLevels)) {
    if (level <= 0) inkStatus.depleted.push(color);
    else if (level <= 15) inkStatus.low.push(color);
  }

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
    queue: { length: 0, jobs: [] },
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
      return res.status(200).json({ resources: RESOURCES });
    }

    // Execute a tool
    if (type === 'tool' && req.method === 'POST') {
      if (!name) {
        return res.status(400).json({ error: 'Missing tool name parameter' });
      }

      const { arguments: args = {} } = req.body;
      const storage = getStorage();
      let result;

      switch (name) {
        case 'print_document': {
          // Get user settings for fallback behavior
          const settings = await storage.getUserSettings();
          const askBeforeSwitch = settings?.ask_before_switch ?? false;
          const responseStyle = (settings?.response_style as ResponseStyle) || 'technical';

          // Find the best available printer
          const { printer, locationName, wasDefault, fallbackReason } = await getDefaultPrinter();

          if (!printer) {
            result = {
              success: false,
              error: fallbackReason || 'No available printers'
            };
            break;
          }

          // If using fallback and askBeforeSwitch is enabled (and not already confirmed)
          if (!wasDefault && askBeforeSwitch && !args.confirmedFallback) {
            const templateEngine = getTemplateEngine();
            const location = await storage.getLocation(settings?.current_location_id || '');
            const defaultPrinter = location?.default_printer_id
              ? await storage.getPrinter(location.default_printer_id)
              : null;

            const notificationMessage = await templateEngine.format(
              'printer_switch_ask',
              responseStyle,
              {
                defaultPrinter: defaultPrinter?.name || 'Default printer',
                fallbackPrinter: printer.name,
                reason: fallbackReason || 'unavailable'
              }
            );

            result = {
              status: 'confirmation_required',
              message: notificationMessage,
              printerAvailable: printer.name,
              fallbackReason,
              hint: 'Call print_document again with confirmedFallback: true to proceed'
            };
            break;
          }

          // Queue the print job
          const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await storage.addPrintJob(printer.id, {
            id: jobId,
            document_name: args.documentName || 'Untitled',
            pages: args.pages || 1,
            color: args.color ?? false,
            quality: args.quality || 'normal',
            paper_size: args.paperSize || 'A4',
            status: 'queued',
            progress: 0,
            current_page: 0
          });

          // Generate fallback notification if needed
          let notificationMessage: string | undefined;
          if (!wasDefault) {
            const templateEngine = getTemplateEngine();
            const location = await storage.getLocation(settings?.current_location_id || '');
            const defaultPrinter = location?.default_printer_id
              ? await storage.getPrinter(location.default_printer_id)
              : null;

            notificationMessage = await templateEngine.format(
              'printer_switch_notify',
              responseStyle,
              {
                defaultPrinter: defaultPrinter?.name || 'Default printer',
                fallbackPrinter: printer.name,
                reason: fallbackReason || 'unavailable'
              }
            );
          }

          result = {
            success: true,
            jobId,
            message: notificationMessage || `Print job queued on ${printer.name}`,
            printerUsed: printer.name,
            location: locationName,
            usedFallback: !wasDefault,
            fallbackReason: wasDefault ? undefined : fallbackReason,
            estimatedTime: `${Math.ceil((args.pages || 1) * 3)} seconds`
          };
          break;
        }

        case 'get_status': {
          // Get user settings for response style
          const settings = await storage.getUserSettings();
          const responseStyle = (args.responseStyle as ResponseStyle) ||
            (settings?.response_style as ResponseStyle) ||
            'technical';

          const { printer, locationName, wasDefault, fallbackReason } = await getDefaultPrinter();
          if (!printer) {
            result = {
              error: fallbackReason || 'No printer available',
              canPrint: false
            };
          } else {
            const statusData = formatPrinterStatus(printer, locationName);

            // Generate human-readable message using templates
            const templateEngine = getTemplateEngine();
            const messages: string[] = [];

            // Primary status message
            if (printer.status === 'error') {
              messages.push(await templateEngine.format('status_error', responseStyle, {
                errorType: 'printer_error',
                errorMessage: 'Printer encountered an error'
              }));
            } else if (printer.status === 'paused') {
              messages.push(await templateEngine.format('status_paused', responseStyle, {}));
            } else if (printer.status === 'printing') {
              messages.push(await templateEngine.format('status_printing', responseStyle, {
                jobName: 'Current Job',
                progress: 0
              }));
            } else {
              messages.push(await templateEngine.format('status_ready', responseStyle, {}));
            }

            // Add ink warnings/alerts
            for (const color of statusData.inkStatus.depleted) {
              messages.push(await templateEngine.format('ink_depleted', responseStyle, { color }));
            }
            for (const color of statusData.inkStatus.low) {
              const level = statusData.inkLevels[color as keyof typeof statusData.inkLevels];
              messages.push(await templateEngine.format('low_ink_warning', responseStyle, { color, level }));
            }

            // Add paper warnings
            if (statusData.paper.count === 0) {
              messages.push(await templateEngine.format('paper_empty', responseStyle, {}));
            } else if (statusData.paper.count < 10) {
              messages.push(await templateEngine.format('paper_low', responseStyle, {
                count: statusData.paper.count,
                capacity: statusData.paper.capacity
              }));
            }

            // Add maintenance warning if needed
            if (statusData.maintenanceNeeded) {
              messages.push(await templateEngine.format('maintenance_needed', responseStyle, {
                pageCount: 500
              }));
            }

            // Combine all messages
            const formattedMessage = messages.join(' ');

            result = {
              ...statusData,
              message: formattedMessage,
              responseStyle
            };

            if (!wasDefault && fallbackReason) {
              (result as any).fallbackInfo = {
                usingFallback: true,
                reason: fallbackReason
              };
            }
          }
          break;
        }

        case 'get_queue': {
          const { printer } = await getDefaultPrinter();
          if (!printer) {
            result = { error: 'No printer available', jobs: [] };
          } else {
            const jobs = await storage.getPrintJobs(printer.id);
            result = {
              printerName: printer.name,
              queueLength: jobs.length,
              jobs: jobs.map(j => ({
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

        case 'cancel_job': {
          if (!args.jobId) {
            result = { success: false, error: 'Missing jobId parameter' };
          } else {
            const success = await storage.updatePrintJob(args.jobId, { status: 'cancelled' });
            result = { success, message: success ? 'Job cancelled' : 'Failed to cancel job' };
          }
          break;
        }

        case 'get_statistics': {
          const { printer } = await getDefaultPrinter();
          if (!printer) {
            result = { error: 'No printer available' };
          } else {
            result = {
              printerName: printer.name,
              totalJobs: printer.total_jobs || 0,
              totalPages: printer.total_pages || 0
            };
          }
          break;
        }

        case 'refill_ink_cartridge': {
          const { printer } = await getDefaultPrinter();
          if (!printer) {
            result = { success: false, error: 'No printer available' };
          } else {
            const color = args.color?.toLowerCase();
            const updates: any = {};
            if (color === 'cyan') updates.ink_cyan = 100;
            else if (color === 'magenta') updates.ink_magenta = 100;
            else if (color === 'yellow') updates.ink_yellow = 100;
            else if (color === 'black') updates.ink_black = 100;
            else if (color === 'all') {
              updates.ink_cyan = 100;
              updates.ink_magenta = 100;
              updates.ink_yellow = 100;
              updates.ink_black = 100;
            } else {
              result = { success: false, error: 'Invalid color. Use: cyan, magenta, yellow, black, or all' };
              break;
            }
            await storage.updatePrinter(printer.id, updates);
            result = { success: true, message: `${color} ink refilled to 100%` };
          }
          break;
        }

        case 'load_paper': {
          const { printer } = await getDefaultPrinter();
          if (!printer) {
            result = { success: false, error: 'No printer available' };
          } else {
            const count = Math.min(args.count || 100, printer.paper_tray_capacity);
            await storage.updatePrinter(printer.id, { paper_count: count });
            result = { success: true, message: `Loaded ${count} sheets of paper` };
          }
          break;
        }

        case 'clean_print_heads':
        case 'align_print_heads':
        case 'run_nozzle_check':
        case 'clear_paper_jam':
        case 'power_cycle':
        case 'reset_printer': {
          const { printer } = await getDefaultPrinter();
          if (!printer) {
            result = { success: false, error: 'No printer available' };
          } else {
            result = { success: true, message: `${name.replace(/_/g, ' ')} completed on ${printer.name}` };
          }
          break;
        }

        case 'pause_printer':
        case 'resume_printer': {
          const { printer } = await getDefaultPrinter();
          if (!printer) {
            result = { success: false, error: 'No printer available' };
          } else {
            const newStatus = name === 'pause_printer' ? 'paused' : 'ready';
            await storage.updatePrinter(printer.id, { status: newStatus });
            result = { success: true, message: `Printer ${name === 'pause_printer' ? 'paused' : 'resumed'}` };
          }
          break;
        }

        default:
          return res.status(404).json({
            error: 'Tool not found',
            availableTools: TOOLS.map((t: any) => t.name)
          });
      }

      return res.status(200).json({ success: true, tool: name, result });
    }

    // Access a resource
    if (type === 'resource' && req.method === 'GET') {
      if (!name) {
        return res.status(400).json({ error: 'Missing resource name parameter' });
      }

      const { printer, locationName } = await getDefaultPrinter();
      let result;

      switch (name) {
        case 'state':
          result = printer ? formatPrinterStatus(printer, locationName) : { error: 'No printer' };
          break;
        case 'queue':
          if (printer) {
            const storage = getStorage();
            const jobs = await storage.getPrintJobs(printer.id);
            result = { printerName: printer.name, jobs };
          } else {
            result = { error: 'No printer', jobs: [] };
          }
          break;
        case 'statistics':
          result = printer ? { printerName: printer.name, totalJobs: printer.total_jobs } : { error: 'No printer' };
          break;
        default:
          return res.status(404).json({ error: 'Resource not found' });
      }

      return res.status(200).json({ success: true, resource: name, data: result });
    }

    return res.status(400).json({ error: 'Invalid request type' });

  } catch (error) {
    console.error('MCP endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function formatSchemaToParameters(schema: any): Record<string, string> {
  if (!schema?.properties) return {};
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
