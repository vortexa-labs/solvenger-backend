import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { LockVestingService } from '../services/lockVestingService';
import { 
  ApiResponse, 
  CreateLockRequest, 
  CreateVestingRequest,
  LockVestingResponse,
  LockVestingListResponse
} from '../types';

const router = Router();

// Initialize LockVesting service
const lockVestingService = new LockVestingService(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Validation schemas
const createLockRequestSchema = z.object({
  tokenMint: z.string().min(32).max(44),
  tokenAccount: z.string().min(32).max(44),
  beneficiary: z.string().min(32).max(44),
  amount: z.string().min(1),
  unlockTime: z.string().datetime(),
  isRevocable: z.boolean().optional().default(false),
});

const createVestingRequestSchema = z.object({
  tokenMint: z.string().min(32).max(44),
  tokenAccount: z.string().min(32).max(44),
  beneficiary: z.string().min(32).max(44),
  totalAmount: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  cliffTime: z.string().datetime().optional(),
  vestingType: z.enum(['linear', 'cliff', 'step']),
  isRevocable: z.boolean().optional().default(false),
});

const claimRequestSchema = z.object({
  lockId: z.string().uuid().optional(),
  vestingId: z.string().uuid().optional(),
  beneficiaryAddress: z.string().min(32).max(44),
});

const revokeRequestSchema = z.object({
  lockId: z.string().uuid().optional(),
  vestingId: z.string().uuid().optional(),
  ownerAddress: z.string().min(32).max(44),
});

/**
 * POST /lock-vesting/create-lock
 * Create a new token lock
 */
router.post('/create-lock', async (req: Request, res: Response<LockVestingResponse>) => {
  try {
    // Validate request body
    const validatedData = createLockRequestSchema.parse(req.body);
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    // Create token lock
    const { transaction, lockId } = await lockVestingService.createTokenLock(
      walletAddress,
      {
        ...validatedData,
        unlockTime: new Date(validatedData.unlockTime),
      }
    );

    // Serialize transaction for frontend
    const serializedTransaction = {
      serialized: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: transaction.signatures.map((sig: any) => sig.toString()),
    };

    res.json({
      success: true,
      data: {
        lockId,
        transaction: serializedTransaction,
        message: 'Token lock created successfully',
      },
    });
  } catch (error) {
    console.error('Create lock error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create token lock',
      });
    }
  }
});

/**
 * POST /lock-vesting/create-vesting
 * Create a new vesting schedule
 */
router.post('/create-vesting', async (req: Request, res: Response<LockVestingResponse>) => {
  try {
    // Validate request body
    const validatedData = createVestingRequestSchema.parse(req.body);
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    // Create vesting schedule
    const { transaction, vestingId } = await lockVestingService.createVestingSchedule(
      walletAddress,
      {
        ...validatedData,
        startTime: new Date(validatedData.startTime),
        endTime: new Date(validatedData.endTime),
        cliffTime: validatedData.cliffTime ? new Date(validatedData.cliffTime) : undefined,
      }
    );

    // Serialize transaction for frontend
    const serializedTransaction = {
      serialized: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: transaction.signatures.map((sig: any) => sig.toString()),
    };

    res.json({
      success: true,
      data: {
        vestingId,
        transaction: serializedTransaction,
        message: 'Vesting schedule created successfully',
      },
    });
  } catch (error) {
    console.error('Create vesting error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create vesting schedule',
      });
    }
  }
});

/**
 * POST /lock-vesting/claim
 * Claim tokens from lock or vesting
 */
