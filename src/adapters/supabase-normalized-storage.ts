/**
 * Supabase Normalized Storage Adapter
 * Stores printers, locations, and jobs in separate normalized tables
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrinterInstance, PrinterLocation } from '../types.js';

export class SupabaseNormalizedStorage {
    private client: SupabaseClient | null = null;

    private getClient(): SupabaseClient {
        if (!this.client) {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error(
                    'Supabase credentials not found. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
                );
            }

            this.client = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });
        }

        return this.client;
    }

    // ============================================
    // Printers
    // ============================================

    async loadPrinters(): Promise<PrinterInstance[]> {
        try {
            const client = this.getClient();

            const { data, error } = await client
                .from('printers')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            console.log(`[SupabaseNormalizedStorage] Loaded ${data?.length || 0} printers`);
            return (data || []).map(this.dbRowToPrinter);
        } catch (error) {
            console.error('Error loading printers from Supabase:', error);
            throw error;
        }
    }

    async loadPrinter(id: string): Promise<PrinterInstance | null> {
        try {
            const client = this.getClient();

            const { data, error } = await client
                .from('printers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                throw error;
            }

            return data ? this.dbRowToPrinter(data) : null;
        } catch (error) {
            console.error(`Error loading printer ${id} from Supabase:`, error);
            throw error;
        }
    }

    async savePrinter(printer: PrinterInstance): Promise<void> {
        try {
            const client = this.getClient();

            const { error } = await client
                .from('printers')
                .upsert(this.printerToDbRow(printer), {
                    onConflict: 'id'
                });

            if (error) throw error;

            console.log(`[SupabaseNormalizedStorage] Saved printer: ${printer.id}`);
        } catch (error) {
            console.error(`Error saving printer ${printer.id} to Supabase:`, error);
            throw error;
        }
    }

    async deletePrinter(id: string): Promise<void> {
        try {
            const client = this.getClient();

            const { error } = await client
                .from('printers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log(`[SupabaseNormalizedStorage] Deleted printer: ${id}`);
        } catch (error) {
            console.error(`Error deleting printer ${id} from Supabase:`, error);
            throw error;
        }
    }

    // ============================================
    // Locations
    // ============================================

    async loadLocations(): Promise<PrinterLocation[]> {
        try {
            const client = this.getClient();

            const { data, error } = await client
                .from('locations')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;

            console.log(`[SupabaseNormalizedStorage] Loaded ${data?.length || 0} locations`);
            return (data || []).map(this.dbRowToLocation);
        } catch (error) {
            console.error('Error loading locations from Supabase:', error);
            throw error;
        }
    }

    async saveLocation(location: PrinterLocation): Promise<void> {
        try {
            const client = this.getClient();

            const { error } = await client
                .from('locations')
                .upsert(this.locationToDbRow(location), {
                    onConflict: 'id'
                });

            if (error) throw error;

            console.log(`[SupabaseNormalizedStorage] Saved location: ${location.id}`);
        } catch (error) {
            console.error(`Error saving location ${location.id} to Supabase:`, error);
            throw error;
        }
    }

    async deleteLocation(id: string): Promise<void> {
        try {
            const client = this.getClient();

            const { error } = await client
                .from('locations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log(`[SupabaseNormalizedStorage] Deleted location: ${id}`);
        } catch (error) {
            console.error(`Error deleting location ${id} from Supabase:`, error);
            throw error;
        }
    }

    // ============================================
    // Jobs
    // ============================================

    async loadJobs(printerId: string): Promise<any[]> {
        try {
            const client = this.getClient();

            const { data, error } = await client
                .from('print_jobs')
                .select('*')
                .eq('printer_id', printerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error(`Error loading jobs for printer ${printerId}:`, error);
            throw error;
        }
    }

    async saveJob(job: any): Promise<void> {
        try {
            const client = this.getClient();

            const { error } = await client
                .from('print_jobs')
                .upsert({
                    id: job.id,
                    printer_id: job.printerId,
                    document_name: job.documentName || job.document,
                    pages: job.pages || 1,
                    status: job.status,
                    progress: job.progress || 0,
                    quality: job.quality,
                    color_mode: job.colorMode,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;
        } catch (error) {
            console.error(`Error saving job ${job.id}:`, error);
            throw error;
        }
    }

    async deleteJob(jobId: string): Promise<void> {
        try {
            const client = this.getClient();

            const { error } = await client
                .from('print_jobs')
                .delete()
                .eq('id', jobId);

            if (error) throw error;
        } catch (error) {
            console.error(`Error deleting job ${jobId}:`, error);
            throw error;
        }
    }

    // ============================================
    // Helpers
    // ============================================

    async healthCheck(): Promise<boolean> {
        try {
            const client = this.getClient();

            // Check if tables exist by querying them
            const { error } = await client
                .from('printers')
                .select('id')
                .limit(1);

            return !error;
        } catch (error) {
            console.error('Supabase health check failed:', error);
            return false;
        }
    }

    getType(): string {
        return 'supabase-normalized';
    }

    // ============================================
    // Conversion Methods
    // ============================================

    private dbRowToPrinter = (row: any): PrinterInstance => {
        // Convert separate ink columns to inkLevels object
        const inkLevels: any = {};
        if (row.ink_cyan !== null && row.ink_cyan !== undefined) inkLevels.cyan = Number(row.ink_cyan);
        if (row.ink_magenta !== null && row.ink_magenta !== undefined) inkLevels.magenta = Number(row.ink_magenta);
        if (row.ink_yellow !== null && row.ink_yellow !== undefined) inkLevels.yellow = Number(row.ink_yellow);
        if (row.ink_black !== null && row.ink_black !== undefined) inkLevels.black = Number(row.ink_black);
        if (row.ink_photo_black !== null && row.ink_photo_black !== undefined) inkLevels.photo_black = Number(row.ink_photo_black);

        // Convert separate statistics columns to statistics object
        const totalInkUsed = typeof row.total_ink_used === 'string'
            ? JSON.parse(row.total_ink_used)
            : (row.total_ink_used || { cyan: 0, magenta: 0, yellow: 0, black: 0 });

        return {
            id: row.id,
            name: row.name,
            typeId: row.type_id,
            locationId: row.location_id,
            status: row.status,
            inkLevels,
            paperCount: row.paper_count,
            paperSize: row.paper_size,
            paperTrayCapacity: row.paper_tray_capacity,
            queue: [],
            currentJob: null,
            completedJobs: [],
            errors: [],
            logs: [],
            statistics: {
                totalPagesPrinted: row.total_pages_printed || 0,
                totalJobs: row.total_jobs || 0,
                successfulJobs: row.successful_jobs || 0,
                failedJobs: row.failed_jobs || 0,
                totalInkUsed,
                maintenanceOperations: 0,
                lastMaintenanceDate: row.last_used_at ? new Date(row.last_used_at).getTime() : null,
            },
            settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {
                defaultQuality: 'normal',
                defaultPaperSize: 'A4',
                enableErrorSimulation: false,
                errorProbability: 0.02,
                autoWakeup: true,
                sleepAfterMinutes: 30,
                printSpeedMultiplier: 1.0,
            }),
            lastUpdated: new Date(row.updated_at).getTime(),
            lastStartTime: row.last_used_at ? new Date(row.last_used_at).getTime() : Date.now(),
            createdAt: new Date(row.created_at).getTime(),
            version: 1,
        };
    };

    private printerToDbRow = (printer: PrinterInstance): any => {
        return {
            id: printer.id,
            name: printer.name,
            type_id: printer.typeId,
            location_id: printer.locationId || null,
            status: printer.status,
            // Convert inkLevels object to separate columns
            ink_cyan: printer.inkLevels?.cyan || 0,
            ink_magenta: printer.inkLevels?.magenta || 0,
            ink_yellow: printer.inkLevels?.yellow || 0,
            ink_black: printer.inkLevels?.black || 0,
            ink_photo_black: printer.inkLevels?.photo_black || null,
            paper_count: printer.paperCount,
            paper_size: printer.paperSize,
            paper_tray_capacity: printer.paperTrayCapacity,
            settings: JSON.stringify(printer.settings || {}),
            // Convert statistics object to separate columns
            total_pages_printed: printer.statistics?.totalPagesPrinted || 0,
            total_jobs: printer.statistics?.totalJobs || 0,
            successful_jobs: printer.statistics?.successfulJobs || 0,
            failed_jobs: printer.statistics?.failedJobs || 0,
            total_ink_used: JSON.stringify(printer.statistics?.totalInkUsed || { cyan: 0, magenta: 0, yellow: 0, black: 0 }),
            last_used_at: printer.statistics?.lastMaintenanceDate ? new Date(printer.statistics.lastMaintenanceDate).toISOString() : null,
            updated_at: new Date().toISOString(),
        };
    };

    private dbRowToLocation = (row: any): PrinterLocation => {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            color: row.color,
            printerIds: [], // Will be populated by manager
            sortOrder: row.sort_order,
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime(),
        };
    };

    private locationToDbRow = (location: PrinterLocation): any => {
        return {
            id: location.id,
            name: location.name,
            description: location.description,
            icon: location.icon,
            color: location.color,
            sort_order: location.sortOrder,
            updated_at: new Date().toISOString(),
        };
    };
}
