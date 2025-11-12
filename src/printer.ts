/**
 * Virtual Printer Implementation
 * Simulates an inkjet printer with realistic behavior
 */

import { StateManager } from './state-manager.js';
import {
  PrinterStatus,
  PrintQuality,
  PaperSize,
  InkColor,
  InkLevels,
  PrintJob,
  PrintDocumentParams,
  PrinterError,
  LogEntry,
  Statistics
} from './types.js';

export class VirtualPrinter {
  private state: any;
  private stateManager: StateManager;
  private processingInterval: NodeJS.Timeout | null = null;
  private initPromise: Promise<void>;
  private isServerless: boolean;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    // Detect serverless environment (Vercel)
    this.isServerless = !!(process.env.VERCEL || process.env.STORAGE_TYPE === 'vercel-kv');
    
    // Log environment detection
    console.log('[PrinterInit] Environment Detection:', {
      VERCEL: process.env.VERCEL,
      STORAGE_TYPE: process.env.STORAGE_TYPE,
      isServerless: this.isServerless,
      NODE_ENV: process.env.NODE_ENV
    });
    
    this.initPromise = this.initialize();
  }

  private async initialize() {
    console.log('[PrinterInit] Starting initialization...');
    
    try {
      this.state = await this.stateManager.loadState();
      console.log('[PrinterInit] State loaded:', {
        status: this.state.status,
        name: this.state.name,
        hasInkLevels: !!this.state.inkLevels,
        paperCount: this.state.paperCount
      });
      
      if (this.isServerless) {
        console.log('[PrinterInit] Serverless mode detected');
        // Serverless: Always ensure ready state regardless of current status
        // This handles stale states from previous deployments
        if (this.state.status !== 'ready' && this.state.status !== 'printing') {
          console.log(`[PrinterInit] Converting status from '${this.state.status}' to 'ready'`);
          this.state.status = 'ready';
          this.log('info', 'Printer ready (serverless mode)');
          
          try {
            await this.saveState();
            console.log('[PrinterInit] Status saved successfully');
          } catch (saveError) {
            console.warn('[PrinterInit] Failed to save state, but continuing with in-memory state:', saveError);
            // Continue anyway - printer will work in memory-only mode
          }
        } else {
          console.log(`[PrinterInit] Status already '${this.state.status}', no change needed`);
        }
      } else {
        console.log('[PrinterInit] Local mode detected');
        // Local: simulate warming up if offline
        if (this.state.status === 'offline') {
          console.log('[PrinterInit] Starting warm-up sequence');
          this.log('info', 'Printer warming up...');
          this.state.status = 'warming_up';
          await this.saveState();
          
          setTimeout(async () => {
            this.state.status = 'ready';
            this.log('info', 'Printer ready');
            await this.saveState();
            console.log('[PrinterInit] Warm-up complete');
          }, 12000);
        }
        
        // Start interval processing in local/persistent environments
        this.startProcessing();
      }
      
      console.log('[PrinterInit] Initialization complete, final status:', this.state.status);
    } catch (error) {
      console.error('[PrinterInit] Initialization failed:', error);
      // If initialization fails completely, set a default working state
      console.log('[PrinterInit] Creating default state due to initialization failure');
      this.state = await this.stateManager.getDefaultState();
      this.state.status = 'ready';
      console.log('[PrinterInit] Using fallback default state with ready status');
    }
  }

  async ensureInitialized() {
    await this.initPromise;
  }

  private startProcessing() {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 1000);
  }

  private async processQueue() {
    if (this.state.status !== 'ready' || this.state.queue.length === 0) {
      return;
    }

    const job = this.state.queue[0];
    if (!job) return;

    // Start job if not started
    if (job.status === 'queued') {
      job.status = 'printing';
      job.startedAt = Date.now();
      this.state.currentJob = job;
      this.state.status = 'printing';
      this.log('info', `Starting print job: ${job.documentName}`);
      await this.saveState();
    }

    // Process printing
    if (job.status === 'printing') {
      const elapsed = (Date.now() - job.startedAt!) / 1000;
      job.progress = Math.min(100, (elapsed / job.estimatedTime) * 100);

      // Consume resources
      if (Math.random() < 0.1) {
        await this.consumeInk(job);
        await this.consumePaper(1);
      }

      // Check for errors
      if (Math.random() < 0.05 && this.state.configuration.enableErrorSimulation) {
        await this.simulateError();
      }

      // Complete job
      if (job.progress >= 100) {
        job.status = 'completed';
        job.completedAt = Date.now();
        this.state.queue.shift();
        this.state.completedJobs.push(job);
        this.state.currentJob = null;
        this.state.status = 'ready';
        this.state.statistics.successfulJobs++;
        this.state.statistics.totalPagesPrinted += job.pages;
        this.log('info', `Completed print job: ${job.documentName}`);
      }

      await this.saveState();
    }
  }

  private async consumeInk(job: PrintJob) {
    const consumptionRates: Record<PrintQuality, number> = {
      draft: job.color ? 0.5 : 0.6,
      normal: job.color ? 1.0 : 1.2,
      high: job.color ? 1.5 : 1.8,
      photo: job.color ? 2.5 : 3.0
    };

    const rate = consumptionRates[job.quality] / job.pages;

    if (job.color) {
      this.state.inkLevels.cyan = Math.max(0, this.state.inkLevels.cyan - rate);
      this.state.inkLevels.magenta = Math.max(0, this.state.inkLevels.magenta - rate);
      this.state.inkLevels.yellow = Math.max(0, this.state.inkLevels.yellow - rate);
      this.state.statistics.totalInkUsed.cyan += rate;
      this.state.statistics.totalInkUsed.magenta += rate;
      this.state.statistics.totalInkUsed.yellow += rate;
    }
    
    this.state.inkLevels.black = Math.max(0, this.state.inkLevels.black - rate);
    this.state.statistics.totalInkUsed.black += rate;

    // Check for low ink
    for (const [color, level] of Object.entries(this.state.inkLevels) as [string, number][]) {
      if (level < 15) {
        this.addError({
          type: 'low_ink',
          message: `Low ${color} ink (${Math.round(level)}%)`,
          timestamp: Date.now(),
          severity: 'warning'
        });
      }
    }
  }

  private async consumePaper(count: number) {
    this.state.paperCount = Math.max(0, this.state.paperCount - count);
    
    if (this.state.paperCount === 0) {
      this.state.status = 'error';
      this.addError({
        type: 'out_of_paper',
        message: 'Out of paper',
        timestamp: Date.now(),
        severity: 'error'
      });
    }
  }

  private async simulateError() {
    this.state.status = 'error';
    this.addError({
      type: 'paper_jam',
      message: 'Paper jam detected',
      timestamp: Date.now(),
      severity: 'error'
    });
    this.log('error', 'Paper jam occurred');
  }

  private addError(error: PrinterError) {
    this.state.errors.push(error);
    if (this.state.errors.length > 10) {
      this.state.errors.shift();
    }
  }

  private log(level: 'info' | 'warning' | 'error', message: string) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message
    };
    this.state.logs.push(entry);
    if (this.state.logs.length > 100) {
      this.state.logs.shift();
    }
  }

  private async saveState() {
    this.state.lastUpdated = Date.now();
    await this.stateManager.saveState(this.state);
  }

  /**
   * Reload state from storage
   * Used when external processes modify the state
   */
  async reloadState(): Promise<void> {
    this.state = await this.stateManager.loadState();
    
    // In serverless mode, always force status to ready after reloading
    // This handles cases where storage fails or contains stale state
    if (this.isServerless && this.state.status !== 'ready' && this.state.status !== 'printing') {
      console.log(`[PrinterReload] Forcing status from '${this.state.status}' to 'ready' (serverless mode)`);
      this.state.status = 'ready';
    }
  }

  // Public API Methods

  printDocument(params: PrintDocumentParams) {
    const job: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentName: params.documentName,
      pages: params.pages,
      color: params.color ?? false,
      quality: params.quality ?? 'normal',
      paperSize: params.paperSize ?? 'A4',
      status: 'queued',
      progress: 0,
      submittedAt: Date.now(),
      estimatedTime: this.calculateEstimatedTime(params.pages, params.quality ?? 'normal')
    };

    this.state.queue.push(job);
    this.state.statistics.totalJobs++;
    this.log('info', `Print job queued: ${params.documentName}`);
    this.saveState();

    return {
      jobId: job.id,
      message: 'Print job queued successfully',
      estimatedTime: job.estimatedTime
    };
  }

  private calculateEstimatedTime(pages: number, quality: PrintQuality): number {
    const baseTime = pages * (60 / 15); // 15 pages per minute
    const qualityMultiplier: Record<PrintQuality, number> = {
      draft: 0.7,
      normal: 1.0,
      high: 1.5,
      photo: 2.5
    };
    return Math.ceil(baseTime * qualityMultiplier[quality]);
  }

  cancelJob(jobId: string): string {
    const index = this.state.queue.findIndex((j: PrintJob) => j.id === jobId);
    if (index === -1) {
      throw new Error('Job not found');
    }

    const job = this.state.queue[index];
    if (job.status === 'printing') {
      this.state.currentJob = null;
      this.state.status = 'ready';
    }

    job.status = 'cancelled';
    this.state.queue.splice(index, 1);
    this.state.statistics.failedJobs++;
    this.log('info', `Cancelled job: ${job.documentName}`);
    this.saveState();

    return `Job ${jobId} cancelled`;
  }

  getStatus() {
    return {
      name: this.state.name,
      status: this.state.status,
      inkLevels: this.state.inkLevels,
      paper: {
        count: this.state.paperCount,
        capacity: this.state.paperTrayCapacity,
        size: this.state.paperSize
      },
      currentJob: this.state.currentJob,
      queue: {
        length: this.state.queue.length,
        jobs: this.state.queue.map((j: PrintJob) => ({
          id: j.id,
          document: j.documentName,
          pages: j.pages,
          status: j.status,
          progress: j.progress
        }))
      },
      errors: this.state.errors,
      uptimeSeconds: Math.floor((Date.now() - this.state.lastStartTime) / 1000),
      maintenanceNeeded: this.state.statistics.totalPagesPrinted > 450
    };
  }

  getStatistics(): Statistics {
    return this.state.statistics;
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.state.logs.slice(-limit);
  }

  getCapabilities() {
    return this.state.capabilities;
  }

  pause(): string {
    if (this.state.status === 'printing') {
      this.state.status = 'paused';
      this.log('info', 'Printer paused');
      this.saveState();
      return 'Printer paused';
    }
    throw new Error('Cannot pause - printer not printing');
  }

  resume(): string {
    if (this.state.status === 'paused') {
      this.state.status = 'printing';
      this.log('info', 'Printer resumed');
      this.saveState();
      return 'Printer resumed';
    }
    throw new Error('Cannot resume - printer not paused');
  }

  refillInk(color: InkColor): string {
    this.state.inkLevels[color] = 100;
    this.log('info', `Refilled ${color} ink to 100%`);
    this.saveState();
    return `${color} ink refilled to 100%`;
  }

  loadPaper(count: number, paperSize?: PaperSize): string {
    const newCount = Math.min(this.state.paperTrayCapacity, this.state.paperCount + count);
    const added = newCount - this.state.paperCount;
    this.state.paperCount = newCount;
    
    if (paperSize) {
      this.state.paperSize = paperSize;
    }

    // Clear out of paper error
    this.state.errors = this.state.errors.filter((e: PrinterError) => e.type !== 'out_of_paper');
    if (this.state.status === 'error' && this.state.errors.length === 0) {
      this.state.status = 'ready';
    }

    this.log('info', `Loaded ${added} sheets of ${this.state.paperSize} paper`);
    this.saveState();
    return `Loaded ${added} sheets`;
  }

  cleanPrintHeads(): string {
    this.log('info', 'Running print head cleaning cycle');
    this.state.statistics.maintenanceOperations++;
    this.state.statistics.lastMaintenanceDate = Date.now();
    
    // Consume ink
    Object.keys(this.state.inkLevels).forEach(color => {
      this.state.inkLevels[color] = Math.max(0, this.state.inkLevels[color] - 2);
    });
    
    this.saveState();
    return 'Print head cleaning cycle completed';
  }

  alignPrintHeads(): string {
    this.log('info', 'Running print head alignment');
    this.state.statistics.maintenanceOperations++;
    this.consumePaper(1);
    
    Object.keys(this.state.inkLevels).forEach(color => {
      this.state.inkLevels[color] = Math.max(0, this.state.inkLevels[color] - 1);
    });
    
    this.saveState();
    return 'Print head alignment completed';
  }

  runNozzleCheck(): string {
    this.log('info', 'Running nozzle check');
    this.consumePaper(1);
    this.saveState();
    return 'Nozzle check completed';
  }

  clearPaperJam(): string {
    this.state.errors = this.state.errors.filter((e: PrinterError) => e.type !== 'paper_jam');
    if (this.state.errors.length === 0) {
      this.state.status = 'ready';
    }
    this.log('info', 'Paper jam cleared');
    this.saveState();
    return 'Paper jam cleared';
  }

  powerCycle(): string {
    if (this.isServerless) {
      // Serverless: immediate power cycle
      this.state.status = 'ready';
      this.state.errors = [];
      this.log('info', 'Printer power cycled (serverless mode)');
      this.saveState();
      return 'Printer power cycled';
    } else {
      // Local: simulate power cycle with delays
      this.state.status = 'offline';
      this.log('info', 'Power cycling printer');
      this.saveState();
      
      setTimeout(async () => {
        this.state.status = 'warming_up';
        await this.saveState();
        setTimeout(async () => {
          this.state.status = 'ready';
          this.state.errors = [];
          this.log('info', 'Printer restarted');
          await this.saveState();
        }, 12000);
      }, 3000);
      
      return 'Power cycling printer...';
    }
  }

  async reset(): Promise<string> {
    await this.stateManager.deleteState();
    this.state = await this.stateManager.loadState();
    this.log('info', 'Printer reset to factory defaults');
    return 'Printer reset to factory defaults';
  }
}
