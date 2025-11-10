/**
 * Vercel KV Storage Adapter
 * Uses Vercel KV (Redis) for state persistence in serverless environment
 */

import { IStorageAdapter, PrinterState } from './storage-adapter.js';

export class VercelKVStorage implements IStorageAdapter {
  private kv: any;
  private stateKey = 'virtual-printer:state';

  constructor() {
    // Lazy load @vercel/kv to avoid errors in local development
    // Will be initialized when actually needed
    this.kv = null;
  }

  private async getKV() {
    if (!this.kv) {
      try {
        // Use Function constructor to bypass TypeScript checking
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const vercelKV = await dynamicImport('@vercel/kv').catch(() => null);
        if (!vercelKV) {
          throw new Error('Vercel KV package not found');
        }
        this.kv = vercelKV.kv;
      } catch (error) {
        throw new Error('Vercel KV is not available. Install @vercel/kv or use STORAGE_TYPE=file');
      }
    }
    return this.kv;
  }

  async loadState(): Promise<PrinterState | null> {
    try {
      const kv = await this.getKV();
      const state = await kv.get(this.stateKey);
      return state as PrinterState | null;
    } catch (error) {
      console.warn('Vercel KV not available, using default state:', error);
      return null;
    }
  }

  async saveState(state: PrinterState): Promise<void> {
    try {
      const kv = await this.getKV();
      await kv.set(this.stateKey, state);
    } catch (error) {
      console.warn('Vercel KV not available, state will not persist:', error);
      // Don't throw - allow operation to continue without persistence
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const kv = await this.getKV();
      // Try to perform a simple operation
      await kv.ping();
      return true;
    } catch {
      return false;
    }
  }

  async clearState(): Promise<void> {
    try {
      const kv = await this.getKV();
      await kv.del(this.stateKey);
    } catch (error) {
      console.warn('Vercel KV not available, nothing to clear:', error);
      // Don't throw - operation is essentially successful (no state to clear)
    }
  }

  getType(): string {
    return 'vercel-kv';
  }
}
