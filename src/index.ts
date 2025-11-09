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
    tools: [
      {
        name: 'print_document',
        description: 'Submit a print job to the virtual printer. Returns job ID and estimated completion time.',
        inputSchema: {
          type: 'object',
          properties: {
            documentName: { type: 'string', description: 'Name of the document to print' },
            pages: { type: 'number', description: 'Number of pages to print' },
            color: { type: 'boolean', description: 'Print in color (true) or black & white (false)', default: false },
            quality: { 
              type: 'string',
              enum: ['draft', 'normal', 'high', 'photo'],
              description: 'Print quality setting',
              default: 'normal'
            },
            paperSize: {
              type: 'string',
              enum: ['A4', 'Letter', 'Legal', 'A3', '4x6'],
              description: 'Paper size',
              default: 'A4'
            }
          },
          required: ['documentName', 'pages']
        }
      },
      {
        name: 'cancel_job',
        description: 'Cancel a print job by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'The job ID to cancel' }
          },
          required: ['jobId']
        }
      },
      {
        name: 'get_status',
        description: 'Get the current status of the printer',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_queue',
        description: 'Get the current print queue',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_statistics',
        description: 'Get usage statistics',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'pause_printer',
        description: 'Pause the printer',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'resume_printer',
        description: 'Resume the printer',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'refill_ink_cartridge',
        description: 'Refill a specific ink cartridge to 100%',
        inputSchema: {
          type: 'object',
          properties: {
            color: {
              type: 'string',
              enum: ['cyan', 'magenta', 'yellow', 'black'],
              description: 'The ink color to refill'
            }
          },
          required: ['color']
        }
      },
      {
        name: 'load_paper',
        description: 'Load paper into the printer tray',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of sheets to load' },
            paperSize: {
              type: 'string',
              enum: ['A4', 'Letter', 'Legal', 'A3', '4x6'],
              description: 'Paper size (optional)'
            }
          },
          required: ['count']
        }
      },
      {
        name: 'clean_print_heads',
        description: 'Run a print head cleaning cycle',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'align_print_heads',
        description: 'Run print head alignment',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'run_nozzle_check',
        description: 'Print a nozzle check pattern',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'clear_paper_jam',
        description: 'Clear a paper jam error',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'power_cycle',
        description: 'Power cycle the printer',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'reset_printer',
        description: 'Reset printer to factory defaults',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
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
    resources: [
      {
        uri: 'printer://state',
        name: 'Printer State',
        description: 'Complete printer state including configuration, status, and history',
        mimeType: 'application/json'
      },
      {
        uri: 'printer://queue',
        name: 'Print Queue',
        description: 'Current print queue with all pending and active jobs',
        mimeType: 'application/json'
      },
      {
        uri: 'printer://logs',
        name: 'Printer Logs',
        description: 'Recent printer event logs (last 100 entries)',
        mimeType: 'application/json'
      },
      {
        uri: 'printer://statistics',
        name: 'Usage Statistics',
        description: 'Printer usage statistics and metrics',
        mimeType: 'application/json'
      },
      {
        uri: 'printer://capabilities',
        name: 'Printer Capabilities',
        description: 'Printer specifications and supported features',
        mimeType: 'application/json'
      }
    ]
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
