import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SolanaService } from '../services/solanaService';
import { ApiResponse, ScanResult, ScanRequest, CloseTransactionRequest } from '../types';

const router = Router();

// Validation schemas
const scanRequestSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  includeEmptyOnly: z.boolean().optional().default(true),
  minRecoverableSol: z.number().min(0).optional().default(0),
});

const closeTransactionRequestSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  accountPubkeys: z.array(z.string().min(32).max(44)).min(1),
});

// Initialize Solana service
const solanaService = new SolanaService(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

/**
 * POST /api/scan
 * Scan a wallet for closeable token accounts
 */
router.post('/scan', async (req: Request, res: Response<ApiResponse<ScanResult>>) => {
  try {
    // Validate request body
    const validatedData = scanRequestSchema.parse(req.body);
    
    // Scan wallet
    const scanResult = await solanaService.scanWallet(validatedData.walletAddress, {
      includeEmptyOnly: validatedData.includeEmptyOnly,
      minRecoverableSol: validatedData.minRecoverableSol,
    });

    res.json({
      success: true,
      data: scanResult,
    });
  } catch (error) {
    console.error('Scan error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/close-transactions
 * Create close transactions for specified accounts
 */
router.post('/close-transactions', async (req: Request, res: Response<ApiResponse<{ transactions: any[] }>>) => {
  try {
    // Validate request body
    const validatedData = closeTransactionRequestSchema.parse(req.body);
    
    // Create close transactions
    const transactions = await solanaService.createBatchCloseTransactions(
      validatedData.walletAddress,
      validatedData.accountPubkeys
    );

    // Serialize transactions for frontend
    const serializedTransactions = transactions.map(tx => ({
      serialized: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: tx.signatures.map((sig: any) => sig.toString()),
    }));

    res.json({
      success: true,
      data: {
        transactions: serializedTransactions,
      },
    });
  } catch (error) {
    console.error('Close transaction error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'SolSweep Backend',
    },
  });
});

export default router; 