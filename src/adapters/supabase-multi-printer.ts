/**
 * Supabase Multi-Printer Storage Adapter
 * Stores all printers, locations, and settings in Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for database rows
export interface DbLocation {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  default_printer_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbPrinter {
  id: string;
  name: string;
  type_id: string;
  location_id?: string;
  status: string;
  ink_cyan: number;
  ink_magenta: number;
  ink_yellow: number;
  ink_black: number;
  ink_photo_black?: number;
  paper_count: number;
  paper_size: string;
  paper_tray_capacity: number;
  settings: Record<string, any>;
  total_pages_printed: number;
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  total_ink_used: Record<string, number>;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbPrintJob {
  id: string;
  printer_id: string;
  document_name: string;
  pages: number;
  color: boolean;
  quality: string;
  paper_size: string;
  status: string;
  progress: number;
  current_page: number;
  submitted_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface DbUserSettings {
  id: string;
  current_location_id?: string;
  response_style?: 'technical' | 'friendly' | 'minimal';
  verbatim?: boolean;  // LLM should relay message exactly as written
  ask_before_switch?: boolean;  // Ask user before switching to fallback printer
  auto_switch_enabled: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
}

export class SupabaseMultiPrinterStorage {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not found. Set SUPABASE_URL and SUPABASE_KEY.');
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return this.client;
  }

  // ============================================
  // USER SETTINGS
  // ============================================

  async getUserSettings(): Promise<DbUserSettings | null> {
    const { data, error } = await this.getClient()
      .from('user_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('Error loading user settings:', error);
      return null;
    }
    return data;
  }

  async setCurrentLocation(locationId: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('user_settings')
      .upsert({ id: 'default', current_location_id: locationId });

    if (error) {
      console.error('Error setting location:', error);
      return false;
    }
    return true;
  }

  async setResponseStyle(style: 'technical' | 'friendly' | 'minimal'): Promise<boolean> {
    const { error } = await this.getClient()
      .from('user_settings')
      .upsert({ id: 'default', response_style: style });

    if (error) {
      console.error('Error setting response style:', error);
      return false;
    }
    return true;
  }

  async setAskBeforeSwitch(askBeforeSwitch: boolean): Promise<boolean> {
    const { error } = await this.getClient()
      .from('user_settings')
      .upsert({ id: 'default', ask_before_switch: askBeforeSwitch });

    if (error) {
      console.error('Error setting ask_before_switch:', error);
      return false;
    }
    return true;
  }

  async setVerbatim(verbatim: boolean): Promise<boolean> {
    const { error } = await this.getClient()
      .from('user_settings')
      .upsert({ id: 'default', verbatim: verbatim });

    if (error) {
      console.error('Error setting verbatim:', error);
      return false;
    }
    return true;
  }

  // ============================================
  // LOCATIONS
  // ============================================

  async getLocations(): Promise<DbLocation[]> {
    const { data, error } = await this.getClient()
      .from('locations')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading locations:', error);
      return [];
    }
    return data || [];
  }

  async getLocation(id: string): Promise<DbLocation | null> {
    const { data, error } = await this.getClient()
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async setLocationDefaultPrinter(locationId: string, printerId: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('locations')
      .update({ default_printer_id: printerId })
      .eq('id', locationId);

    if (error) {
      console.error('Error setting default printer:', error);
      return false;
    }
    return true;
  }

  // ============================================
  // PRINTERS
  // ============================================

  async getPrinters(): Promise<DbPrinter[]> {
    const { data, error } = await this.getClient()
      .from('printers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading printers:', error);
      return [];
    }
    return data || [];
  }

  async getPrinter(id: string): Promise<DbPrinter | null> {
    const { data, error } = await this.getClient()
      .from('printers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async getPrintersByLocation(locationId: string): Promise<DbPrinter[]> {
    const { data, error } = await this.getClient()
      .from('printers')
      .select('*')
      .eq('location_id', locationId)
      .order('name');

    if (error) {
      console.error('Error loading printers by location:', error);
      return [];
    }
    return data || [];
  }

  async updatePrinter(id: string, updates: Partial<DbPrinter>): Promise<boolean> {
    const { error } = await this.getClient()
      .from('printers')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating printer:', error);
      return false;
    }
    return true;
  }

  async setInkLevel(printerId: string, color: string, level: number): Promise<boolean> {
    const columnName = `ink_${color}`;
    const { error } = await this.getClient()
      .from('printers')
      .update({ [columnName]: level })
      .eq('id', printerId);

    if (error) {
      console.error('Error setting ink level:', error);
      return false;
    }
    return true;
  }

  async setPaperCount(printerId: string, count: number): Promise<boolean> {
    const { error } = await this.getClient()
      .from('printers')
      .update({ paper_count: count })
      .eq('id', printerId);

    if (error) {
      console.error('Error setting paper count:', error);
      return false;
    }
    return true;
  }

  // ============================================
  // PRINT QUEUE
  // ============================================

  async getQueue(printerId: string): Promise<DbPrintJob[]> {
    const { data, error } = await this.getClient()
      .from('print_queue')
      .select('*')
      .eq('printer_id', printerId)
      .in('status', ['queued', 'printing'])
      .order('submitted_at');

    if (error) {
      console.error('Error loading queue:', error);
      return [];
    }
    return data || [];
  }

  async addPrintJob(printerId: string, job: Partial<DbPrintJob>): Promise<string | null> {
    const { data, error } = await this.getClient()
      .from('print_queue')
      .insert({ ...job, printer_id: printerId })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding print job:', error);
      return null;
    }
    return data?.id || null;
  }

  async updatePrintJob(jobId: string, updates: Partial<DbPrintJob>): Promise<boolean> {
    const { error } = await this.getClient()
      .from('print_queue')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating print job:', error);
      return false;
    }
    return true;
  }

  // ============================================
  // SMART PRINT - Find best available printer
  // ============================================

  async findBestPrinter(locationId: string): Promise<{
    printer: DbPrinter | null;
    wasDefault: boolean;
    fallbackReason?: string;
  }> {
    // Get location's default printer
    const location = await this.getLocation(locationId);
    if (!location) {
      return { printer: null, wasDefault: false, fallbackReason: 'Location not found' };
    }

    // Check default printer first
    if (location.default_printer_id) {
      const defaultPrinter = await this.getPrinter(location.default_printer_id);
      if (defaultPrinter && this.isPrinterReady(defaultPrinter)) {
        return { printer: defaultPrinter, wasDefault: true };
      }

      // Default printer not ready - find reason
      const reason = defaultPrinter
        ? this.getPrinterIssue(defaultPrinter)
        : 'Default printer not found';

      // Find fallback at same location
      const locationPrinters = await this.getPrintersByLocation(locationId);
      for (const printer of locationPrinters) {
        if (printer.id !== location.default_printer_id && this.isPrinterReady(printer)) {
          return {
            printer,
            wasDefault: false,
            fallbackReason: `${defaultPrinter?.name || 'Default printer'}: ${reason}`
          };
        }
      }

      return { printer: null, wasDefault: false, fallbackReason: `No available printers at ${location.name}` };
    }

    // No default set - find any ready printer
    const printers = await this.getPrintersByLocation(locationId);
    const readyPrinter = printers.find(p => this.isPrinterReady(p));
    return {
      printer: readyPrinter || null,
      wasDefault: false,
      fallbackReason: readyPrinter ? undefined : 'No available printers'
    };
  }

  private isPrinterReady(printer: DbPrinter): boolean {
    // Check status
    if (printer.status !== 'ready') return false;
    // Check ink (any color below 5% is unusable)
    if (printer.ink_cyan < 5 || printer.ink_magenta < 5 ||
      printer.ink_yellow < 5 || printer.ink_black < 5) return false;
    // Check paper
    if (printer.paper_count < 1) return false;
    return true;
  }

  private getPrinterIssue(printer: DbPrinter): string {
    if (printer.status !== 'ready') return `Status: ${printer.status}`;
    const lowInk = [];
    if (printer.ink_cyan < 5) lowInk.push('Cyan');
    if (printer.ink_magenta < 5) lowInk.push('Magenta');
    if (printer.ink_yellow < 5) lowInk.push('Yellow');
    if (printer.ink_black < 5) lowInk.push('Black');
    if (lowInk.length > 0) return `Out of ${lowInk.join(', ')} ink`;
    if (printer.paper_count < 1) return 'Out of paper';
    return 'Unknown issue';
  }

  // ============================================
  // LOGS
  // ============================================

  async addLog(printerId: string, level: string, message: string, metadata?: any): Promise<void> {
    await this.getClient()
      .from('printer_logs')
      .insert({ printer_id: printerId, level, message, metadata });
  }

  async getLogs(printerId: string, limit = 50): Promise<any[]> {
    const { data } = await this.getClient()
      .from('printer_logs')
      .select('*')
      .eq('printer_id', printerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

// Singleton instance
let instance: SupabaseMultiPrinterStorage | null = null;

export function getSupabaseMultiPrinter(): SupabaseMultiPrinterStorage {
  if (!instance) {
    instance = new SupabaseMultiPrinterStorage();
  }
  return instance;
}