router.post('/claim', async (req: Request, res: Response<LockVestingResponse>) => {
  try {
    // Validate request body
    const validatedData = claimRequestSchema.parse(req.body);
    const { lockId, vestingId, beneficiaryAddress } = validatedData;

    if (!lockId && !vestingId) {
      return res.status(400).json({
        success: false,
        error: 'Either lockId or vestingId is required',
      });
    }

    let transaction;
    let amount;

    if (lockId) {
      // Claim from lock
      const result = await lockVestingService.claimFromLock(lockId, beneficiaryAddress);
      transaction = result.transaction;
      amount = result.amount;
    } else if (vestingId) {
      // Claim from vesting
      const result = await lockVestingService.claimFromVesting(vestingId, beneficiaryAddress);
      transaction = result.transaction;
      amount = result.amount;
    }

    // Serialize transaction for frontend
    const serializedTransaction = {
      serialized: transaction!.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: transaction!.signatures.map((sig: any) => sig.toString()),
    };

    res.json({
      success: true,
      data: {
        transaction: serializedTransaction,
        message: `Successfully claimed ${amount} tokens`,
      },
    });
  } catch (error) {
    console.error('Claim error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim tokens',
      });
    }
  }
});

/**
 * POST /lock-vesting/revoke
 * Revoke lock or vesting (only if revocable)
 */
router.post('/revoke', async (req: Request, res: Response<LockVestingResponse>) => {
  try {
    // Validate request body
    const validatedData = revokeRequestSchema.parse(req.body);
    const { lockId, vestingId, ownerAddress } = validatedData;

    if (!lockId && !vestingId) {
      return res.status(400).json({
        success: false,
        error: 'Either lockId or vestingId is required',
      });
    }

    let transaction;
    let amount;

    if (lockId) {
      // Revoke lock
      const result = await lockVestingService.revokeLock(lockId, ownerAddress);
      transaction = result.transaction;
      amount = result.amount;
    } else if (vestingId) {
      // Revoke vesting
      const result = await lockVestingService.revokeVesting(vestingId, ownerAddress);
      transaction = result.transaction;
      amount = result.amount;
    }

    // Serialize transaction for frontend
    const serializedTransaction = {
      serialized: transaction!.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: transaction!.signatures.map((sig: any) => sig.toString()),
    };

    res.json({
      success: true,
      data: {
        transaction: serializedTransaction,
        message: `Successfully revoked and returned ${amount} tokens`,
      },
    });
  } catch (error) {
    console.error('Revoke error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke lock/vesting',
      });
    }
  }
});

/**
 * GET /lock-vesting/list/{walletAddress}
 * Get all locks and vestings for a wallet
 */
router.get('/list/:walletAddress', async (req: Request, res: Response<LockVestingListResponse>) => {
  try {
    const { walletAddress } = req.params;

    // Get locks and vestings for the wallet
    const locks = lockVestingService.getLocksForWallet(walletAddress);
    const vestings = lockVestingService.getVestingsForWallet(walletAddress);

    res.json({
      success: true,
      data: {
        locks,
        vestings,
        totalLocks: locks.length,
        totalVestings: vestings.length,
      },
    });
  } catch (error) {
    console.error('List locks/vestings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locks and vestings',
    });
  }
});

/**
 * GET /lock-vesting/lock/{lockId}
 * Get specific lock details
 */
router.get('/lock/:lockId', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { lockId } = req.params;

    const lock = lockVestingService.getLockById(lockId);
    if (!lock) {
      return res.status(404).json({
        success: false,
        error: 'Lock not found',
      });
    }

    res.json({
      success: true,
      data: lock,
    });
  } catch (error) {
    console.error('Get lock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lock details',
    });
  }
});

/**
 * GET /lock-vesting/vesting/{vestingId}
 * Get specific vesting details
 */
router.get('/vesting/:vestingId', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { vestingId } = req.params;

    const vesting = lockVestingService.getVestingById(vestingId);
    if (!vesting) {
      return res.status(404).json({
        success: false,
        error: 'Vesting schedule not found',
      });
    }

    res.json({
      success: true,
      data: vesting,
    });
  } catch (error) {
    console.error('Get vesting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vesting details',
    });
  }
});

export default router; 