/**
 * Shared library loader for Vercel serverless functions
 * This module handles the import of compiled TypeScript modules
 * in a way that works both locally and in Vercel's environment
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Helper to resolve module paths
function resolveModulePath(moduleName: string): string {
  // In Vercel, the build directory should be available
  const buildPath = join(process.cwd(), 'build', moduleName);
  return buildPath;
}

// Export pre-configured imports
export async function loadPrinter() {
  const modulePath = resolveModulePath('printer.js');
  const module = await import(modulePath);
  return module.VirtualPrinter;
}

export async function loadStateManager() {
  const modulePath = resolveModulePath('state-manager.js');
  const module = await import(modulePath);
  return module.StateManager;
}

export async function loadMultiPrinterManager() {
  const modulePath = resolveModulePath('multi-printer-manager.js');
  const module = await import(modulePath);
  return module.getMultiPrinterManager;
}

// Re-export types from source for TypeScript compilation
export type { VirtualPrinter } from '../src/printer';
export type { StateManager } from '../src/state-manager';
export type { PrinterInstance, PrinterType, PrinterLocation } from '../src/multi-printer-manager';
