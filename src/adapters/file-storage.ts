/**
 * File-based Storage Adapter
 * Uses local file system for state persistence (for local development)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IStorageAdapter, PrinterState } from './storage-adapter.js';

export class FileStorage implements IStorageAdapter {
  private stateDir: string;
  private stateFile: string;

  constructor() {
    // Use home directory for state storage
    this.stateDir = path.join(os.homedir(), '.virtual-printer');
    this.stateFile = path.join(this.stateDir, 'printer-state.json');
    
    // Ensure directory exists
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a given key
   */
  private getFilePath(key?: string): string {
    if (!key || key === 'default') {
      return this.stateFile;
    }
    // Use key as filename for multi-state support
    return path.join(this.stateDir, `${key}.json`);
  }

  /**
   * Load state from file
   * @param key Optional key for multi-state support (defaults to 'printer-state')
   */
  async loadState(key?: string): Promise<PrinterState | any | null> {
    const filePath = this.getFilePath(key);
    
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        console.log(`[FileStorage] Loaded state from: ${filePath}`);
        return parsed;
      }
      console.log(`[FileStorage] No state file found at: ${filePath}`);
      return null;
    } catch (error) {
      console.error(`[FileStorage] Error loading state from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Save state to file
   * @param state The state to save
   * @param key Optional key for multi-state support (defaults to 'printer-state')
   */
  async saveState(state: PrinterState | any, key?: string): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      const data = JSON.stringify(state, null, 2);
      fs.writeFileSync(filePath, data, 'utf-8');
      console.log(`[FileStorage] Saved state to: ${filePath}`);
    } catch (error) {
      console.error(`[FileStorage] Error saving state to ${filePath}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if directory is writable
      fs.accessSync(this.stateDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async clearState(key?: string): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FileStorage] Cleared state file: ${filePath}`);
      }
    } catch (error) {
      console.error(`[FileStorage] Error clearing state file ${filePath}:`, error);
      throw error;
    }
  }

  getType(): string {
    return 'file';
  }

  /**
   * Get the path to the state file (for debugging)
   */
  getStatePath(key?: string): string {
    return this.getFilePath(key);
  }
}
