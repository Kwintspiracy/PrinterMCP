/**
 * Vercel Serverless Function: Consolidated Settings Endpoint
 * GET /api/settings?type=locations|user
 * PUT /api/settings?type=locations|user
 * 
 * Combines: locations.ts + user-settings.ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseMultiPrinter } from '../src/adapters/supabase-multi-printer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const type = (req.query.type as string) || 'user';
  const storage = getSupabaseMultiPrinter();

  try {
    // ==================== LOCATIONS ====================
    if (type === 'locations') {
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
    }

    // ==================== USER SETTINGS ====================
    if (type === 'user') {
      // GET - Get user settings with location details
      if (req.method === 'GET') {
        const settings = await storage.getUserSettings();

        let currentLocation = null;
        let defaultPrinter = null;

        if (settings?.current_location_id) {
          currentLocation = await storage.getLocation(settings.current_location_id);

          if (currentLocation?.default_printer_id) {
            defaultPrinter = await storage.getPrinter(currentLocation.default_printer_id);
          }
        }

        return res.status(200).json({
          success: true,
          settings: {
            currentLocationId: settings?.current_location_id,
            responseStyle: settings?.response_style ?? 'technical',
            verbatim: settings?.verbatim ?? false,
            askBeforeSwitch: settings?.ask_before_switch ?? false,
            autoSwitchEnabled: settings?.auto_switch_enabled ?? true,
            theme: settings?.theme ?? 'dark'
          },
          currentLocation: currentLocation ? {
            id: currentLocation.id,
            name: currentLocation.name,
            icon: currentLocation.icon,
            color: currentLocation.color,
            defaultPrinterId: currentLocation.default_printer_id
          } : null,
          defaultPrinter: defaultPrinter ? {
            id: defaultPrinter.id,
            name: defaultPrinter.name,
            status: defaultPrinter.status,
            inkLevels: {
              cyan: defaultPrinter.ink_cyan,
              magenta: defaultPrinter.ink_magenta,
              yellow: defaultPrinter.ink_yellow,
              black: defaultPrinter.ink_black
            },
            paperCount: defaultPrinter.paper_count
          } : null
        });
      }

      if (req.method === 'PUT') {
        const { currentLocationId, responseStyle, askBeforeSwitch, verbatim } = req.body;

        // Handle responseStyle update
        if (responseStyle) {
          const validStyles = ['technical', 'friendly', 'minimal'];
          if (!validStyles.includes(responseStyle)) {
            return res.status(400).json({
              success: false,
              error: 'Invalid responseStyle. Must be: technical, friendly, or minimal'
            });
          }

          const success = await storage.setResponseStyle(responseStyle);
          if (!success) {
            return res.status(500).json({ success: false, error: 'Failed to update response style' });
          }

          // If only updating responseStyle, return early
          if (!currentLocationId && askBeforeSwitch === undefined) {
            return res.status(200).json({
              success: true,
              message: `Response style set to ${responseStyle}`,
              settings: { responseStyle }
            });
          }
        }

        // Handle askBeforeSwitch update
        if (askBeforeSwitch !== undefined) {
          const success = await storage.setAskBeforeSwitch(askBeforeSwitch);
          if (!success) {
            return res.status(500).json({ success: false, error: 'Failed to update askBeforeSwitch' });
          }

          // If only updating askBeforeSwitch, return early
          if (!currentLocationId && !responseStyle) {
            return res.status(200).json({
              success: true,
              message: `Ask before switch ${askBeforeSwitch ? 'enabled' : 'disabled'}`,
              settings: { askBeforeSwitch }
            });
          }
        }

        // Handle verbatim update
        if (verbatim !== undefined) {
          const success = await storage.setVerbatim(verbatim);
          if (!success) {
            return res.status(500).json({ success: false, error: 'Failed to update verbatim' });
          }

          // If only updating verbatim, return early
          if (!currentLocationId && !responseStyle && askBeforeSwitch === undefined) {
            return res.status(200).json({
              success: true,
              message: `Verbatim ${verbatim ? 'enabled' : 'disabled'}`,
              settings: { verbatim }
            });
          }
        }

        if (!currentLocationId && !responseStyle && askBeforeSwitch === undefined && verbatim === undefined) {
          return res.status(400).json({ success: false, error: 'currentLocationId, responseStyle, askBeforeSwitch, or verbatim required' });
        }

        // If we have a location to update, continue with the existing logic
        if (currentLocationId) {

          // Verify location exists
          const location = await storage.getLocation(currentLocationId);
          if (!location) {
            return res.status(404).json({ success: false, error: 'Location not found' });
          }

          const success = await storage.setCurrentLocation(currentLocationId);
          if (!success) {
            return res.status(500).json({ success: false, error: 'Failed to update location' });
          }

          // Get the default printer for this location
          let defaultPrinter = null;
          if (location.default_printer_id) {
            defaultPrinter = await storage.getPrinter(location.default_printer_id);
          }

          return res.status(200).json({
            success: true,
            message: `Switched to ${location.name}`,
            currentLocation: {
              id: location.id,
              name: location.name,
              icon: location.icon,
              defaultPrinterId: location.default_printer_id
            },
            defaultPrinter: defaultPrinter ? {
              id: defaultPrinter.id,
              name: defaultPrinter.name,
              status: defaultPrinter.status,
              inkLevels: {
                cyan: defaultPrinter.ink_cyan,
                magenta: defaultPrinter.ink_magenta,
                yellow: defaultPrinter.ink_yellow,
                black: defaultPrinter.ink_black
              },
              paperCount: defaultPrinter.paper_count
            } : null
          });
        }
      }
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid type parameter',
      availableTypes: ['locations', 'user']
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
