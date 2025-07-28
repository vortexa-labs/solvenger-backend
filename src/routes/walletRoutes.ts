import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SolanaService } from '../services/solanaService';
import { ApiResponse } from '../types';

const router = Router();

// Initialize Solana service
const solanaService = new SolanaService(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Validation schemas
const walletAddressSchema = z.object({
  walletAddress: z.string().min(32).max(44),
});

/**
 * POST /wallet/connect
 * Validate wallet connection
 */
router.post('/connect', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    // Validate wallet address
    const isValid = await solanaService.validateWalletAddress(walletAddress);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      });
    }

    res.json({
      success: true,
      data: {
        walletAddress,
        connected: true,
        message: 'Wallet connected successfully',
      },
    });
  } catch (error) {
    console.error('Wallet connect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet',
    });
  }
});

/**
 * GET /wallet/balance/{walletAddress}
 * Get current SOL balance
 */
router.get('/balance/:walletAddress', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address
    const isValid = await solanaService.validateWalletAddress(walletAddress);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      });
    }

    // Get SOL balance
    const connection = solanaService['connection'];
    const pubkey = new (await import('@solana/web3.js')).PublicKey(walletAddress);
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / 1e9; // Convert lamports to SOL

    res.json({
      success: true,
      data: {
        walletAddress,
        balance: solBalance,
        balanceLamports: balance,
      },
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet balance',
    });
  }
});

export default router; 