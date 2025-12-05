/**
 * Multi-Printer State Manager
 * Manages multiple virtual printers with locations
 */

import { IStorageAdapter, createStorageAdapter } from './adapters/storage-adapter.js';
import {
  PrinterInstance,
  PrinterLocation,
  MultiPrinterState,
  PrinterType,
  PrinterSettings,
  HP_PRINTER_TYPES,
  DEFAULT_LOCATIONS,
  getDefaultInkLevels,
  getPrinterTypeById,
  InkLevels,
  PrintJob,
  Statistics,
  PaperSize,
} from './types.js';

// Storage keys
const MULTI_PRINTER_STATE_KEY = 'multi-printer-state';

export class MultiPrinterManager {
  private storage: IStorageAdapter | null = null;
  private state: MultiPrinterState | null = null;
  private initialized = false;

  constructor() { }

  /**
   * Initialize storage and load state
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[MultiPrinterManager] Initializing...');

    try {
      this.storage = await createStorageAdapter();
      console.log('[MultiPrinterManager] Storage adapter created:', this.storage?.getType());
    } catch (error) {
      console.warn('[MultiPrinterManager] Storage adapter failed, using in-memory only:', error);
      this.storage = null;
    }

    this.state = await this.loadState();
    this.initialized = true;
    console.log('[MultiPrinterManager] Initialized with', Object.keys(this.state.printers).length, 'printers');
  }

  /**
   * Ensure manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Load multi-printer state from storage
   */
  private async loadState(): Promise<MultiPrinterState> {
    try {
      if (this.storage) {
        console.log('[MultiPrinterManager] Loading state from storage...');
        const raw = await (this.storage as any).loadState?.(MULTI_PRINTER_STATE_KEY);
        if (raw && typeof raw === 'object' && 'printers' in raw) {
          console.log('[MultiPrinterManager] Loaded state from storage');
          return raw as MultiPrinterState;
        }
        console.log('[MultiPrinterManager] No existing state in storage, creating default');
      }
    } catch (error) {
      console.warn('[MultiPrinterManager] Error loading state, using defaults:', error);
    }

    // Initialize with default state
    console.log('[MultiPrinterManager] Creating default state with sample printers');
    const defaultState = this.createDefaultState();

    // Save the default state so IDs persist
    if (this.storage) {
      console.log('[MultiPrinterManager] Persisting default state to storage...');
      try {
        // We need to set this.state temporarily for saveState to work if it uses it, 
        // or just call storage directly. 
        // Looking at saveState(), it uses this.state.
        // So let's use the storage adapter directly to avoid side effects during load
        await (this.storage as any).saveState?.(defaultState, MULTI_PRINTER_STATE_KEY);
        console.log('[MultiPrinterManager] Default state persisted');
      } catch (error) {
        console.warn('[MultiPrinterManager] Failed to persist default state:', error);
      }
    }

    return defaultState;
  }

  /**
   * Save state to storage
   */
  private async saveState(): Promise<boolean> {
    if (!this.state || !this.storage) return false;

    this.state.version++;
    this.state.lastUpdated = Date.now();

    try {
      await (this.storage as any).saveState?.(this.state, MULTI_PRINTER_STATE_KEY);
      return true;
    } catch (error) {
      console.error('Error saving multi-printer state:', error);
      return false;
    }
  }

