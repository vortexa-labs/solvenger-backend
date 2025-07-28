import express, { Request, Response } from 'express';
import { z } from 'zod';
import { SolanaService } from '../services/solanaService';
import { ApiResponse } from '../types';
import { Transaction } from '@solana/web3.js';

const router = express.Router();

/**
 * Format token amount with proper decimals
 */
function formatTokenAmount(amount: string, decimals: number): string {
  try {
    const bigIntAmount = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const wholePart = bigIntAmount / divisor;
    const fractionalPart = bigIntAmount % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }
    
    // Format fractional part with leading zeros
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    // Remove trailing zeros
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return `${wholePart}.${trimmedFractional}`;
  } catch (error) {
    console.warn('Error formatting token amount:', error);
    return amount;
  }
}

// Initialize Solana service
console.log(`🔧 Environment SOLANA_RPC_URL: ${process.env.SOLANA_RPC_URL || 'NOT SET'}`);
const solanaService = new SolanaService(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Validation schema for sweep requests
const sweepRequestSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  accountPubkeys: z.array(z.string()).min(1),
});

/**
 * GET /accounts/test-metadata
 * Test metadata fetching for multiple tokens
 */
router.get('/test-metadata', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    console.log('🧪 Testing metadata fetch for multiple tokens...');
    
    const tokens = [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USDC' },
      { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT' },
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'Bonk' },
      { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', name: 'dogwifhat' }
    ];
    
    const metadataResults = [];
    for (const token of tokens) {
      const metadata = await solanaService.getTokenMetadata(token.mint);
      metadataResults.push({
        token: token.name,
        mint: token.mint,
        metadata: metadata
      });
    }
    
    res.json({
      success: true,
      data: {
        metadataResults,
        heliusApiKey: solanaService['heliusApiKey'] ? 'Present' : 'Missing'
      },
    });
  } catch (error) {
    console.error('Metadata test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test metadata',
    });
  }
});

/**
 * GET /accounts/scan/{walletAddress}
 * Scan wallet for closeable and burnable accounts
 */
