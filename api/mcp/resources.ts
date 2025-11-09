/**
 * Vercel Serverless Function: List MCP Resources
 * GET /api/mcp/resources
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
    resources: [
      { 
        name: 'state', 
        description: 'Complete printer state including status, ink levels, paper, queue, and errors',
        uri: 'printer://state'
      },
      { 
        name: 'queue', 
        description: 'Current print queue with job details',
        uri: 'printer://queue'
      },
      { 
        name: 'logs', 
        description: 'Printer event logs (supports ?limit=N parameter)',
        uri: 'printer://logs'
      },
      { 
        name: 'statistics', 
        description: 'Usage statistics including pages printed, ink consumed, and job counts',
        uri: 'printer://statistics'
      },
      { 
        name: 'capabilities', 
        description: 'Printer capabilities and specifications',
        uri: 'printer://capabilities'
      }
    ]
  });
}
