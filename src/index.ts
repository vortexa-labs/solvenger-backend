import dotenv from 'dotenv';
// Load environment variables FIRST, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import scanRoutes from './routes/scanRoutes';
import walletRoutes from './routes/walletRoutes';
import accountRoutes from './routes/accountRoutes';
import lockVestingRoutes from './routes/lockVestingRoutes';
console.log('🔧 Environment variables loaded:');
console.log(`  SOLANA_RPC_URL: ${process.env.SOLANA_RPC_URL || 'NOT SET'}`);
console.log(`  HELIUS_API_KEY: ${process.env.HELIUS_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`  PORT: ${process.env.PORT || '3000'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://solvenge83.netlify.app',
        'https://solvenger.com',
        'https://preview--solsweep-retro-sweep.lovable.app',
        'https://*.lovable.app'
      ] 
    : [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://192.168.1.100:3000',
        'http://192.168.1.101:3000',
        'http://192.168.1.102:3000',
        'https://preview--solsweep-retro-sweep.lovable.app',
        'https://*.lovable.app',
        'https://solvenge83.netlify.app',
        'https://solvenger.com'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', scanRoutes);
app.use('/wallet', walletRoutes);
app.use('/accounts', accountRoutes);
app.use('/lock-vesting', lockVestingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'SolSweep Backend',
      version: '1.0.0',
      endpoints: {
        // Legacy API endpoints
        scan: 'POST /api/scan',
        closeTransactions: 'POST /api/close-transactions',
        health: 'GET /api/health',
        
        // Frontend-specific endpoints
        walletConnect: 'POST /wallet/connect',
        walletBalance: 'GET /wallet/balance/{walletAddress}',
        accountScan: 'GET /accounts/scan/{walletAddress}',
        accountClose: 'POST /accounts/close',
        accountBurnTokens: 'POST /accounts/burn-tokens',
        accountBurnNFTs: 'POST /accounts/burn-nfts',
        
        // Advanced Multi-Wallet Bulk Operations
        bulkScan: 'POST /accounts/bulk-scan',
        bulkOperations: 'POST /accounts/bulk-operations',
        
        // Token Lock & Vesting endpoints
        createLock: 'POST /lock-vesting/create-lock',
        createVesting: 'POST /lock-vesting/create-vesting',
        claimTokens: 'POST /lock-vesting/claim',
        revokeLockVesting: 'POST /lock-vesting/revoke',
        listLocksVestings: 'GET /lock-vesting/list/{walletAddress}',
        getLockDetails: 'GET /lock-vesting/lock/{lockId}',
        getVestingDetails: 'GET /lock-vesting/vesting/{vestingId}',
      },
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SolSweep Backend running on port ${PORT}`);
  console.log(`📡 Solana RPC: ${process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app; 