  /**
   * Create default state with Office and Home locations + sample printers
   */
  private createDefaultState(): MultiPrinterState {
    const now = Date.now();

    // Create locations
    const locations: Record<string, PrinterLocation> = {};
    const officeLocation: PrinterLocation = {
      id: 'loc-office',
      name: 'Office',
      description: 'Office printers for business use',
      icon: '🏢',
      color: '#1f6feb',
      printerIds: [],
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    const homeLocation: PrinterLocation = {
      id: 'loc-home',
      name: 'Home',
      description: 'Home printers for personal use',
      icon: '🏠',
      color: '#238636',
      printerIds: [],
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    };

    locations[officeLocation.id] = officeLocation;
    locations[homeLocation.id] = homeLocation;

    // Create default printers
    const printers: Record<string, PrinterInstance> = {};

    // Office printers
    const officeLaser = this.createPrinterInstance(
      'HP LaserJet Pro',
      'hp-laserjet-pro-m404dn',
      'loc-office'
    );
    printers[officeLaser.id] = officeLaser;
    officeLocation.printerIds.push(officeLaser.id);

    const officeColor = this.createPrinterInstance(
      'HP Color LaserJet',
      'hp-color-laserjet-pro-m454dw',
      'loc-office'
    );
    printers[officeColor.id] = officeColor;
    officeLocation.printerIds.push(officeColor.id);

    const officeJet = this.createPrinterInstance(
      'HP OfficeJet Pro 9015e',
      'hp-officejet-pro-9015e',
      'loc-office'
    );
    printers[officeJet.id] = officeJet;
    officeLocation.printerIds.push(officeJet.id);

    // Home printers
    const homeDeskjet = this.createPrinterInstance(
      'HP DeskJet 2755e',
      'hp-deskjet-2755e',
      'loc-home'
    );
    printers[homeDeskjet.id] = homeDeskjet;
    homeLocation.printerIds.push(homeDeskjet.id);

    const homeEnvy = this.createPrinterInstance(
      'HP ENVY 6055e',
      'hp-envy-6055e',
      'loc-home'
    );
    printers[homeEnvy.id] = homeEnvy;
    homeLocation.printerIds.push(homeEnvy.id);

    const homeSmartTank = this.createPrinterInstance(
      'HP Smart Tank 5101',
      'hp-smart-tank-5101',
      'loc-home'
    );
    printers[homeSmartTank.id] = homeSmartTank;
    homeLocation.printerIds.push(homeSmartTank.id);

    return {
      printers,
      locations,
      defaultPrinterId: officeLaser.id,
      lastSelectedPrinterId: officeLaser.id,
      version: 1,
      lastUpdated: now,
    };
  }

  /**
   * Create a new printer instance from a type template
   */
  private createPrinterInstance(
    name: string,
    typeId: string,
    locationId?: string
  ): PrinterInstance {
    const printerType = getPrinterTypeById(typeId);
    if (!printerType) {
      throw new Error(`Unknown printer type: ${typeId}`);
    }

    const now = Date.now();
    const id = `printer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      name,
      typeId,
      locationId,
      status: 'ready',
      inkLevels: getDefaultInkLevels(printerType.inkColors),
      paperCount: Math.floor(printerType.paperCapacity * 0.8), // 80% full
      paperSize: 'A4',
      paperTrayCapacity: printerType.paperCapacity,
      queue: [],
      currentJob: null,
      completedJobs: [],
      errors: [],
      logs: [{
        timestamp: now,
        level: 'info',
        message: `Printer "${name}" initialized`,
        printerId: id,
      }],
      statistics: {
        totalPagesPrinted: 0,
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        totalInkUsed: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        maintenanceOperations: 0,
        lastMaintenanceDate: null,
      },
      settings: {
        defaultQuality: 'normal',
        defaultPaperSize: 'A4',
        enableErrorSimulation: false,
        errorProbability: 0.02,
        autoWakeup: true,
        sleepAfterMinutes: 30,
        printSpeedMultiplier: 1.0,
      },
      lastUpdated: now,
      lastStartTime: now,
      createdAt: now,
      version: 1,
    };
  }

  // ============================================
  // Public API - Printers
  // ============================================

  /**
   * Get all printers
   */
  async getAllPrinters(): Promise<PrinterInstance[]> {
    await this.ensureInitialized();
    return Object.values(this.state!.printers);
  }

  /**
   * Get printer by ID
   */
  async getPrinter(printerId: string): Promise<PrinterInstance | null> {
    await this.ensureInitialized();
    return this.state!.printers[printerId] || null;
  }

  /**
   * Get printers by location
   */
  async getPrintersByLocation(locationId: string): Promise<PrinterInstance[]> {
    await this.ensureInitialized();
    const location = this.state!.locations[locationId];
    if (!location) return [];

    return location.printerIds
      .map(id => this.state!.printers[id])
      .filter(Boolean);
  }

  /**
   * Add a new printer
   */
  async addPrinter(name: string, typeId: string, locationId?: string): Promise<PrinterInstance> {
    await this.ensureInitialized();

    const printer = this.createPrinterInstance(name, typeId, locationId);
    this.state!.printers[printer.id] = printer;

    if (locationId && this.state!.locations[locationId]) {
      this.state!.locations[locationId].printerIds.push(printer.id);
      this.state!.locations[locationId].updatedAt = Date.now();
    }

    await this.saveState();
    return printer;
  }

  /**
   * Rename a printer
   */
  async renamePrinter(printerId: string, newName: string): Promise<boolean> {
    await this.ensureInitialized();

    const printer = this.state!.printers[printerId];
    if (!printer) return false;

    printer.name = newName;
    printer.lastUpdated = Date.now();

    await this.saveState();
    return true;
  }

  /**
   * Move printer to a different location
   */
  async movePrinter(printerId: string, newLocationId: string | null): Promise<boolean> {
    await this.ensureInitialized();

    const printer = this.state!.printers[printerId];
    if (!printer) return false;

    // Remove from old location
    if (printer.locationId && this.state!.locations[printer.locationId]) {
      const oldLoc = this.state!.locations[printer.locationId];
      oldLoc.printerIds = oldLoc.printerIds.filter(id => id !== printerId);
      oldLoc.updatedAt = Date.now();
    }

    // Add to new location
    printer.locationId = newLocationId || undefined;
    if (newLocationId && this.state!.locations[newLocationId]) {
      this.state!.locations[newLocationId].printerIds.push(printerId);
      this.state!.locations[newLocationId].updatedAt = Date.now();
    }

    printer.lastUpdated = Date.now();
    await this.saveState();
    return true;
  }

  /**
   * Delete a printer
   */
  async deletePrinter(printerId: string): Promise<boolean> {
    await this.ensureInitialized();

    const printer = this.state!.printers[printerId];
    if (!printer) return false;

    // Remove from location
    if (printer.locationId && this.state!.locations[printer.locationId]) {
      const loc = this.state!.locations[printer.locationId];
      loc.printerIds = loc.printerIds.filter(id => id !== printerId);
      loc.updatedAt = Date.now();
    }

    delete this.state!.printers[printerId];

    // Update default if needed
    if (this.state!.defaultPrinterId === printerId) {
      const remaining = Object.keys(this.state!.printers);
      this.state!.defaultPrinterId = remaining[0];
    }

    await this.saveState();
    return true;
  }

  /**
   * Update printer settings
   */
  async updatePrinterSettings(printerId: string, settings: Partial<PrinterSettings>): Promise<boolean> {
    await this.ensureInitialized();

    const printer = this.state!.printers[printerId];
    if (!printer) return false;

    printer.settings = { ...printer.settings, ...settings };
    printer.lastUpdated = Date.now();

    await this.saveState();
    return true;
  }

  // ============================================
  // Public API - Locations
  // ============================================

  /**
   * Get all locations
   */
  async getAllLocations(): Promise<PrinterLocation[]> {
    await this.ensureInitialized();
    return Object.values(this.state!.locations).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get location by ID
   */
  async getLocation(locationId: string): Promise<PrinterLocation | null> {
    await this.ensureInitialized();
    return this.state!.locations[locationId] || null;
  }

  /**
   * Add a new location
   */
  async addLocation(name: string, icon: string = '📍', color: string = '#6e7781'): Promise<PrinterLocation> {
    await this.ensureInitialized();

    const now = Date.now();
    const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sortOrder = Object.keys(this.state!.locations).length;

    const location: PrinterLocation = {
      id,
      name,
      icon,
      color,
      printerIds: [],
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    this.state!.locations[id] = location;
    await this.saveState();
    return location;
  }

  /**
   * Rename a location
   */
  async renameLocation(locationId: string, newName: string): Promise<boolean> {
    await this.ensureInitialized();

    const location = this.state!.locations[locationId];
    if (!location) return false;

    location.name = newName;
    location.updatedAt = Date.now();

    await this.saveState();
    return true;
  }

  /**
   * Delete a location (printers become unassigned)
   */
  async deleteLocation(locationId: string): Promise<boolean> {
    await this.ensureInitialized();

    const location = this.state!.locations[locationId];
    if (!location) return false;

    // Unassign printers from this location
    for (const printerId of location.printerIds) {
      if (this.state!.printers[printerId]) {
        this.state!.printers[printerId].locationId = undefined;
      }
    }

    delete this.state!.locations[locationId];
    await this.saveState();
    return true;
  }

  // ============================================
  // Public API - Printer Types
  // ============================================

  /**
   * Get all available printer types
   */
  getAvailablePrinterTypes(): PrinterType[] {
    return HP_PRINTER_TYPES;
  }

  /**
   * Get printer type by ID
   */
  getPrinterType(typeId: string): PrinterType | undefined {
    return getPrinterTypeById(typeId);
  }

  // ============================================
  // Public API - State
  // ============================================

  /**
   * Get full state summary
   */
  async getStateSummary(): Promise<{
    printerCount: number;
    locationCount: number;
    defaultPrinterId?: string;
    locations: { id: string; name: string; printerCount: number }[];
  }> {
    await this.ensureInitialized();

    return {
      printerCount: Object.keys(this.state!.printers).length,
      locationCount: Object.keys(this.state!.locations).length,
      defaultPrinterId: this.state!.defaultPrinterId,
      locations: Object.values(this.state!.locations).map(loc => ({
        id: loc.id,
        name: loc.name,
        printerCount: loc.printerIds.length,
      })),
    };
  }

  /**
   * Set default printer
   */
  async setDefaultPrinter(printerId: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.state!.printers[printerId]) return false;

    this.state!.defaultPrinterId = printerId;
    await this.saveState();
    return true;
  }

  /**
   * Get default printer
   */
  async getDefaultPrinter(): Promise<PrinterInstance | null> {
    await this.ensureInitialized();

    if (!this.state!.defaultPrinterId) return null;
    return this.state!.printers[this.state!.defaultPrinterId] || null;
  }

  /**
   * Reset to default state
   */
  async resetToDefaults(): Promise<void> {
    await this.ensureInitialized();
    this.state = this.createDefaultState();
    await this.saveState();
  }
}

// Singleton instance
let instance: MultiPrinterManager | null = null;

export function getMultiPrinterManager(): MultiPrinterManager {
  if (!instance) {
    instance = new MultiPrinterManager();
  }
  return instance;
}
