/**
 * Multi-Printer API Endpoint
 * GET: List all printers grouped by location
 * POST: Add a new printer
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadMultiPrinterManager } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Load and initialize the multi-printer manager
    console.log('[PrintersAPI] Loading MultiPrinterManager...');
    const getMultiPrinterManager = await loadMultiPrinterManager();
    console.log('[PrintersAPI] Got factory function, creating manager...');
    const manager = getMultiPrinterManager();
    console.log('[PrintersAPI] Initializing manager...');
    await manager.initialize();
    console.log('[PrintersAPI] Manager initialized successfully');

    if (req.method === 'GET') {
      // Get all printers with locations
      const [printers, locations, summary] = await Promise.all([
        manager.getAllPrinters(),
        manager.getAllLocations(),
        manager.getStateSummary(),
      ]);

      console.log('[PrintersAPI] Loaded', printers.length, 'printers,', locations.length, 'locations');

      // Get printer types for reference
      const printerTypes = manager.getAvailablePrinterTypes();

      // Enhance printers with type info
      const enrichedPrinters = printers.map((printer: any) => {
        const type = manager.getPrinterType(printer.typeId);
        return {
          ...printer,
          type: type ? {
            brand: type.brand,
            model: type.model,
            category: type.category,
            inkSystem: type.inkSystem,
            icon: type.icon,
            features: type.features,
          } : null,
        };
      });

      // Group printers by location
      const printersByLocation: Record<string, typeof enrichedPrinters> = {};
      const unassignedPrinters: typeof enrichedPrinters = [];

      for (const printer of enrichedPrinters) {
        if (printer.locationId) {
          if (!printersByLocation[printer.locationId]) {
            printersByLocation[printer.locationId] = [];
          }
          printersByLocation[printer.locationId].push(printer);
        } else {
          unassignedPrinters.push(printer);
        }
      }

      return res.status(200).json({
        success: true,
        printers: enrichedPrinters,
        locations,
        printersByLocation,
        unassignedPrinters,
        summary,
        availableTypes: printerTypes.map((t: any) => ({
          id: t.id,
          brand: t.brand,
          model: t.model,
          category: t.category,
          inkSystem: t.inkSystem,
          icon: t.icon,
          description: t.description,
        })),
      });
    }

    if (req.method === 'POST') {
      // Add a new printer
      const { name, typeId, locationId } = req.body;

      if (!name || !typeId) {
        return res.status(400).json({
          success: false,
          error: 'Name and typeId are required',
        });
      }

      // Validate printer type
      const printerType = manager.getPrinterType(typeId);
      if (!printerType) {
        return res.status(400).json({
          success: false,
          error: `Invalid printer type: ${typeId}`,
          availableTypes: manager.getAvailablePrinterTypes().map((t: any) => t.id),
        });
      }

      const printer = await manager.addPrinter(name, typeId, locationId);

      return res.status(201).json({
        success: true,
        printer: {
          ...printer,
          type: {
            brand: printerType.brand,
            model: printerType.model,
            category: printerType.category,
            inkSystem: printerType.inkSystem,
            icon: printerType.icon,
          },
        },
        message: `Printer "${name}" created successfully`,
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('[PrintersAPI] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined,
      debug: {
        cwd: process.cwd(),
        env: process.env.VERCEL ? 'vercel' : 'local',
      }
    });
  }
}
