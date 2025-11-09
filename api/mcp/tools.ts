/**
 * Vercel Serverless Function: List MCP Tools
 * GET /api/mcp/tools
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    tools: [
      { 
        name: 'print_document', 
        description: 'Submit a print job',
        parameters: {
          documentName: 'string (required)',
          pages: 'number (required)',
          color: 'boolean (optional)',
          quality: 'draft|normal|high|photo (optional)',
          paperSize: 'A4|Letter|Legal|A3|4x6 (optional)'
        }
      },
      { 
        name: 'cancel_job', 
        description: 'Cancel a print job',
        parameters: {
          jobId: 'string (required)'
        }
      },
      { 
        name: 'get_status', 
        description: 'Get complete printer status',
        parameters: {}
      },
      { 
        name: 'get_queue', 
        description: 'Get print queue status',
        parameters: {}
      },
      { 
        name: 'get_statistics', 
        description: 'Get usage statistics',
        parameters: {}
      },
      { 
        name: 'pause_printer', 
        description: 'Pause the printer',
        parameters: {}
      },
      { 
        name: 'resume_printer', 
        description: 'Resume the printer',
        parameters: {}
      },
      { 
        name: 'refill_ink_cartridge', 
        description: 'Refill ink cartridge',
        parameters: {
          color: 'cyan|magenta|yellow|black (required)'
        }
      },
      { 
        name: 'load_paper', 
        description: 'Load paper into tray',
        parameters: {
          count: 'number (required)',
          paperSize: 'A4|Letter|Legal|A3|4x6 (optional)'
        }
      },
      { 
        name: 'clean_print_heads', 
        description: 'Clean print heads',
        parameters: {}
      },
      { 
        name: 'align_print_heads', 
        description: 'Align print heads',
        parameters: {}
      },
      { 
        name: 'run_nozzle_check', 
        description: 'Run nozzle check',
        parameters: {}
      },
      { 
        name: 'clear_paper_jam', 
        description: 'Clear paper jam error',
        parameters: {}
      },
      { 
        name: 'power_cycle', 
        description: 'Power cycle printer',
        parameters: {}
      },
      { 
        name: 'reset_printer', 
        description: 'Reset printer to factory defaults',
        parameters: {}
      }
    ]
  });
}
