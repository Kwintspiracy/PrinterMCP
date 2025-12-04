// Environment-aware API base URL
// In development: http://localhost:3001/api
// In production (Vercel): /api (relative)
const API_BASE = import.meta.env?.MODE === 'development'
  ? 'http://localhost:3001/api'
  : '/api';

export interface PrinterStatus {
  id?: string;
  name: string;
  typeId?: string;
  type?: {
    brand: string;
    model: string;
    category: string;
    inkSystem: string;
    icon: string;
  } | null;
  status: string;
  operationalStatus: 'ready' | 'not_ready' | 'error';
  canPrint: boolean;
  issues: string[];
  inkLevels: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
    photo_black?: number;
  };
  inkStatus?: {
    depleted: string[];
    low: string[];
  };
  paper: {
    count: number;
    capacity: number;
    size: string;
  };
  currentJob?: {
    id: string;
    document: string;
    progress: string;
    status: string;
  } | null;
  queue: {
    length: number;
    jobs: Array<{
      id: string;
      document: string;
      pages: number;
      status?: string;
      progress?: number;
    }>;
  };
  errors: Array<{
    type: string;
    message: string;
  }>;
  uptimeSeconds: number;
  maintenanceNeeded: boolean;
  statistics?: Statistics | null;
  locationId?: string;
}

export interface Statistics {
  totalPagesPrinted: number;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  completedJobs: number;
  totalInkUsed: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  maintenanceCycles: number;
  totalErrors: number;
  averageJobSize: number;
  successRate: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

// Multi-printer types
export interface PrinterInstance {
  id: string;
  name: string;
  typeId: string;
  locationId?: string;
  status: string;
  inkLevels: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
    photo_black?: number;
  };
  paperCount: number;
  paperSize: string;
  paperTrayCapacity: number;
  queue: any[];
  statistics: Statistics;
  type?: {
    brand: string;
    model: string;
    category: string;
    inkSystem: string;
    icon: string;
    features: string[];
  };
}

export interface PrinterLocation {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  printerIds: string[];
  sortOrder: number;
  default_printer_id?: string;
  printerCount?: number;
  printers?: Array<{ id: string; name: string; status: string; isDefault: boolean }>;
  isCurrentLocation?: boolean;
}

export interface UserSettings {
  currentLocationId?: string;
  autoSwitchEnabled: boolean;
  theme: string;
}

export interface UserSettingsResponse {
  success: boolean;
  settings: UserSettings;
  currentLocation?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    defaultPrinterId?: string;
  };
  defaultPrinter?: {
    id: string;
    name: string;
    status: string;
    inkLevels: { cyan: number; magenta: number; yellow: number; black: number };
    paperCount: number;
  };
}

export interface LocationsResponse {
  success: boolean;
  locations: PrinterLocation[];
  currentLocationId?: string;
}

export interface PrinterType {
  id: string;
  brand: string;
  model: string;
  category: string;
  inkSystem: string;
  icon: string;
  description: string;
}

export interface PrintersResponse {
  success: boolean;
  printers: PrinterInstance[];
  locations: PrinterLocation[];
  printersByLocation: Record<string, PrinterInstance[]>;
  unassignedPrinters: PrinterInstance[];
  summary: {
    printerCount: number;
    locationCount: number;
    defaultPrinterId?: string;
  };
  availableTypes: PrinterType[];
}

