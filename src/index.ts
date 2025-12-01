#!/usr/bin/env node
/**
 * Virtual Printer MCP Server
 * Entry point for stdio-based MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VirtualPrinter } from './printer.js';
import { StateManager } from './state-manager.js';

import { TOOLS, RESOURCES } from './tools.js';

// Initialize printer
const stateManager = new StateManager();
const printer = new VirtualPrinter(stateManager);

// Create MCP server
const server = new Server(
  {
    name: 'virtual-printer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'print_document':
        result = printer.printDocument(args as any);
        break;
      case 'cancel_job':
        result = { message: printer.cancelJob((args as any).jobId) };
        break;
      case 'get_status':
        result = printer.getStatus();
        break;
      case 'get_queue':
        const status = printer.getStatus();
        result = {
          currentJob: status.currentJob,
          queueLength: status.queue.length,
          pendingJobs: status.queue.jobs
        };
        break;
      case 'get_statistics':
        result = printer.getStatistics();
        break;
      case 'pause_printer':
        result = { message: printer.pause() };
        break;
      case 'resume_printer':
        result = { message: printer.resume() };
        break;
      case 'refill_ink_cartridge':
        result = { message: printer.refillInk((args as any).color) };
        break;
      case 'load_paper':
        result = { message: printer.loadPaper((args as any).count, (args as any).paperSize) };
        break;
      case 'clean_print_heads':
        result = { message: printer.cleanPrintHeads() };
        break;
      case 'align_print_heads':
        result = { message: printer.alignPrintHeads() };
        break;
      case 'run_nozzle_check':
        result = { message: printer.runNozzleCheck() };
        break;
      case 'clear_paper_jam':
        result = { message: printer.clearPaperJam() };
        break;
      case 'power_cycle':
        result = { message: printer.powerCycle() };
        break;
      case 'reset_printer':
        result = { message: await printer.reset() };
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: RESOURCES
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    let content;

    switch (uri) {
      case 'printer://state':
        content = printer.getStatus();
        break;
      case 'printer://queue':
        const status = printer.getStatus();
        content = {
          currentJob: status.currentJob,
          queueLength: status.queue.length,
          pendingJobs: status.queue.jobs
        };
        break;
      case 'printer://logs':
        content = printer.getLogs(100);
        break;
      case 'printer://statistics':
        content = printer.getStatistics();
        break;
      case 'printer://capabilities':
        content = printer.getCapabilities();
        break;
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(content, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Virtual Printer MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
