/**
 * Smart Print Module
 * Handles printer fallback logic with template-based notifications
 */

import { getSupabaseMultiPrinter, DbPrinter } from './adapters/supabase-multi-printer.js';
import { getTemplateEngine, ResponseStyle } from './response-templates.js';

export interface SmartPrintParams {
    documentName: string;
    pages: number;
    color?: boolean;
    quality?: 'draft' | 'normal' | 'high' | 'photo';
    paperSize?: string;
    locationId?: string;
    printerId?: string;  // If specified, skip fallback logic
    confirmedFallback?: boolean;  // User confirmed using fallback printer
}

export interface SmartPrintResult {
    success: boolean;
    jobId?: string;
    printerUsed: {
        id: string;
        name: string;
    };
    usedFallback: boolean;
    fallbackReason?: string;
    requiresConfirmation?: boolean;
    notificationMessage?: string;
    error?: string;
}

/**
 * Smart print with fallback logic
 * Uses findBestPrinter to select available printer, with configurable confirmation
 */
export async function smartPrint(
    params: SmartPrintParams,
    responseStyle: ResponseStyle = 'technical'
): Promise<SmartPrintResult> {
    const storage = getSupabaseMultiPrinter();
    const templateEngine = getTemplateEngine();

    try {
        // Get user settings to check ask_before_switch preference
        const userSettings = await storage.getUserSettings();
        const askBeforeSwitch = userSettings?.ask_before_switch ?? false;
        const style = (userSettings?.response_style as ResponseStyle) || responseStyle;

        // If specific printer requested, use it directly
        if (params.printerId) {
            const printer = await storage.getPrinter(params.printerId);
            if (!printer) {
                return {
                    success: false,
                    printerUsed: { id: params.printerId, name: 'Unknown' },
                    usedFallback: false,
                    error: 'Specified printer not found'
                };
            }

            const jobId = await createPrintJob(storage, printer, params);
            return {
                success: true,
                jobId,
                printerUsed: { id: printer.id, name: printer.name },
                usedFallback: false
            };
        }

        // Use findBestPrinter for smart routing
        const locationId = params.locationId || userSettings?.current_location_id;
        if (!locationId) {
            return {
                success: false,
                printerUsed: { id: '', name: '' },
                usedFallback: false,
                error: 'No location specified and no default location set'
            };
        }

        const { printer, wasDefault, fallbackReason } = await storage.findBestPrinter(locationId);

        if (!printer) {
            return {
                success: false,
                printerUsed: { id: '', name: '' },
                usedFallback: false,
                error: fallbackReason || 'No available printers found'
            };
        }

        // If using fallback and askBeforeSwitch is enabled (and not already confirmed)
        if (!wasDefault && askBeforeSwitch && !params.confirmedFallback) {
            // Get the default printer name for the message
            const location = await storage.getLocation(locationId);
            const defaultPrinter = location?.default_printer_id
                ? await storage.getPrinter(location.default_printer_id)
                : null;

            const notificationMessage = await templateEngine.format(
                'printer_switch_ask',
                style,
                {
                    defaultPrinter: defaultPrinter?.name || 'Default printer',
                    fallbackPrinter: printer.name,
                    reason: fallbackReason || 'unavailable'
                }
            );

            return {
                success: true,
                printerUsed: { id: printer.id, name: printer.name },
                usedFallback: true,
                fallbackReason,
                requiresConfirmation: true,
                notificationMessage
            };
        }

        // Proceed with print
        const jobId = await createPrintJob(storage, printer, params);

        // If used fallback, generate notification message
        let notificationMessage: string | undefined;
        if (!wasDefault) {
            const location = await storage.getLocation(locationId);
            const defaultPrinter = location?.default_printer_id
                ? await storage.getPrinter(location.default_printer_id)
                : null;

            notificationMessage = await templateEngine.format(
                'printer_switch_notify',
                style,
                {
                    defaultPrinter: defaultPrinter?.name || 'Default printer',
                    fallbackPrinter: printer.name,
                    reason: fallbackReason || 'unavailable'
                }
            );
        }

        return {
            success: true,
            jobId,
            printerUsed: { id: printer.id, name: printer.name },
            usedFallback: !wasDefault,
            fallbackReason: wasDefault ? undefined : fallbackReason,
            notificationMessage
        };

    } catch (error) {
        console.error('[SmartPrint] Error:', error);
        return {
            success: false,
            printerUsed: { id: '', name: '' },
            usedFallback: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Create a print job in the database
 */
async function createPrintJob(
    storage: ReturnType<typeof getSupabaseMultiPrinter>,
    printer: DbPrinter,
    params: SmartPrintParams
): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await storage.addPrintJob(printer.id, {
        id: jobId,
        document_name: params.documentName,
        pages: params.pages,
        color: params.color ?? false,
        quality: params.quality || 'normal',
        paper_size: params.paperSize || 'A4',
        status: 'queued',
        progress: 0,
        current_page: 0
    });

    // Update printer statistics
    await storage.updatePrinter(printer.id, {
        total_jobs: (printer.total_jobs || 0) + 1
    });

    return jobId;
}