export const api = {
  /**
   * Get printer status
   * @param printerId Optional printer ID for multi-printer mode
   */
  async getStatus(printerId?: string): Promise<PrinterStatus> {
    try {
      const url = printerId 
        ? `${API_BASE}/status?printerId=${encodeURIComponent(printerId)}`
        : `${API_BASE}/status`;
      
      console.log('[API] getStatus called, printerId:', printerId, 'url:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      
      // Ensure required fields exist
      return {
        id: data.id,
        name: data.name || 'Virtual Printer',
        typeId: data.typeId,
        type: data.type || null,
        status: data.status || 'offline',
        operationalStatus: data.operationalStatus || 'not_ready',
        canPrint: data.canPrint !== undefined ? data.canPrint : false,
        issues: data.issues || [],
        inkLevels: data.inkLevels || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        inkStatus: data.inkStatus || { depleted: [], low: [] },
        paper: data.paper || { count: 0, capacity: 100, size: 'A4' },
        currentJob: data.currentJob || null,
        queue: data.queue || { length: 0, jobs: [] },
        errors: data.errors || [],
        uptimeSeconds: data.uptimeSeconds || 0,
        maintenanceNeeded: data.maintenanceNeeded || false,
        statistics: data.statistics || null,
        locationId: data.locationId,
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      // Return safe default state
      return {
        name: 'Virtual Printer',
        status: 'offline',
        operationalStatus: 'error' as const,
        canPrint: false,
        issues: ['Unable to connect to printer'],
        inkLevels: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        inkStatus: { depleted: [], low: [] },
        paper: { count: 0, capacity: 100, size: 'A4' },
        currentJob: null,
        queue: { length: 0, jobs: [] },
        errors: [{ type: 'connection', message: 'Unable to connect to printer' }],
        uptimeSeconds: 0,
        maintenanceNeeded: false,
      };
    }
  },

  async getStatistics(): Promise<Statistics> {
    try {
      const response = await fetch(`${API_BASE}/info?type=statistics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return {
        totalPagesPrinted: data.totalPagesPrinted || 0,
        totalJobs: data.totalJobs || 0,
        successfulJobs: data.successfulJobs || 0,
        failedJobs: data.failedJobs || 0,
        completedJobs: data.completedJobs || 0,
        totalInkUsed: data.totalInkUsed || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        maintenanceCycles: data.maintenanceCycles || 0,
        totalErrors: data.totalErrors || 0,
        averageJobSize: data.averageJobSize || 0,
        successRate: data.successRate || 0,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalPagesPrinted: 0,
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        completedJobs: 0,
        totalInkUsed: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
        maintenanceCycles: 0,
        totalErrors: 0,
        averageJobSize: 0,
        successRate: 0,
      };
    }
  },

  async getLogs(limit: number = 50): Promise<{ logs: LogEntry[] }> {
    try {
      const response = await fetch(`${API_BASE}/info?type=logs&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { logs: data.logs || [] };
    } catch (error) {
      console.error('Failed to get logs:', error);
      return { logs: [] };
    }
  },

  async printDocument(data: {
    documentName: string;
    pages: number;
    color: boolean;
    quality: string;
    paperSize: string;
  }) {
    try {
      const response = await fetch(`${API_BASE}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        return {
          success: false,
          error: result.error || result.message || `HTTP ${response.status}`,
          jobId: null
        };
      }

      return {
        success: true,
        jobId: result.jobId,
        message: result.message,
        estimatedTime: result.estimatedTime
      };
    } catch (error) {
      console.error('Print document error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        jobId: null
      };
    }
  },

  async cancelJob(jobId: string) {
    const response = await fetch(`${API_BASE}/cancel/${jobId}`, {
      method: 'POST',
    });
    return response.json();
  },

  async pausePrinter() {
    const response = await fetch(`${API_BASE}/pause`, { method: 'POST' });
    return response.json();
  },

  async resumePrinter() {
    const response = await fetch(`${API_BASE}/resume`, { method: 'POST' });
    return response.json();
  },

  async refillInk(color: string) {
    const response = await fetch(`${API_BASE}/refill/${color}`, {
      method: 'POST',
    });
    return response.json();
  },

  async setInkLevel(color: string, level: number) {
    const response = await fetch(`${API_BASE}/set-ink/${color}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    return response.json();
  },

  async loadPaper(count: number, paperSize?: string) {
    const response = await fetch(`${API_BASE}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_paper', count, paperSize }),
    });
    return response.json();
  },

  async setPaperCount(count: number, paperSize?: string) {
    const response = await fetch(`${API_BASE}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_paper_count', count, paperSize }),
    });
    return response.json();
  },

  async cleanHeads() {
    const response = await fetch(`${API_BASE}/clean`, { method: 'POST' });
    return response.json();
  },

  async alignHeads() {
    const response = await fetch(`${API_BASE}/align`, { method: 'POST' });
    return response.json();
  },

  async nozzleCheck() {
    const response = await fetch(`${API_BASE}/nozzle-check`, { method: 'POST' });
    return response.json();
  },

  async clearJam() {
    const response = await fetch(`${API_BASE}/clear-jam`, { method: 'POST' });
    return response.json();
  },

  async powerCycle() {
    const response = await fetch(`${API_BASE}/power-cycle`, { method: 'POST' });
    return response.json();
  },

  async resetPrinter() {
    const response = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    return response.json();
  },

  // Multi-printer API methods
  async getPrinters(): Promise<PrintersResponse> {
    try {
      const response = await fetch(`${API_BASE}/printers`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get printers:', error);
      return {
        success: false,
        printers: [],
        locations: [],
        printersByLocation: {},
        unassignedPrinters: [],
        summary: { printerCount: 0, locationCount: 0 },
        availableTypes: [],
      };
    }
  },

  async addPrinter(name: string, typeId: string, locationId?: string): Promise<{ success: boolean; printer?: PrinterInstance; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/printers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, typeId, locationId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to add printer:', error);
      return { success: false, error: 'Network error' };
    }
  },

  async renamePrinter(printerId: string, newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/printers/${printerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to rename printer:', error);
      return { success: false, error: 'Network error' };
    }
  },

  async deletePrinter(printerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/printers/${printerId}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to delete printer:', error);
      return { success: false, error: 'Network error' };
    }
  },

  async movePrinter(printerId: string, locationId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/printers/${printerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to move printer:', error);
      return { success: false, error: 'Network error' };
    }
  },

  // Location API methods
  async getLocations(): Promise<LocationsResponse> {
    try {
      const response = await fetch(`${API_BASE}/locations`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get locations:', error);
      return { success: false, locations: [] };
    }
  },

  async setLocationDefaultPrinter(locationId: string, printerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/locations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, defaultPrinterId: printerId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to set default printer:', error);
      return { success: false, error: 'Network error' };
    }
  },

  // User Settings API methods
  async getUserSettings(): Promise<UserSettingsResponse> {
    try {
      const response = await fetch(`${API_BASE}/user-settings`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get user settings:', error);
      return {
        success: false,
        settings: { autoSwitchEnabled: true, theme: 'dark' },
      };
    }
  },

  async setCurrentLocation(locationId: string): Promise<UserSettingsResponse> {
    try {
      const response = await fetch(`${API_BASE}/user-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentLocationId: locationId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to set location:', error);
      return {
        success: false,
        settings: { autoSwitchEnabled: true, theme: 'dark' },
      };
    }
  },
};

export function useSSE(onUpdate: (status: PrinterStatus) => void) {
  let eventSource: EventSource | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectDelay = 1000; // Start with 1 second
  const maxReconnectDelay = 30000; // Max 30 seconds
  let isIntentionallyClosed = false;

  const connect = () => {
    if (isIntentionallyClosed) return;

    eventSource = new EventSource(`${API_BASE}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const status = JSON.parse(event.data);
        onUpdate(status);
        // Reset reconnect delay on successful message
        reconnectDelay = 1000;
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');

      if (eventSource?.readyState === EventSource.CLOSED) {
        eventSource.close();

        if (!isIntentionallyClosed) {
          // Attempt reconnection with exponential backoff
          console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
          reconnectTimeout = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
            connect();
          }, reconnectDelay);
        }
      }
    };

    eventSource.onopen = () => {
      console.log('SSE connection established');
    };
  };

  // Initial connection
  connect();

  // Cleanup function
  return () => {
    isIntentionallyClosed = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (eventSource) {
      eventSource.close();
    }
  };
}
