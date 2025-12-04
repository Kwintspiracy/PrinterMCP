/**
 * Type definitions for Virtual Printer
 * Extended for multi-printer support with HP printer models
 */

export type PrinterStatus = 'ready' | 'printing' | 'warming_up' | 'paused' | 'error' | 'offline' | 'sleep';
export type PrintQuality = 'draft' | 'normal' | 'high' | 'photo';
export type PaperSize = 'A4' | 'Letter' | 'Legal' | 'A3' | '4x6' | 'A5' | 'A1';
export type InkColor = 'cyan' | 'magenta' | 'yellow' | 'black' | 'photo_black' | 'light_cyan' | 'light_magenta';

// Printer Categories
export type PrinterCategory = 'home' | 'business' | 'specialty';
export type InkSystemType = 'cartridge' | 'tank' | 'toner';

export interface InkLevels {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
  photo_black?: number;
  light_cyan?: number;
  light_magenta?: number;
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
  printerId?: string;  // Which printer this job belongs to
}

export interface PrintDocumentParams {
  documentName: string;
  pages: number;
  color?: boolean;
  quality?: PrintQuality;
  paperSize?: PaperSize;
  printerId?: string;  // Target printer
}

export interface PrinterError {
  type: 'paper_jam' | 'out_of_paper' | 'low_ink' | 'hardware_error' | 'general' | 'toner_low' | 'cartridge_error';
  message: string;
  timestamp: number;
  severity: 'warning' | 'error' | 'critical';
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  printerId?: string;
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

// ============================================
// Multi-Printer Types
// ============================================

/**
 * Printer Type Template - defines characteristics of a printer model
 */
export interface PrinterType {
  id: string;
  brand: string;
  model: string;
  category: PrinterCategory;
  inkSystem: InkSystemType;
  inkColors: string[];
  paperCapacity: number;
  speedPPM: number;
  speedPPMColor: number;
  maxResolutionDPI: number;
  features: string[];
  supportedPaperSizes: PaperSize[];
  maxPaperSize: PaperSize;
  duplexSupport: boolean;
  connectivity: string[];
  description: string;
  icon: string;
}

/**
 * Printer Location/Group - organizes printers by location
 */
export interface PrinterLocation {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  printerIds: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Individual Printer Settings
 */
export interface PrinterSettings {
  defaultQuality: PrintQuality;
  defaultPaperSize: PaperSize;
  enableErrorSimulation: boolean;
  errorProbability: number;
  autoWakeup: boolean;
  sleepAfterMinutes: number;
  printSpeedMultiplier: number;  // 0.5 to 2.0
}

/**
 * Full Printer Instance State
 */
export interface PrinterInstance {
  id: string;
  name: string;
  typeId: string;
  locationId?: string;
  status: PrinterStatus;
  inkLevels: InkLevels;
  paperCount: number;
  paperSize: PaperSize;
  paperTrayCapacity: number;
  queue: PrintJob[];
  currentJob: PrintJob | null;
  completedJobs: PrintJob[];
  errors: PrinterError[];
  logs: LogEntry[];
  statistics: Statistics;
  settings: PrinterSettings;
  lastUpdated: number;
  lastStartTime: number;
  createdAt: number;
  version: number;
}

/**
 * Multi-Printer Global State
 */
export interface MultiPrinterState {
  printers: Record<string, PrinterInstance>;
  locations: Record<string, PrinterLocation>;
  defaultPrinterId?: string;
  lastSelectedPrinterId?: string;
  version: number;
  lastUpdated: number;
}

// ============================================
// HP Printer Type Definitions
// ============================================

export const HP_PRINTER_TYPES: PrinterType[] = [
  // HOME PRINTERS
  {
    id: 'hp-deskjet-2755e',
    brand: 'HP',
    model: 'DeskJet 2755e',
    category: 'home',
    inkSystem: 'cartridge',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 60,
    speedPPM: 7,
    speedPPMColor: 5,
    maxResolutionDPI: 1200,
    features: ['Wireless', 'HP+ Smart', 'Mobile Print', 'Scan', 'Copy'],
    supportedPaperSizes: ['A4', 'Letter', 'A5', '4x6'],
    maxPaperSize: 'A4',
    duplexSupport: false,
    connectivity: ['WiFi', 'USB', 'Bluetooth'],
    description: 'Affordable all-in-one for everyday home printing',
    icon: '🖨️'
  },
  {
    id: 'hp-envy-6055e',
    brand: 'HP',
    model: 'ENVY 6055e',
    category: 'home',
    inkSystem: 'cartridge',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 100,
    speedPPM: 10,
    speedPPMColor: 7,
    maxResolutionDPI: 4800,
    features: ['Wireless', 'HP+ Smart', 'Mobile Print', 'Scan', 'Copy', 'Auto 2-Sided', 'Borderless Photos'],
    supportedPaperSizes: ['A4', 'Letter', 'A5', '4x6', 'Legal'],
    maxPaperSize: 'Legal',
    duplexSupport: true,
    connectivity: ['WiFi', 'USB', 'Bluetooth'],
    description: 'Versatile all-in-one with automatic two-sided printing',
    icon: '🖨️'
  },
  {
    id: 'hp-envy-inspire-7955e',
    brand: 'HP',
    model: 'ENVY Inspire 7955e',
    category: 'home',
    inkSystem: 'cartridge',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 125,
    speedPPM: 15,
    speedPPMColor: 10,
    maxResolutionDPI: 4800,
    features: ['Wireless', 'HP+ Smart', 'Mobile Print', 'Scan', 'Copy', 'Auto 2-Sided', 'Photo Printing', 'Touchscreen'],
    supportedPaperSizes: ['A4', 'Letter', 'A5', '4x6', 'Legal'],
    maxPaperSize: 'Legal',
    duplexSupport: true,
    connectivity: ['WiFi', 'USB', 'Ethernet', 'Bluetooth'],
    description: 'Premium home printer for photos and documents',
    icon: '📷'
  },
  {
    id: 'hp-smart-tank-5101',
    brand: 'HP',
    model: 'Smart Tank 5101',
    category: 'home',
    inkSystem: 'tank',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 100,
    speedPPM: 12,
    speedPPMColor: 5,
    maxResolutionDPI: 4800,
    features: ['Wireless', 'Refillable Ink Tank', 'High Yield', 'Scan', 'Copy', 'Mobile Print'],
    supportedPaperSizes: ['A4', 'Letter', 'A5', '4x6'],
    maxPaperSize: 'A4',
    duplexSupport: false,
    connectivity: ['WiFi', 'USB', 'Bluetooth'],
    description: 'High-volume printing with refillable ink tanks',
    icon: '🛢️'
  },
  // BUSINESS PRINTERS
  {
    id: 'hp-officejet-pro-9015e',
    brand: 'HP',
    model: 'OfficeJet Pro 9015e',
    category: 'business',
    inkSystem: 'cartridge',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 250,
    speedPPM: 22,
    speedPPMColor: 18,
    maxResolutionDPI: 4800,
    features: ['Wireless', 'HP+ Smart', 'ADF', 'Auto 2-Sided', 'Fax', 'Scan', 'Copy', 'Security Features'],
    supportedPaperSizes: ['A4', 'Letter', 'Legal', 'A5', '4x6'],
    maxPaperSize: 'Legal',
    duplexSupport: true,
    connectivity: ['WiFi', 'USB', 'Ethernet'],
    description: 'Fast all-in-one for small business productivity',
    icon: '🏢'
  },
  {
    id: 'hp-officejet-pro-9125e',
    brand: 'HP',
    model: 'OfficeJet Pro 9125e',
    category: 'business',
    inkSystem: 'cartridge',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 500,
    speedPPM: 25,
    speedPPMColor: 20,
    maxResolutionDPI: 4800,
    features: ['Wireless', 'HP+ Smart', 'ADF', 'Auto 2-Sided', 'Fax', 'Scan', 'Copy', 'Dual Paper Trays', 'Security Features'],
    supportedPaperSizes: ['A4', 'Letter', 'Legal', 'A3', 'A5', '4x6'],
    maxPaperSize: 'A3',
    duplexSupport: true,
    connectivity: ['WiFi', 'USB', 'Ethernet'],
    description: 'High-capacity workgroup printer',
    icon: '🏢'
  },
  {
    id: 'hp-laserjet-pro-m404dn',
    brand: 'HP',
    model: 'LaserJet Pro M404dn',
    category: 'business',
    inkSystem: 'toner',
    inkColors: ['black'],
    paperCapacity: 350,
    speedPPM: 40,
    speedPPMColor: 0,
    maxResolutionDPI: 1200,
    features: ['Auto 2-Sided', 'Security Features', 'Fast First Page', 'JetIntelligence'],
    supportedPaperSizes: ['A4', 'Letter', 'Legal', 'A5'],
    maxPaperSize: 'Legal',
    duplexSupport: true,
    connectivity: ['USB', 'Ethernet'],
    description: 'Fast mono laser for high-volume document printing',
    icon: '⚡'
  },
  {
    id: 'hp-color-laserjet-pro-m454dw',
    brand: 'HP',
    model: 'Color LaserJet Pro M454dw',
    category: 'business',
    inkSystem: 'toner',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 300,
    speedPPM: 28,
    speedPPMColor: 28,
    maxResolutionDPI: 600,
    features: ['Wireless', 'Auto 2-Sided', 'Security Features', 'Fast First Page', 'JetIntelligence'],
    supportedPaperSizes: ['A4', 'Letter', 'Legal', 'A5'],
    maxPaperSize: 'Legal',
    duplexSupport: true,
    connectivity: ['WiFi', 'USB', 'Ethernet'],
    description: 'Professional color laser with wireless connectivity',
    icon: '🌈'
  },
  // SPECIALTY PRINTERS
  {
    id: 'hp-envy-photo-7855',
    brand: 'HP',
    model: 'ENVY Photo 7855',
    category: 'specialty',
    inkSystem: 'cartridge',
    inkColors: ['black', 'photo_black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 125,
    speedPPM: 15,
    speedPPMColor: 10,
    maxResolutionDPI: 4800,
    features: ['Wireless', 'Photo Printing', 'Borderless', 'Scan', 'Copy', 'Touchscreen', 'SD Card Slot'],
    supportedPaperSizes: ['A4', 'Letter', 'A5', '4x6'],
    maxPaperSize: 'A4',
    duplexSupport: true,
    connectivity: ['WiFi', 'USB', 'Bluetooth'],
    description: 'Dedicated photo printer with 5-ink system',
    icon: '📸'
  },
  {
    id: 'hp-designjet-t250',
    brand: 'HP',
    model: 'DesignJet T250',
    category: 'specialty',
    inkSystem: 'cartridge',
    inkColors: ['black', 'cyan', 'magenta', 'yellow'],
    paperCapacity: 50,
    speedPPM: 1,
    speedPPMColor: 1,
    maxResolutionDPI: 2400,
    features: ['Large Format', 'CAD/GIS', 'Roll Feed', 'Mobile Print', 'Poster Printing'],
    supportedPaperSizes: ['A4', 'Letter', 'A3', 'A1'],
    maxPaperSize: 'A3',
    duplexSupport: false,
    connectivity: ['WiFi', 'USB', 'Ethernet'],
    description: 'Large format printer for posters and technical drawings',
    icon: '📐'
  }
];

// Default locations
export const DEFAULT_LOCATIONS: Omit<PrinterLocation, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Office',
    description: 'Office printers for business use',
    icon: '🏢',
    color: '#1f6feb',
    printerIds: [],
    sortOrder: 0
  },
  {
    name: 'Home',
    description: 'Home printers for personal use',
    icon: '🏠',
    color: '#238636',
    printerIds: [],
    sortOrder: 1
  }
];

// Helper function to get default ink levels based on ink system
export function getDefaultInkLevels(inkColors: string[]): InkLevels {
  const levels: InkLevels = {
    cyan: 0,
    magenta: 0,
    yellow: 0,
    black: 0
  };
  
  for (const color of inkColors) {
    if (color in levels || color === 'photo_black' || color === 'light_cyan' || color === 'light_magenta') {
      (levels as any)[color] = 100;
    }
  }
  
  return levels;
}

// Helper function to get printer type by ID
export function getPrinterTypeById(typeId: string): PrinterType | undefined {
  return HP_PRINTER_TYPES.find(t => t.id === typeId);
}

// Helper to get printers by category
export function getPrinterTypesByCategory(category: PrinterCategory): PrinterType[] {
  return HP_PRINTER_TYPES.filter(t => t.category === category);
}