router.get('/scan/:walletAddress', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address
    if (!(await solanaService.validateWalletAddress(walletAddress))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      });
    }

    // Test metadata fetching for USDC
    console.log('🧪 Testing metadata fetch for USDC...');
    const usdcMetadata = await solanaService.getTokenMetadata('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    console.log('USDC Metadata:', usdcMetadata);

    // Scan wallet for closeable and burnable accounts
    const scanResult = await solanaService.scanWallet(walletAddress, {
      includeEmptyOnly: true,
      minRecoverableSol: 0,
      includeBurns: true,
    });

    // Categorize accounts based on the MD file system
    const rentAccounts = scanResult.closeableAccounts.filter(acc => 
      acc.action === 'close' && acc.recoverableSol > 0 // Only closeable accounts with reclaimable rent
    );
    
    // Use the optimized categorization from the service
    const burnableTokenAccounts = scanResult.closeableAccounts.filter(acc => 
      acc.action === 'burn' && 
      acc.account.amount !== '0' && 
      !['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        'So11111111111111111111111111111111111111112'].includes(acc.account.mint.toString()) // SOL (wrapped)
    );
    
    const burnableNFTAccounts = scanResult.closeableAccounts.filter(acc => 
      acc.action === 'burn' && 
      acc.account.amount !== '0' && 
      acc.account.decimals === 0 // Likely NFT
    );

    // Debug logging to see account categorization
    console.log(`\n=== ACCOUNT SCAN DEBUG for ${walletAddress} ===`);
    console.log(`Total accounts found: ${scanResult.totalAccounts}`);
    console.log(`Total closeable accounts: ${scanResult.closeableAccounts.length}`);
    console.log(`Rent accounts (reclaimable SOL): ${rentAccounts.length}`);
    console.log(`Burnable token accounts: ${burnableTokenAccounts.length}`);
    console.log(`Burnable NFT accounts: ${burnableNFTAccounts.length}`);
    
    // Get all accounts from the service to show the missing ones
    const allAccounts = await solanaService.getTokenAccounts(walletAddress);
    console.log(`\n=== ALL ACCOUNTS BREAKDOWN (${allAccounts.length} total) ===`);
    
    for (const [index, account] of allAccounts.entries()) {
      const isNonBurnable = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        'So11111111111111111111111111111111111111112'].includes(account.mint.toString()); // SOL (wrapped)
      
      // Check if this account is in the closeable accounts
      const closeableAccount = scanResult.closeableAccounts.find(acc => 
        acc.account.pubkey.toString() === account.pubkey.toString()
      );
      
      // Get the updated account with metadata if available
      const updatedAccount = closeableAccount?.account || account;
      
      console.log(`\nAccount ${index + 1}:`);
      console.log(`  Pubkey: ${account.pubkey.toString()}`);
      console.log(`  Mint: ${account.mint.toString()}`);
      console.log(`  Amount: ${account.amount}`);
      console.log(`  Decimals: ${updatedAccount.decimals}`);
      console.log(`  Owner: ${account.owner.toString()}`);
      console.log(`  Is Initialized: ${account.isInitialized}`);
      console.log(`  Is Frozen: ${account.isFrozen}`);
      console.log(`  Is Non-Burnable: ${isNonBurnable}`);
      console.log(`  Has Balance: ${account.amount !== '0'}`);
      console.log(`  In Closeable List: ${closeableAccount ? 'YES' : 'NO'}`);
      if (closeableAccount) {
        console.log(`  Action: ${closeableAccount.action}`);
        console.log(`  Recoverable SOL: ${closeableAccount.recoverableSol}`);
      }
    }
    console.log('=== END DEBUG ===\n');

    // Format responses (optimized to reduce RPC calls)
    const formatAccounts = (accounts: any[], action: string) => {
      return accounts.map((account) => {
        const isNonBurnable = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
          'So11111111111111111111111111111111111111112'].includes(account.account.mint.toString()); // SOL (wrapped)
        
        const isNFT = account.account.decimals === 0 && account.account.amount === '1';
        const isRegularToken = account.account.decimals > 0 && !isNonBurnable;

        return {
          pubkey: account.account.pubkey.toString(),
          mint: account.account.mint.toString(),
          owner: account.account.owner.toString(),
          amount: account.account.amount,
          decimals: account.account.decimals,
          recoverableSol: account.recoverableSol,
          isInitialized: account.account.isInitialized,
          isFrozen: account.account.isFrozen,
          action: action,
          isNFT: isNFT,
          isRegularToken: isRegularToken,
          tokenName: isNFT ? 'cNFT' : (isRegularToken ? 'Token' : 'Other'),
          // Add additional categorization info
          canClose: account.action === 'close',
          canBurn: account.action === 'burn',
          hasBalance: account.account.amount !== '0',
          // Add token metadata
          metadata: account.metadata || account.account.metadata,
          // Add formatted token amount with proper decimals
          formattedAmount: formatTokenAmount(account.account.amount, account.account.decimals),
        };
      });
    };

    const formattedRent = formatAccounts(rentAccounts, 'close');
    const formattedBurnableTokens = formatAccounts(burnableTokenAccounts, 'burn');
    const formattedBurnableNFTs = formatAccounts(burnableNFTAccounts, 'burn');

    res.json({
      success: true,
      data: {
        walletAddress,
        totalAccounts: scanResult.totalAccounts,
        rentAccounts: formattedRent, // Changed from closeableAccounts
        burnableTokenAccounts: formattedBurnableTokens,
        burnableNFTAccounts: formattedBurnableNFTs,
        totalRecoverableSol: scanResult.totalRecoverableSol,
        scanTimestamp: scanResult.scanTimestamp,
        feeInfo: solanaService.getFeeInfo(), // Add fee information
      },
    });
  } catch (error) {
    console.error('Account scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan accounts',
    });
  }
});

/**
 * POST /accounts/close
 * Close selected empty accounts
 */
