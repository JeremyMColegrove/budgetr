// ============================================================================
// BUDGET BACKEND SERVER
// ============================================================================

import cors from 'cors';
import express from 'express';
import { initializeDatabase } from './database/db.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { accountsRouter } from './routes/accounts.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { rulesRouter } from './routes/rules.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ----------------------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------------------

// CORS - Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// JSON body parser
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes (public)
app.use('/api/auth', authRouter);

// API routes (protected)
app.use('/api/profiles', profilesRouter);
app.use('/api', accountsRouter);
app.use('/api', rulesRouter);

// ----------------------------------------------------------------------------
// Error Handling
// ----------------------------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// ----------------------------------------------------------------------------
// Server Startup
// ----------------------------------------------------------------------------

function startServer(): void {
  try {
    // Initialize database
    initializeDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║   Budget Blueprint Backend Server     ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api`);
      console.log(`✓ Health check at http://localhost:${PORT}/health`);
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
