/**
 * Vercel Serverless Function: Get Printer Status
 * GET /api/status
 * GET /api/status?printerId=xxx - Get status for specific printer (multi-printer mode)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { loadPrinter, loadStateManager, loadMultiPrinterManager, type VirtualPrinter } from './_lib';

// Initialize single printer (legacy mode)
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

/**
 * Convert PrinterInstance from MultiPrinterManager to PrinterStatus format
 */
async function convertToPrinterStatus(printer: any) {
  const getMultiPrinterManager = await loadMultiPrinterManager();
  const manager = getMultiPrinterManager();
  const printerType = manager.getPrinterType(printer.typeId);

  // Calculate ink status
  const inkStatus = {
    depleted: [] as string[],
    low: [] as string[],
  };

  if (printer.inkLevels) {
    for (const [color, level] of Object.entries(printer.inkLevels)) {
      if ((level as number) <= 0) {
        inkStatus.depleted.push(color);
      } else if ((level as number) <= 15) {
        inkStatus.low.push(color);
      }
    }
  }

  // Calculate issues
  const issues: string[] = [];
  const canPrint = printer.status === 'ready' &&
    printer.paperCount > 0 &&
    inkStatus.depleted.length === 0;

  if (printer.paperCount === 0) {
    issues.push('Out of paper');
  } else if (printer.paperCount < 10) {
    issues.push('Low paper');
  }

  if (inkStatus.depleted.length > 0) {
    issues.push(`Ink depleted: ${inkStatus.depleted.join(', ')}`);
  } else if (inkStatus.low.length > 0) {
    issues.push(`Low ink: ${inkStatus.low.join(', ')}`);
  }

  if (printer.status === 'error') {
    issues.push('Printer error');
  }

  // Determine operational status
  let operationalStatus: 'ready' | 'not_ready' | 'error' = 'not_ready';
  if (printer.status === 'error') {
    operationalStatus = 'error';
  } else if (canPrint) {
    operationalStatus = 'ready';
  }

  // Format queue
  const queue = {
    length: printer.queue?.length || 0,
    jobs: (printer.queue || []).map((job: any) => ({
      id: job.id,
      document: job.documentName || job.document,
      pages: job.pages || 1,
      status: job.status,
      progress: job.progress,
    })),
  };

  // Calculate uptime
  const uptimeSeconds = printer.lastStartTime
    ? Math.floor((Date.now() - printer.lastStartTime) / 1000)
    : 0;

  return {
    id: printer.id,
    name: printer.name,
    typeId: printer.typeId,
    type: printerType ? {
      brand: printerType.brand,
      model: printerType.model,
      category: printerType.category,
      inkSystem: printerType.inkSystem,
      icon: printerType.icon,
    } : null,
    status: printer.status || 'initializing',
    operationalStatus,
    canPrint,
    issues,
    inkLevels: printer.inkLevels || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
    inkStatus,
    paper: {
      count: printer.paperCount || 0,
      capacity: printer.paperTrayCapacity || 100,
      size: printer.paperSize || 'A4',
    },
    currentJob: printer.currentJob || null,
    queue,
    errors: printer.errors || [],
    uptimeSeconds,
    maintenanceNeeded: printer.statistics?.lastMaintenanceDate
      ? (Date.now() - printer.statistics.lastMaintenanceDate) > (30 * 24 * 60 * 60 * 1000) // 30 days
      : false,
    statistics: printer.statistics || null,
    locationId: printer.locationId,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  // Disable caching completely to ensure real-time updates
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const printerId = req.query.printerId as string | undefined;

    // Multi-printer mode: get status for specific printer
    if (printerId) {
      console.log(`[StatusAPI] Fetching status for printer: ${printerId}`);

      const getMultiPrinterManager = await loadMultiPrinterManager();
      const manager = getMultiPrinterManager();
      console.log('[StatusAPI] Initializing manager...');
      await manager.initialize();

      console.log(`[StatusAPI] Manager initialized. Looking for printer: ${printerId}`);
      const printer = await manager.getPrinter(printerId);

      if (!printer) {
        console.warn(`[StatusAPI] Printer not found: ${printerId}`);
        const availableIds = (await manager.getAllPrinters()).map((p: any) => p.id);
        console.warn(`[StatusAPI] Available printers: ${availableIds.join(', ')}`);

        return res.status(404).json({
          error: 'Printer not found',
          printerId,
          availablePrinters: availableIds
        });
      }

      const status = await convertToPrinterStatus(printer);

      console.log('[StatusAPI] Multi-printer status retrieved:', {
        printerId: status.id,
        name: status.name,
        status: status.status,
        operationalStatus: status.operationalStatus,
      });

      // Add debug info if requested
      if (req.query.debug === 'true') {
        (status as any).debug = {
          mode: 'multi-printer',
          printerId,
          timestamp: new Date().toISOString(),
        };
      }

      return res.status(200).json(status);
    }

    // Legacy single-printer mode - now uses multi-printer system with current location's default
    console.log('[StatusAPI] No printerId provided, using current location default printer...');

    const getMultiPrinterManager = await loadMultiPrinterManager();
    const manager = getMultiPrinterManager();
    await manager.initialize();

    // Get the default printer for the current location
    const defaultResult = manager.getDefaultPrinter();

    if (!defaultResult) {
      // No default printer - try to get any printer
      const allPrinters = await manager.getAllPrinters();
      if (allPrinters.length === 0) {
        return res.status(200).json({
          error: 'No printers configured',
          suggestion: 'Please add a printer in the dashboard',
          status: 'not_ready',
          operationalStatus: 'not_ready',
          canPrint: false,
          issues: ['No printers configured'],
          inkLevels: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
          paper: { count: 0, capacity: 100, size: 'A4' },
          currentJob: null,
          queue: { length: 0, jobs: [] },
          errors: [],
          uptimeSeconds: 0,
          maintenanceNeeded: false
        });
      }

      // Use first available printer
      const firstPrinter = allPrinters[0];
      const status = await convertToPrinterStatus(firstPrinter);

      console.log('[StatusAPI] Using first available printer:', {
        printerId: status.id,
        name: status.name
      });

      return res.status(200).json(status);
    }

    const status = await convertToPrinterStatus(defaultResult);

    console.log('[StatusAPI] Using default printer:', {
      printerId: status.id,
      name: status.name,
      status: status.status,
      operationalStatus: status.operationalStatus,
    });

    // Add debug info if requested
    if (req.query.debug === 'true') {
      (status as any).debug = {
        mode: 'multi-printer-default',
        isServerless: !!(process.env.VERCEL || process.env.STORAGE_TYPE === 'vercel-kv'),
        storageType: process.env.STORAGE_TYPE || 'file',
        hasVercelEnv: !!process.env.VERCEL,
        timestamp: new Date().toISOString()
      };
    }

    return res.status(200).json(status);

  } catch (error) {
    console.error('Error getting printer status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      // Return a safe default status on error
      fallback: {
        name: 'Unknown Printer',
        status: 'error',
        inkLevels: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        paper: { count: 0, capacity: 100, size: 'A4' },
        currentJob: null,
        queue: { length: 0, jobs: [] },
        errors: [{ type: 'system', message: 'Failed to load printer state' }],
        uptimeSeconds: 0,
        maintenanceNeeded: false
      }
    });
  }
}
