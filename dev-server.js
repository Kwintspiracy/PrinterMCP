/**
 * Local development server that mimics Vercel's serverless function behavior
 * This allows testing without Vercel CLI login
 * 
 * Run with: npx tsx dev-server.js
 */

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static('public-react'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Load API handlers dynamically
const apiHandlers = {};

async function loadHandlers() {
  const handlers = ['control', 'status', 'print', 'stream', 'health', 'info', 'queue', 'settings', 'printers', 'mcp'];
  console.log('Loading API handlers...');
  for (const name of handlers) {
    try {
      const module = await import(`./api/${name}.ts`);
      apiHandlers[name] = module;
      console.log(`  ✓ Loaded handler: ${name}`);
    } catch (error) {
      console.error(`  ✗ Failed to load handler ${name}:`, error.message);
    }
  }
  console.log(`Loaded ${Object.keys(apiHandlers).length} handlers`);
}

// Route API requests to appropriate handlers
app.all('/api/:handler', async (req, res) => {
  const handlerName = req.params.handler;
  console.log(`[API] ${req.method} /api/${handlerName} - Loaded handlers: ${Object.keys(apiHandlers).join(', ')}`);
  const handler = apiHandlers[handlerName];

  if (!handler || !handler.default) {
    console.error(`[API] Handler '${handlerName}' not found in apiHandlers`);
    return res.status(404).json({ error: `API handler '${handlerName}' not found`, availableHandlers: Object.keys(apiHandlers) });
  }

  try {
    // Call the Vercel function handler
    await handler.default(req, res);
  } catch (error) {
    console.error(`Error in ${handlerName} handler:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the React app for all other routes (Express 5.x syntax)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-react', 'index.html'));
});

// Create and start server
const server = createServer(app);

// Load handlers and start server
loadHandlers().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Development server running at http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api/*`);
    console.log(`🖥️  Frontend available at http://localhost:${PORT}`);
    console.log(`\n✨ This server mimics Vercel's serverless environment locally`);
    console.log(`   No Vercel login required!\n`);
  });
}).catch(err => {
  console.error('Failed to load handlers:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
