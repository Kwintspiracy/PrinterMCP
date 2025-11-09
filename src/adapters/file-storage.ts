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

  async loadState(): Promise<PrinterState | null> {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(data) as PrinterState;
      }
      return null;
    } catch (error) {
      console.error('Error loading state from file:', error);
      return null;
    }
  }

  async saveState(state: PrinterState): Promise<void> {
    try {
      const data = JSON.stringify(state, null, 2);
      fs.writeFileSync(this.stateFile, data, 'utf-8');
    } catch (error) {
      console.error('Error saving state to file:', error);
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

  async clearState(): Promise<void> {
    try {
      if (fs.existsSync(this.stateFile)) {
        fs.unlinkSync(this.stateFile);
      }
    } catch (error) {
      console.error('Error clearing state file:', error);
      throw error;
    }
  }

  getType(): string {
    return 'file';
  }

  /**
   * Get the path to the state file (for debugging)
   */
  getStatePath(): string {
    return this.stateFile;
  }
}