router.post('/close', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    // Validate request body
    const validatedData = sweepRequestSchema.parse(req.body);
    
    // Create close transactions
    const transactions = await solanaService.createBatchCloseTransactions(
      validatedData.walletAddress,
      validatedData.accountPubkeys,
      'close'
    );

    // Serialize transactions for frontend
    const serializedTransactions = transactions.map(tx => ({
      serialized: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: tx.signatures.map((sig: any) => sig.toString()),
    }));

    // Calculate total recoverable SOL
    let totalRecoverableSol = 0;
    for (const accountPubkey of validatedData.accountPubkeys) {
      try {
        const accountInfo = await solanaService['connection'].getAccountInfo(
          new (await import('@solana/web3.js')).PublicKey(accountPubkey)
        );
        if (accountInfo) {
          const rent = await solanaService['connection'].getMinimumBalanceForRentExemption(accountInfo.data.length);
          totalRecoverableSol += rent / 1e9;
        }
      } catch (error) {
        console.warn(`Failed to calculate rent for ${accountPubkey}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        walletAddress: validatedData.walletAddress,
        closedAccounts: validatedData.accountPubkeys,
        transactions: serializedTransactions,
        totalRecoverableSol,
        message: `Prepared ${transactions.length} close transactions`,
        action: 'close',
        feeInfo: solanaService.getFeeInfo(), // Add fee information
      },
    });
  } catch (error) {
    console.error('Account close error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create close transactions',
      });
    }
  }
});

/**
 * POST /accounts/burn-tokens
 * Burn selected token accounts
 */
router.post('/burn-tokens', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    // Validate request body
    const validatedData = sweepRequestSchema.parse(req.body);
    
    // Create burn transactions
    const transactions = await solanaService.createBatchCloseTransactions(
      validatedData.walletAddress,
      validatedData.accountPubkeys,
      'burn'
    );

    // Serialize transactions for frontend
    const serializedTransactions = transactions.map(tx => ({
      serialized: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: tx.signatures.map((sig: any) => sig.toString()),
    }));

    // Calculate total recoverable SOL
    let totalRecoverableSol = 0;
    for (const accountPubkey of validatedData.accountPubkeys) {
      try {
        const accountInfo = await solanaService['connection'].getAccountInfo(
          new (await import('@solana/web3.js')).PublicKey(accountPubkey)
        );
        if (accountInfo) {
          const rent = await solanaService['connection'].getMinimumBalanceForRentExemption(accountInfo.data.length);
          totalRecoverableSol += rent / 1e9;
        }
      } catch (error) {
        console.warn(`Failed to calculate rent for ${accountPubkey}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        walletAddress: validatedData.walletAddress,
        burnedAccounts: validatedData.accountPubkeys,
        transactions: serializedTransactions,
        totalRecoverableSol,
        message: `Prepared ${transactions.length} burn transactions`,
        action: 'burn',
        feeInfo: solanaService.getFeeInfo(), // Add fee information
      },
    });
  } catch (error) {
    console.error('Token burn error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create burn transactions',
      });
    }
  }
});

/**
 * POST /accounts/burn-nfts
 * Burn selected NFT accounts
 */
