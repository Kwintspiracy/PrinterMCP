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

  console.log(`[StorageAdapter] Creating adapter: type=${storageType}, isVercel=${isVercel}`);

  switch (storageType) {
    case 'supabase':
      try {
        const { SupabaseStorage } = await import('./supabase-storage.js');
        return new SupabaseStorage();
      } catch (error) {
        console.warn('[StorageAdapter] Supabase storage failed, falling back to file storage:', error);
        const { FileStorage } = await import('./file-storage.js');
        return new FileStorage();
      }

    case 'vercel-kv':
      try {
        const { VercelKVStorage } = await import('./vercel-storage.js');
        const storage = new VercelKVStorage();
        // Test if KV is actually available
        const isHealthy = await storage.healthCheck().catch(() => false);
        if (isHealthy) {
          console.log('[StorageAdapter] Vercel KV is healthy');
          return storage;
        }
        console.warn('[StorageAdapter] Vercel KV not healthy, using in-memory storage');
        return createInMemoryAdapter();
      } catch (error) {
        console.warn('[StorageAdapter] Vercel KV failed, using in-memory storage:', error);
        return createInMemoryAdapter();
      }

    case 'file':
    default:
      const { FileStorage } = await import('./file-storage.js');
      return new FileStorage();
  }
}

/**
 * Simple in-memory storage adapter for serverless environments without persistent storage
 */
function createInMemoryAdapter(): IStorageAdapter {
  const store = new Map<string, any>();

  return {
    async loadState(key?: string): Promise<PrinterState | null> {
      return store.get(key || 'default') || null;
    },
    async saveState(state: PrinterState, key?: string): Promise<void> {
      store.set(key || 'default', state);
    },
    async healthCheck(): Promise<boolean> {
      return true;
    },
    async clearState(): Promise<void> {
      store.clear();
    },
    getType(): string {
      return 'in-memory';
    }
  };
}
