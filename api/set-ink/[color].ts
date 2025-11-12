/**
 * Vercel Serverless Function: Set Ink Level
 * POST /api/set-ink/{color}
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { StateManager } from '../../build/state-manager.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { color } = req.query;
  
  if (!color || typeof color !== 'string') {
    return res.status(400).json({ error: 'Color parameter required' });
  }

  const validColors = ['cyan', 'magenta', 'yellow', 'black'];
  if (!validColors.includes(color)) {
    return res.status(400).json({ 
      error: 'Invalid color',
      validColors 
    });
  }

  try {
    const { level } = req.body;
    
    // Validate level parameter
    if (level === undefined || level === null) {
      return res.status(400).json({ 
        success: false,
        error: 'level parameter is required in request body' 
      });
    }

    const levelNum = Number(level);
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 100) {
      return res.status(400).json({ 
        success: false,
        error: 'level must be a number between 0 and 100' 
      });
    }

    // Directly manipulate state to avoid race conditions
    const stateManager = new StateManager();
    const state = await stateManager.loadState();
    
    // Ensure inkLevels exists
    if (!state.inkLevels) {
      state.inkLevels = {
        cyan: 100,
        magenta: 100,
        yellow: 100,
        black: 100
      };
    }
    
    // Update the specific color
    state.inkLevels[color as keyof typeof state.inkLevels] = levelNum;
    state.lastUpdated = Date.now();
    
    // Save state back to storage
    const saved = await stateManager.saveState(state);
    
    if (!saved) {
      throw new Error('Failed to save state to storage');
    }
    
    const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
    return res.status(200).json({ 
      success: true,
      message: `${colorLabel} ink set to ${levelNum}%`,
      level: levelNum,
      color: color
    });
  } catch (error) {
    console.error(`Error setting ${color} ink level:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