router.post('/burn-nfts', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    // Validate request body
    const validatedData = sweepRequestSchema.parse(req.body);
    
    // Create burn transactions
    const transactions = await solanaService.createBatchCloseTransactions(
      validatedData.walletAddress,
      validatedData.accountPubkeys,
      'burn'
    );

    // Serialize transactions for frontend
    const serializedTransactions = transactions.map(tx => ({
      serialized: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      signatures: tx.signatures.map((sig: any) => sig.toString()),
    }));

    // Calculate total recoverable SOL
    let totalRecoverableSol = 0;
    for (const accountPubkey of validatedData.accountPubkeys) {
      try {
        const accountInfo = await solanaService['connection'].getAccountInfo(
          new (await import('@solana/web3.js')).PublicKey(accountPubkey)
        );
        if (accountInfo) {
          const rent = await solanaService['connection'].getMinimumBalanceForRentExemption(accountInfo.data.length);
          totalRecoverableSol += rent / 1e9;
        }
      } catch (error) {
        console.warn(`Failed to calculate rent for ${accountPubkey}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        walletAddress: validatedData.walletAddress,
        burnedAccounts: validatedData.accountPubkeys,
        transactions: serializedTransactions,
        totalRecoverableSol,
        message: `Prepared ${transactions.length} burn transactions`,
        action: 'burn',
        feeInfo: solanaService.getFeeInfo(), // Add fee information
      },
    });
  } catch (error) {
    console.error('NFT burn error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create burn transactions',
      });
    }
  }
});

/**
 * POST /accounts/record-transactions
 * Record transaction results from frontend (after Phantom signAndSendTransaction)
 */
router.post('/record-transactions', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    // Validate request body
    const recordRequestSchema = z.object({
      walletAddress: z.string().min(32).max(44),
      transactions: z.array(z.object({
        signature: z.string().optional(),
        action: z.enum(['close', 'burn']),
        accountPubkey: z.string(),
        status: z.enum(['success', 'failed']),
        error: z.string().optional(),
        recoverableSol: z.number().optional(),
      })),
    });
    
    const validatedData = recordRequestSchema.parse(req.body);
    
    console.log(`📝 Recording ${validatedData.transactions.length} transaction results for wallet: ${validatedData.walletAddress}`);
    
    const successfulTransactions = validatedData.transactions.filter(tx => tx.status === 'success');
    const failedTransactions = validatedData.transactions.filter(tx => tx.status === 'failed');
    
    // Log transaction results
    for (const tx of validatedData.transactions) {
      if (tx.status === 'success') {
        console.log(`✅ Transaction ${tx.action}: ${tx.signature} for account ${tx.accountPubkey}`);
      } else {
        console.error(`❌ Transaction ${tx.action} failed for account ${tx.accountPubkey}: ${tx.error}`);
      }
    }
    
    // Calculate total recoverable SOL from successful transactions
    const totalRecoverableSol = successfulTransactions.reduce((sum, tx) => sum + (tx.recoverableSol || 0), 0);
    
    console.log(`📊 Transaction recording complete: ${successfulTransactions.length} successful, ${failedTransactions.length} failed`);
    console.log(`💰 Total SOL recovered: ${totalRecoverableSol} SOL`);
    
    res.json({
      success: true,
      data: {
        walletAddress: validatedData.walletAddress,
        totalTransactions: validatedData.transactions.length,
        successfulTransactions: successfulTransactions.length,
        failedTransactions: failedTransactions.length,
        totalRecoveredSol: totalRecoverableSol,
        transactions: validatedData.transactions,
        message: `Recorded ${validatedData.transactions.length} transactions (${successfulTransactions.length} successful, ${failedTransactions.length} failed)`,
      },
    });
    
  } catch (error) {
    console.error('Record transactions error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to record transactions',
      });
    }
  }
});

/**
 * POST /accounts/bulk-scan
 * Scan multiple wallets using private keys
 */
router.post('/bulk-scan', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    // Validate request body
    const bulkScanRequestSchema = z.object({
      privateKeys: z.array(z.string().min(64).max(128)).min(1).max(50), // Limit to 50 wallets
    });
    
    const validatedData = bulkScanRequestSchema.parse(req.body);
    
    console.log(`🔍 Bulk scanning ${validatedData.privateKeys.length} wallets...`);
    
    const allWalletResults = [];
    let totalRecoverableSol = 0;
    let totalAccounts = 0;
    
    // Process each wallet
    for (let i = 0; i < validatedData.privateKeys.length; i++) {
      const privateKey = validatedData.privateKeys[i];
      
      try {
        // Import Keypair from private key
        const { Keypair } = await import('@solana/web3.js');
        const keypair = Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(privateKey))
        );
        const walletAddress = keypair.publicKey.toString();
        
        console.log(`🔍 Scanning wallet ${i + 1}/${validatedData.privateKeys.length}: ${walletAddress}`);
        
        // Scan this wallet
        const scanResult = await solanaService.scanWallet(walletAddress, {
          includeEmptyOnly: true,
          minRecoverableSol: 0,
          includeBurns: true,
        });
        
        // Categorize accounts for this wallet
        const rentAccounts = scanResult.closeableAccounts.filter(acc => 
          acc.action === 'close' && acc.recoverableSol > 0
        );
        
        const burnableTokenAccounts = scanResult.closeableAccounts.filter(acc => 
          acc.action === 'burn' && 
          acc.account.amount !== '0' && 
          !['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
            'So11111111111111111111111111111111111111112'].includes(acc.account.mint.toString()) // SOL (wrapped)
        );
        
        const burnableNFTAccounts = scanResult.closeableAccounts.filter(acc => 
          acc.action === 'burn' && 
          acc.account.amount !== '0' && 
          acc.account.decimals === 0 // Likely NFT
        );
        
        // Format accounts for this wallet
        const formatAccounts = (accounts: any[], action: string) => {
          return accounts.map(account => ({
            pubkey: account.account.pubkey.toString(),
            mint: account.account.mint.toString(),
            amount: account.account.amount,
            decimals: account.account.decimals,
            owner: account.account.owner.toString(),
            isInitialized: account.account.isInitialized,
            isFrozen: account.account.isFrozen,
            recoverableSol: account.recoverableSol,
            action: account.action,
            metadata: account.metadata,
            formattedAmount: account.account.amount !== '0' 
              ? formatTokenAmount(account.account.amount, account.account.decimals)
              : '0',
          }));
        };
        
        const walletResult = {
          walletIndex: i,
          walletAddress: walletAddress,
          totalAccounts: scanResult.totalAccounts,
          rentAccounts: formatAccounts(rentAccounts, 'close'),
          burnableTokenAccounts: formatAccounts(burnableTokenAccounts, 'burn'),
          burnableNFTAccounts: formatAccounts(burnableNFTAccounts, 'burn'),
          totalRecoverableSol: scanResult.totalRecoverableSol,
          scanTimestamp: scanResult.scanTimestamp,
        };
        
        allWalletResults.push(walletResult);
        totalRecoverableSol += scanResult.totalRecoverableSol;
        totalAccounts += scanResult.totalAccounts;
        
        console.log(`✅ Wallet ${i + 1} scanned: ${scanResult.totalAccounts} accounts, ${scanResult.totalRecoverableSol} SOL recoverable`);
        
      } catch (error) {
        console.error(`❌ Failed to scan wallet ${i + 1}:`, error);
        allWalletResults.push({
          walletIndex: i,
          walletAddress: 'INVALID_PRIVATE_KEY',
          error: error instanceof Error ? error.message : 'Unknown error',
          totalAccounts: 0,
          rentAccounts: [],
          burnableTokenAccounts: [],
          burnableNFTAccounts: [],
          totalRecoverableSol: 0,
        });
      }
    }
    
    console.log(`📊 Bulk scan complete: ${allWalletResults.length} wallets, ${totalAccounts} total accounts, ${totalRecoverableSol} total SOL recoverable`);
    
    res.json({
      success: true,
      data: {
        wallets: allWalletResults,
        totalWallets: allWalletResults.length,
        totalAccounts: totalAccounts,
        totalRecoverableSol: totalRecoverableSol,
        scanTimestamp: new Date(),
        feeInfo: solanaService.getFeeInfo(),
      },
    });
    
  } catch (error) {
    console.error('Bulk scan error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk scan',
      });
    }
  }
});

/**
 * POST /accounts/bulk-operations
 * Perform bulk close and burn operations across multiple wallets
 */
router.post('/bulk-operations', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    // Validate request body
    const bulkOperationsRequestSchema = z.object({
      operations: z.array(z.object({
        privateKey: z.string().min(64).max(128),
        closeAccounts: z.array(z.string()).optional().default([]),
        burnAccounts: z.array(z.string()).optional().default([]),
      })).min(1).max(50),
    });
    
    const validatedData = bulkOperationsRequestSchema.parse(req.body);
    
    console.log(`🚀 Starting bulk operations for ${validatedData.operations.length} wallets...`);
    
    const allTransactions = [];
    const walletResults = [];
    let totalRecoverableSol = 0;
    
    // Process each wallet's operations
    for (let i = 0; i < validatedData.operations.length; i++) {
      const operation = validatedData.operations[i];
      
      try {
        // Import Keypair from private key
        const { Keypair } = await import('@solana/web3.js');
        const keypair = Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(operation.privateKey))
        );
        const walletAddress = keypair.publicKey.toString();
        
        console.log(`🔧 Processing wallet ${i + 1}/${validatedData.operations.length}: ${walletAddress}`);
        
        const walletTransactions = [];
        let walletRecoverableSol = 0;
        
        // Create close transactions
        if (operation.closeAccounts.length > 0) {
          const closeTransactions = await solanaService.createBatchCloseTransactions(
            walletAddress,
            operation.closeAccounts,
            'close'
          );
          
          const serializedCloseTransactions = closeTransactions.map(tx => ({
            serialized: tx.serialize({ requireAllSignatures: false }).toString('base64'),
            signatures: tx.signatures.map((sig: any) => sig.toString()),
            action: 'close',
            walletAddress: walletAddress,
          }));
          
          walletTransactions.push(...serializedCloseTransactions);
          
          // Calculate recoverable SOL for close accounts
          for (const accountPubkey of operation.closeAccounts) {
            try {
              const accountInfo = await solanaService['connection'].getAccountInfo(
                new (await import('@solana/web3.js')).PublicKey(accountPubkey)
              );
              if (accountInfo) {
                const rent = await solanaService['connection'].getMinimumBalanceForRentExemption(accountInfo.data.length);
                walletRecoverableSol += rent / 1e9;
              }
            } catch (error) {
              console.warn(`Failed to calculate rent for ${accountPubkey}:`, error);
            }
          }
        }
        
        // Create burn transactions
        if (operation.burnAccounts.length > 0) {
          const burnTransactions = await solanaService.createBatchCloseTransactions(
            walletAddress,
            operation.burnAccounts,
            'burn'
          );
          
          const serializedBurnTransactions = burnTransactions.map(tx => ({
            serialized: tx.serialize({ requireAllSignatures: false }).toString('base64'),
            signatures: tx.signatures.map((sig: any) => sig.toString()),
            action: 'burn',
            walletAddress: walletAddress,
          }));
          
          walletTransactions.push(...serializedBurnTransactions);
          
          // Calculate recoverable SOL for burn accounts
          for (const accountPubkey of operation.burnAccounts) {
            try {
              const accountInfo = await solanaService['connection'].getAccountInfo(
                new (await import('@solana/web3.js')).PublicKey(accountPubkey)
              );
              if (accountInfo) {
                const rent = await solanaService['connection'].getMinimumBalanceForRentExemption(accountInfo.data.length);
                walletRecoverableSol += rent / 1e9;
              }
            } catch (error) {
              console.warn(`Failed to calculate rent for ${accountPubkey}:`, error);
            }
          }
        }
        
        allTransactions.push(...walletTransactions);
        totalRecoverableSol += walletRecoverableSol;
        
        walletResults.push({
          walletIndex: i,
          walletAddress: walletAddress,
          closeAccounts: operation.closeAccounts,
          burnAccounts: operation.burnAccounts,
          totalTransactions: walletTransactions.length,
          recoverableSol: walletRecoverableSol,
        });
        
        console.log(`✅ Wallet ${i + 1} processed: ${walletTransactions.length} transactions, ${walletRecoverableSol} SOL recoverable`);
        
      } catch (error) {
        console.error(`❌ Failed to process wallet ${i + 1}:`, error);
        walletResults.push({
          walletIndex: i,
          walletAddress: 'INVALID_PRIVATE_KEY',
          error: error instanceof Error ? error.message : 'Unknown error',
          closeAccounts: [],
          burnAccounts: [],
          totalTransactions: 0,
          recoverableSol: 0,
        });
      }
    }
    
    console.log(`📊 Bulk operations complete: ${allTransactions.length} total transactions, ${totalRecoverableSol} total SOL recoverable`);
    
    res.json({
      success: true,
      data: {
        wallets: walletResults,
        transactions: allTransactions,
        totalWallets: walletResults.length,
        totalTransactions: allTransactions.length,
        totalRecoverableSol: totalRecoverableSol,
        message: `Prepared ${allTransactions.length} transactions across ${walletResults.length} wallets`,
        feeInfo: solanaService.getFeeInfo(),
      },
    });
    
  } catch (error) {
    console.error('Bulk operations error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create bulk operations',
      });
    }
  }
});

/**
 * GET /accounts/debug-transaction/{signature}
 * Debug a failed transaction and get detailed error information
 */
router.get('/debug-transaction/:signature', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { signature } = req.params;

    if (!signature || signature.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction signature',
      });
    }

    console.log(`🔍 Debugging transaction: ${signature}`);
    
    // Debug the transaction
    const debugInfo = await solanaService.debugTransaction(signature);

    res.json({
      success: true,
      data: {
        signature,
        debugInfo,
        message: 'Transaction debug information retrieved',
      },
    });
  } catch (error) {
    console.error('Transaction debug error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug transaction',
    });
  }
});

export default router;