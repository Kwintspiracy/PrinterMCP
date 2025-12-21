/**
 * Shared MCP Tool and Resource Definitions
 */

export const TOOLS = [
  {
    name: 'print_document',
    description: 'Submit a print job to the virtual printer. Uses smart routing to find the best available printer. Returns job ID and estimated completion time.',
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
        },
        locationId: {
          type: 'string',
          description: 'Location ID to find printer (uses default location if not specified)'
        },
        printerId: {
          type: 'string',
          description: 'Specific printer ID (skips smart routing if provided)'
        },
        confirmedFallback: {
          type: 'boolean',
          description: 'Set to true if user confirmed using a fallback printer',
          default: false
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
    description: 'Get the current status of the printer. Use responseStyle to control how status messages are formatted.',
    inputSchema: {
      type: 'object',
      properties: {
        responseStyle: {
          type: 'string',
          enum: ['technical', 'friendly', 'minimal'],
          description: 'Message format: technical (for programmatic use), friendly (for human users), minimal (concise)',
          default: 'technical'
        }
      }
    }
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
];

export const RESOURCES = [
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
];
