/**
 * Shared library loader for Vercel serverless functions
 * This module handles the import of compiled TypeScript modules
 * in a way that works both locally and in Vercel's environment
 */

import { join } from 'path';

// Helper to resolve module path
function resolveModulePath(moduleName: string): string {
  // Try multiple possible locations for the build directory
  let buildPath: string;

  if (process.env.VERCEL) {
    // In Vercel, files are relative to the project root
    // The api/ folder is at the root, so build/ is a sibling
    buildPath = join(__dirname, '..', 'build', moduleName);
  } else {
    // Local development - use process.cwd()
    buildPath = join(process.cwd(), 'build', moduleName);
  }

  console.log(`[_lib] Resolving module: ${moduleName} -> ${buildPath}`);
  return buildPath;
}

// Export pre-configured imports
export async function loadPrinter() {
  const modulePath = resolveModulePath('printer.js');
  console.log('[_lib] Loading printer from:', modulePath);
  // Use require for CommonJS compatibility
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(modulePath);
  return module.VirtualPrinter;
}

export async function loadStateManager() {
  const modulePath = resolveModulePath('state-manager.js');
  console.log('[_lib] Loading state-manager from:', modulePath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(modulePath);
  return module.StateManager;
}

export async function loadMultiPrinterManager() {
  const modulePath = resolveModulePath('multi-printer-manager.js');
  console.log('[_lib] Loading multi-printer-manager from:', modulePath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(modulePath);
  return module.getMultiPrinterManager;
}

// Re-export types from source for TypeScript compilation
export type { VirtualPrinter } from '../src/printer';
export type { StateManager } from '../src/state-manager';
export type { PrinterInstance, PrinterType, PrinterLocation } from '../src/multi-printer-manager';
