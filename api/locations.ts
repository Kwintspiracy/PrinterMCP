/**
 * Locations API Endpoint
 * GET: List all locations with printers
 * POST: Create new location
 * PUT: Update location (set default printer)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseMultiPrinter } from '../src/adapters/supabase-multi-printer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const storage = getSupabaseMultiPrinter();

  try {
    // GET - List all locations
    if (req.method === 'GET') {
      const locations = await storage.getLocations();
      const userSettings = await storage.getUserSettings();

      // Enrich locations with printer counts and default info
      const enrichedLocations = await Promise.all(
        locations.map(async (loc) => {
          const printers = await storage.getPrintersByLocation(loc.id);
          return {
            ...loc,
            printerCount: printers.length,
            printers: printers.map(p => ({
              id: p.id,
              name: p.name,
              status: p.status,
              isDefault: p.id === loc.default_printer_id
            })),
            isCurrentLocation: loc.id === userSettings?.current_location_id
          };
        })
      );

      return res.status(200).json({
        success: true,
        locations: enrichedLocations,
        currentLocationId: userSettings?.current_location_id
      });
    }

    // PUT - Update location (set default printer)
    if (req.method === 'PUT') {
      const { locationId, defaultPrinterId } = req.body;

      if (!locationId) {
        return res.status(400).json({ success: false, error: 'locationId required' });
      }

      if (defaultPrinterId) {
        const success = await storage.setLocationDefaultPrinter(locationId, defaultPrinterId);
        if (!success) {
          return res.status(500).json({ success: false, error: 'Failed to update' });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Location updated'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Locations API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
