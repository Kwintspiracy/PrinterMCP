/**
 * Local development server that mimics Vercel's serverless function behavior
 * This allows testing without Vercel CLI login
 */

const express = require('express');
const path = require('path');
const { createServer } = require('http');

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

// Load API handlers
const apiHandlers = {
  control: require('./api/control.ts'),
  status: require('./api/status.ts'),
  print: require('./api/print.ts'),
  stream: require('./api/stream.ts'),
  health: require('./api/health.ts'),
  info: require('./api/info.ts'),
  queue: require('./api/queue.ts'),
  settings: require('./api/settings.ts'),
  printers: require('./api/printers.ts'),
  mcp: require('./api/mcp.ts'),
};

// Route API requests to appropriate handlers
app.all('/api/:handler*', async (req, res) => {
  const handlerName = req.params.handler;
  const handler = apiHandlers[handlerName];
  
  if (!handler || !handler.default) {
    return res.status(404).json({ error: `API handler '${handlerName}' not found` });
  }
  
  try {
    // Call the Vercel function handler
    await handler.default(req, res);
  } catch (error) {
    console.error(`Error in ${handlerName} handler:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-react', 'index.html'));
});

// Create and start server
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/*`);
  console.log(`🖥️  Frontend available at http://localhost:${PORT}`);
  console.log(`\n✨ This server mimics Vercel's serverless environment locally`);
  console.log(`   No Vercel login required!\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
