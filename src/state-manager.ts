/**
 * State Manager - Handles persistent storage of printer state
 * Now uses storage adapters to support multiple backends
 */

import { IStorageAdapter, PrinterState, createStorageAdapter } from './adapters/storage-adapter.js';

export interface PrinterConfiguration {
  printerName: string;
  printSpeedPPM: number;
  maintenanceInterval: number;
  paperTrayCapacity: number;
  enableErrorSimulation: boolean;
  errorProbability: number;
  stateFilePath?: string;
}

export interface FullPrinterState extends PrinterState {
  paperTrayCapacity: number;
  completedJobs: any[];
  maintenanceHistory: any[];
  lastStartTime: number;
  configuration: PrinterConfiguration;
}

export class StateManager {
  private storage: IStorageAdapter | null = null;
  private initialized = false;

  constructor() {
    // Storage adapter will be initialized lazily
  }

  /**
   * Initialize storage adapter
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.storage = await createStorageAdapter();
      this.initialized = true;
    }
  }

  /**
   * Load printer state from storage, or return default if doesn't exist
   */
  async loadState(): Promise<FullPrinterState> {
    try {
      await this.ensureInitialized();

      if (this.storage) {
        const state = await this.storage.loadState();
        if (state) {
          // Migrate to full state format
          return this.validateState(state as any);
        }
      }
    } catch (error) {
      console.error('Error loading printer state:', error);
    }

    // Return default state if load fails or doesn't exist
    return this.getDefaultState();
  }

  /**
   * Save printer state to storage
   */
  async saveState(state: FullPrinterState): Promise<boolean> {
    try {
      await this.ensureInitialized();

      // Increment version for optimistic locking
      state.version = (state.version || 0) + 1;

      if (this.storage) {
        await this.storage.saveState(state);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving printer state:', error);
      return false;
    }
  }

  /**
   * Get default printer state
   */
  getDefaultState(): FullPrinterState {
    return {
      name: 'Virtual Inkjet Pro',
      status: 'offline',
      inkLevels: {
        cyan: 100,
        magenta: 100,
        yellow: 100,
        black: 100
      },
      paperCount: 100,
      paperSize: 'A4',
      paperTrayCapacity: 100,
      queue: [],
      currentJob: null,
      completedJobs: [],
      errors: [],
      maintenanceHistory: [],
      statistics: {
        totalPagesPrinted: 0,
        totalInkUsed: {
          cyan: 0,
          magenta: 0,
          yellow: 0,
          black: 0
        },
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        maintenanceOperations: 0,
        lastMaintenanceDate: null
      },
      logs: [],
      lastUpdated: Date.now(),
      lastStartTime: Date.now(),
      capabilities: this.getDefaultCapabilities(),
      configuration: this.getDefaultConfiguration(),
      version: 0
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration(): PrinterConfiguration {
    return {
      printerName: 'Virtual Inkjet Pro',
      printSpeedPPM: 15,
      maintenanceInterval: 500,
      paperTrayCapacity: 100,
      enableErrorSimulation: true,
      errorProbability: 0.05
    };
  }

  /**
   * Get default capabilities
   */
  getDefaultCapabilities() {
    return {
      name: 'Virtual Inkjet Pro',
      type: 'Inkjet',
      colorSupport: true,
      duplexSupport: false,
      maxPaperSize: 'A3',
      supportedPaperSizes: ['A4', 'Letter', 'Legal', 'A3', '4x6'],
      maxResolutionDPI: 4800,
      printSpeedPPM: 15,
      printSpeedPPMColor: 12,
      paperTrayCapacity: 100,
      inkType: 'CMYK',
      connectivity: ['USB', 'WiFi', 'Ethernet']
    };
  }

  /**
   * Validate and potentially migrate state from older versions
   */
  validateState(state: any): FullPrinterState {
    const defaultState = this.getDefaultState();

    return {
      name: state.name || defaultState.name,
      status: state.status || defaultState.status,
      inkLevels: state.inkLevels || defaultState.inkLevels,
      paperCount: state.paperCount ?? defaultState.paperCount,
      paperSize: state.paperSize || defaultState.paperSize,
      paperTrayCapacity: state.paperTrayCapacity || defaultState.paperTrayCapacity,
      queue: state.queue || state.jobQueue || [],
      currentJob: state.currentJob || null,
      completedJobs: state.completedJobs || [],
      errors: state.errors || [],
      maintenanceHistory: state.maintenanceHistory || [],
      statistics: state.statistics || defaultState.statistics,
      logs: state.logs || [],
      lastUpdated: state.lastUpdated || Date.now(),
      lastStartTime: state.lastStartTime || Date.now(),
      capabilities: state.capabilities || defaultState.capabilities,
      configuration: state.configuration || defaultState.configuration,
      version: state.version || 0
    };
  }

  /**
   * Delete the state (for reset operations)
   */
  async deleteState(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      if (this.storage) {
        await this.storage.clearState();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting printer state:', error);
      return false;
    }
  }

  /**
   * Check if storage is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      if (this.storage) {
        return await this.storage.healthCheck();
      }
      return false;
    } catch (error) {
      console.error('Error checking storage health:', error);
      return false;
    }
  }

  /**
   * Get storage type identifier
   */
  async getStorageType(): Promise<string> {
    await this.ensureInitialized();
    return this.storage?.getType() || 'unknown';
  }
}
