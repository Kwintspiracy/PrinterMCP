/**
 * Type definitions for Virtual Printer
 */

export type PrinterStatus = 'ready' | 'printing' | 'warming_up' | 'paused' | 'error' | 'offline';
export type PrintQuality = 'draft' | 'normal' | 'high' | 'photo';
export type PaperSize = 'A4' | 'Letter' | 'Legal' | 'A3' | '4x6';
export type InkColor = 'cyan' | 'magenta' | 'yellow' | 'black';

export interface InkLevels {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
}

export interface PrintJob {
  id: string;
  documentName: string;
  pages: number;
  color: boolean;
  quality: PrintQuality;
  paperSize: PaperSize;
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  submittedAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedTime: number;
}

export interface PrintDocumentParams {
  documentName: string;
  pages: number;
  color?: boolean;
  quality?: PrintQuality;
  paperSize?: PaperSize;
}

export interface PrinterError {
  type: 'paper_jam' | 'out_of_paper' | 'low_ink' | 'hardware_error' | 'general';
  message: string;
  timestamp: number;
  severity: 'warning' | 'error' | 'critical';
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface Statistics {
  totalPagesPrinted: number;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalInkUsed: InkLevels;
  maintenanceOperations: number;
  lastMaintenanceDate: number | null;
}
