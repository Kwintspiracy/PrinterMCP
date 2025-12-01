/**
 * Storage Adapter Interface
 * Abstracts storage layer to support multiple backends (file system, Vercel KV, etc.)
 */

export interface PrinterState {
  name: string;
  status: 'ready' | 'printing' | 'warming_up' | 'paused' | 'error' | 'offline';
  inkLevels: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  paperCount: number;
  paperSize: 'A4' | 'Letter' | 'Legal' | 'A3' | '4x6';
  queue: any[];
  currentJob: any | null;
  statistics: {
    totalPagesPrinted: number;
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalInkUsed: {
      cyan: number;
      magenta: number;
      yellow: number;
      black: number;
    };
    maintenanceOperations: number;
    lastMaintenanceDate: number | null;
  };
  errors: any[];
  logs: any[];
  lastUpdated: number;
  capabilities: any;
  version: number; // For optimistic locking
}

/**
 * Storage adapter interface for printer state persistence
 */
export interface IStorageAdapter {
  /**
   * Load printer state from storage
   * @returns Printer state or null if not found
   */
  loadState(): Promise<PrinterState | null>;

  /**
   * Save printer state to storage
   * @param state Printer state to save
   */
  saveState(state: PrinterState): Promise<void>;

  /**
   * Check if storage is available and working
   * @returns true if storage is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Clear all stored state (factory reset)
   */
  clearState(): Promise<void>;

  /**
   * Get storage type identifier
   */
  getType(): string;
}

/**
 * Factory function to create appropriate storage adapter based on environment
 */
export async function createStorageAdapter(): Promise<IStorageAdapter> {
  // Auto-detect Vercel environment
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  const storageType = process.env.STORAGE_TYPE || (isVercel ? 'vercel-kv' : 'file');

  console.log(`Storage adapter: type=${storageType}, isVercel=${isVercel}`);

  switch (storageType) {
    case 'supabase':
      try {
        const { SupabaseStorage } = await import('./supabase-storage.js');
        return new SupabaseStorage();
      } catch (error) {
        console.warn('Supabase storage failed to initialize, falling back to file storage:', error);
        const { FileStorage } = await import('./file-storage.js');
        return new FileStorage();
      }

    case 'vercel-kv':
      try {
        const { VercelKVStorage } = await import('./vercel-storage.js');
        return new VercelKVStorage();
      } catch (error) {
        console.warn('Vercel KV storage failed to initialize, falling back to file storage:', error);
        const { FileStorage } = await import('./file-storage.js');
        return new FileStorage();
      }

    case 'file':
    default:
      const { FileStorage } = await import('./file-storage.js');
      return new FileStorage();
  }
}
