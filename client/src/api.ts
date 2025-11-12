// Environment-aware API base URL
// In development: http://localhost:3001/api
// In production (Vercel): /api (relative)
const API_BASE = import.meta.env?.MODE === 'development' 
  ? 'http://localhost:3001/api'
  : '/api';

export interface PrinterStatus {
  name: string;
  status: string;
  inkLevels: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
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
    }>;
  };
  errors: Array<{
    type: string;
    message: string;
  }>;
  uptimeSeconds: number;
  maintenanceNeeded: boolean;
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

export const api = {
  async getStatus(): Promise<PrinterStatus> {
    const response = await fetch(`${API_BASE}/status`);
    return response.json();
  },

  async getStatistics(): Promise<Statistics> {
    const response = await fetch(`${API_BASE}/statistics`);
    return response.json();
  },

  async getLogs(limit: number = 50): Promise<{ logs: LogEntry[] }> {
    const response = await fetch(`${API_BASE}/logs?limit=${limit}`);
    return response.json();
  },

  async printDocument(data: {
    documentName: string;
    pages: number;
    color: boolean;
    quality: string;
    paperSize: string;
  }) {
    const response = await fetch(`${API_BASE}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
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
    const response = await fetch(`${API_BASE}/load-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, paperSize }),
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
