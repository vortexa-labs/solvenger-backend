import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAccount, 
  getAssociatedTokenAddress,
  createCloseAccountInstruction,
  createBurnInstruction,
  AccountLayout,
  MINT_SIZE,
  getMint,
  createBurnCheckedInstruction
} from '@solana/spl-token';
import { TokenAccountInfo, CloseableAccount, ScanResult, TokenMetadata } from '../types';

export class SolanaService {
  private connection: Connection;
  private mintCache: Map<string, any> = new Map();
  private metadataCache: Map<string, TokenMetadata> = new Map();
  private lastRpcCall: number = 0;
  private readonly rpcDelay = 500; // Increased to 500ms between RPC calls
  private readonly heliusApiKey: string;
  private readonly feeWallet = 'DHFvuPUG3nDbdr2uHwVGuEqSjwdL4iC6ESAErYAwhV2K';
  private readonly feeRate = 0.10; // 10% fee

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    // Use the HELIUS_API_KEY environment variable directly
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    console.log(`🔑 Helius API key from env: ${this.heliusApiKey ? 'Yes' : 'No'}`);
  }

  /**
   * Calculate fee and net recovery amount
   */
  private calculateFeeAndNetRecovery(recoveredSol: number): { fee: number; netRecovery: number } {
    const fee = recoveredSol * this.feeRate;
    const netRecovery = recoveredSol - fee;
    
    console.log(`💰 Fee calculation: ${recoveredSol} SOL → Fee: ${fee.toFixed(6)} SOL → Net: ${netRecovery.toFixed(6)} SOL`);
    
    return { fee, netRecovery };
  }

  /**
   * Get fee information for frontend display
   */
  getFeeInfo(): { feeRate: number; feeWallet: string; feePercentage: string } {
    return {
      feeRate: this.feeRate,
      feeWallet: this.feeWallet,
      feePercentage: `${(this.feeRate * 100).toFixed(0)}%`
    };
  }



  /**
   * Fetch token metadata from Helius DAS API
   */
  private async fetchTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
    console.log(`🔍 Fetching metadata for mint: ${mintAddress}`);
    if (!this.heliusApiKey) {
      console.warn('No Helius API key found, skipping metadata fetch');
      return null;
    }

    try {
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getAsset',
          params: {
            id: mintAddress
          }
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to fetch metadata for ${mintAddress}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`🔍 Raw Helius DAS API response for ${mintAddress}:`, JSON.stringify(data, null, 2));
      
      if (data && data.result) {
        const asset = data.result;
        const content = asset.content;
        const tokenInfo = asset.token_info;
        
        // Debug image URL extraction
        console.log(`🔍 Image URL extraction for ${mintAddress}:`);
        console.log(`  content?.links?.image:`, content?.links?.image);
        console.log(`  content?.files?.[0]?.uri:`, content?.files?.[0]?.uri);
        console.log(`  asset?.content?.files?.[0]?.uri:`, asset?.content?.files?.[0]?.uri);
        console.log(`  asset?.content?.links?.image:`, asset?.content?.links?.image);

        const result = {
          name: content?.metadata?.name || 'Unknown Token',
          symbol: content?.metadata?.symbol || 'UNKNOWN',
          image: content?.links?.image || content?.files?.[0]?.uri || asset?.content?.files?.[0]?.uri || asset?.content?.links?.image || undefined,
          description: content?.metadata?.description || undefined,
          decimals: tokenInfo?.decimals || 0,
          logoURI: content?.links?.image || content?.files?.[0]?.uri || asset?.content?.files?.[0]?.uri || asset?.content?.links?.image || undefined,
          tags: [],
          extensions: {},
        };
        
        console.log(`📊 Processed metadata for ${mintAddress}:`, result);
        return result;
      }

      return null;
    } catch (error) {
      console.warn(`Error fetching metadata for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch token metadata for multiple mints using DAS API
   */
  private async batchFetchTokenMetadata(mintAddresses: string[]): Promise<Map<string, TokenMetadata>> {
    const results = new Map<string, TokenMetadata>();
    const uncachedMints: string[] = [];

    // Check cache first
    for (const mint of mintAddresses) {
      if (this.metadataCache.has(mint)) {
        results.set(mint, this.metadataCache.get(mint)!);
      } else {
        uncachedMints.push(mint);
      }
    }

    // Batch fetch uncached metadata using getAssetBatch
    if (uncachedMints.length > 0 && this.heliusApiKey) {
      try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getAssetBatch',
            params: {
              ids: uncachedMints
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data && data.result) {
            for (let i = 0; i < uncachedMints.length; i++) {
              const mint = uncachedMints[i];
              const asset = data.result[i];
              
              if (asset) {
                const content = asset.content;
                const tokenInfo = asset.token_info;
                
                // Debug image URL extraction for batch
                console.log(`🔍 Batch image URL extraction for ${mint}:`);
                console.log(`  content?.links?.image:`, content?.links?.image);
                console.log(`  content?.files?.[0]?.uri:`, content?.files?.[0]?.uri);
                console.log(`  asset?.content?.files?.[0]?.uri:`, asset?.content?.files?.[0]?.uri);
                console.log(`  asset?.content?.links?.image:`, asset?.content?.links?.image);

                const tokenMetadata: TokenMetadata = {
                  name: content?.metadata?.name || 'Unknown Token',
                  symbol: content?.metadata?.symbol || 'UNKNOWN',
                  image: content?.links?.image || content?.files?.[0]?.uri || asset?.content?.files?.[0]?.uri || asset?.content?.links?.image || undefined,
                  description: content?.metadata?.description || undefined,
                  decimals: tokenInfo?.decimals || 0,
                  logoURI: content?.links?.image || content?.files?.[0]?.uri || asset?.content?.files?.[0]?.uri || asset?.content?.links?.image || undefined,
                  tags: [],
                  extensions: {},
                };

                this.metadataCache.set(mint, tokenMetadata);
                results.set(mint, tokenMetadata);
              } else {
                results.set(mint, null as any);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Batch metadata fetch failed:', error);
        // Fall back to individual calls
        for (const mint of uncachedMints) {
          const metadata = await this.fetchTokenMetadata(mint);
          results.set(mint, metadata as any);
        }
      }
    }

    return results;
  }

  /**
   * Get token metadata for a mint address
   */
  async getTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
    // Check cache first
    if (this.metadataCache.has(mintAddress)) {
      return this.metadataCache.get(mintAddress)!;
    }

    // Fetch from Helius API
    const metadata = await this.fetchTokenMetadata(mintAddress);
    if (metadata) {
      this.metadataCache.set(mintAddress, metadata);
    }
    return metadata;
  }

  /**
   * Rate limiting helper with exponential backoff for rate limits
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastRpcCall;
    if (timeSinceLastCall < this.rpcDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rpcDelay - timeSinceLastCall));
    }
    this.lastRpcCall = Date.now();
  }

  /**
   * Execute RPC call with retry logic for rate limits
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.rateLimit();
        return await operation();
      } catch (error: any) {
        if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
          if (attempt === maxRetries) {
            throw error;
          }
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.log(`Rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Batch get mint info for multiple addresses
   */
  private async batchGetMintInfo(mintAddresses: PublicKey[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const uncachedMints: PublicKey[] = [];

    // Check cache first
    for (const mint of mintAddresses) {
      const mintStr = mint.toString();
      if (this.mintCache.has(mintStr)) {
        results.set(mintStr, this.mintCache.get(mintStr));
      } else {
        uncachedMints.push(mint);
      }
    }

    // Batch fetch uncached mints
    if (uncachedMints.length > 0) {
      try {
        const accountInfos = await this.executeWithRetry(() => 
          this.connection.getMultipleAccountsInfo(uncachedMints)
        );
        
                 for (let i = 0; i < uncachedMints.length; i++) {
           const mint = uncachedMints[i];
           const accountInfo = accountInfos[i];
           const mintStr = mint.toString();
           
           if (accountInfo) {
             try {
               const mintData = await getMint(this.connection, mint);
               const mintInfo = {
                 address: mint,
                 decimals: mintData.decimals,
                 supply: mintData.supply.toString(),
                 isInitialized: mintData.isInitialized,
                 freezeAuthority: mintData.freezeAuthority,
                 mintAuthority: mintData.mintAuthority,
               };
               
               this.mintCache.set(mintStr, mintInfo);
               results.set(mintStr, mintInfo);
             } catch (error) {
               console.warn(`Failed to decode mint info for ${mintStr}:`, error);
               results.set(mintStr, null);
             }
           } else {
             results.set(mintStr, null);
           }
         }
      } catch (error) {
        console.warn('Batch mint info fetch failed:', error);
        // Fall back to individual calls
        for (const mint of uncachedMints) {
          const mintStr = mint.toString();
          try {
            const mintInfo = await this.getMintInfo(mint);
            results.set(mintStr, mintInfo);
          } catch (error) {
            console.warn(`Failed to get mint info for ${mintStr}:`, error);
            results.set(mintStr, null);
          }
        }
      }
    }

    return results;
  }

  /**
   * Validates a wallet address
   */
  async validateWalletAddress(address: string): Promise<boolean> {
    try {
      const pubkey = new PublicKey(address);
      return PublicKey.isOnCurve(pubkey);
    } catch {
      return false;
    }
  }

  /**
   * Gets all token accounts for a wallet
   */
  async getTokenAccounts(walletAddress: string): Promise<TokenAccountInfo[]> {
    const pubkey = new PublicKey(walletAddress);
    
    const tokenAccounts = await this.executeWithRetry(() => 
      this.connection.getTokenAccountsByOwner(pubkey, {
        programId: TOKEN_PROGRAM_ID,
      })
    );

    const accounts: TokenAccountInfo[] = [];

    for (const { pubkey: accountPubkey, account } of tokenAccounts.value) {
      try {
        const accountInfo = AccountLayout.decode(account.data);
        
        accounts.push({
          pubkey: accountPubkey,
          mint: new PublicKey(accountInfo.mint),
          owner: new PublicKey(accountInfo.owner),
          amount: accountInfo.amount.toString(),
          decimals: (accountInfo as any).decimals || 0,
          isInitialized: accountInfo.state === 1,
          isFrozen: accountInfo.state === 2,
          isNative: (accountInfo as any).isNativeOption === 1,
          rentExemptReserve: (accountInfo as any).rentExemptReserve?.toString(),
          closeAuthority: (accountInfo as any).closeAuthorityOption === 1 
            ? new PublicKey((accountInfo as any).closeAuthority) 
            : undefined,
        });
      } catch (error) {
        console.warn(`Failed to decode token account ${accountPubkey.toString()}:`, error);
      }
    }

    return accounts;
  }

  /**
   * Gets mint information for a token
   */
  async getMintInfo(mintAddress: PublicKey) {
    const mintStr = mintAddress.toString();
    
    // Check cache first
    if (this.mintCache.has(mintStr)) {
      return this.mintCache.get(mintStr);
    }

    try {
      const mintInfo = await this.executeWithRetry(() => getMint(this.connection, mintAddress));
      const result = {
        address: mintAddress,
        decimals: mintInfo.decimals,
        supply: mintInfo.supply.toString(),
        isInitialized: mintInfo.isInitialized,
        freezeAuthority: mintInfo.freezeAuthority,
        mintAuthority: mintInfo.mintAuthority,
      };
      
      this.mintCache.set(mintStr, result);
      return result;
    } catch (error) {
      console.warn(`Failed to get mint info for ${mintAddress.toString()}:`, error);
      this.mintCache.set(mintStr, null);
      return null;
    }
  }

  /**
   * Calculates rent-exempt balance for an account
   */
  async calculateRentExemptBalance(accountSize: number): Promise<number> {
    const rent = await this.executeWithRetry(() => 
      this.connection.getMinimumBalanceForRentExemption(accountSize)
    );
    return rent / LAMPORTS_PER_SOL;
  }

  /**
   * Checks if a mint is a compressed NFT (cNFT) using Bubblegum program detection
   */
  async isCompressedNFT(mintAddress: PublicKey): Promise<boolean> {
    try {
      const mintInfo = await this.getMintInfo(mintAddress);
      if (!mintInfo) return false;
      
      // cNFTs typically have supply = 1 and specific metadata
      // This is a simplified check - in production you'd want more robust detection
      return mintInfo.supply === '1' && mintInfo.decimals === 0;
    } catch (error) {
      console.warn(`Failed to check if mint is cNFT: ${mintAddress.toString()}`, error);
      return false;
    }
  }

  /**
   * Checks if a mint is a non-burnable token (major stablecoins, etc.)
   */
  async isNonBurnableToken(mintAddress: PublicKey): Promise<boolean> {
    const nonBurnableMints = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'So11111111111111111111111111111111111111112',   // SOL (wrapped)
    ];
    
    return nonBurnableMints.includes(mintAddress.toString());
  }

  /**
   * Checks if a mint is a regular burnable token (not cNFT, not stablecoin)
   */
  async isRegularBurnableToken(mintAddress: PublicKey): Promise<boolean> {
    try {
      const mintInfo = await this.getMintInfo(mintAddress);
      if (!mintInfo) return false;
      
      // Check if it's a non-burnable token (stablecoins, etc.)
      if (await this.isNonBurnableToken(mintAddress)) {
        return false;
      }
      
      // Check if it's a compressed NFT
      if (await this.isCompressedNFT(mintAddress)) {
        return false;
      }
      
      // Regular burnable tokens have supply > 1 and are not stablecoins/cNFTs
      return BigInt(mintInfo.supply) > BigInt(1);
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if an account is closeable (empty and owned by the wallet)
   */
  async isAccountCloseable(account: TokenAccountInfo, walletAddress: string): Promise<boolean> {
    const walletPubkey = new PublicKey(walletAddress);
    
    // Check if it's a compressed NFT - these cannot be closed with standard instructions
    const isCNFT = await this.isCompressedNFT(account.mint);
    if (isCNFT) return false;
    
    return (
      account.owner.equals(walletPubkey) &&
      account.amount === '0' &&
      account.isInitialized &&
      !account.isFrozen
    );
  }

  /**
   * Checks if an account can be burned (has tokens and owned by the wallet)
   */
  async isAccountBurnable(account: TokenAccountInfo, walletAddress: string): Promise<boolean> {
    const walletPubkey = new PublicKey(walletAddress);
    
    // Check if it's a non-burnable token (stablecoins, etc.)
    const isNonBurnable = await this.isNonBurnableToken(account.mint);
    if (isNonBurnable) return false;
    
    return (
      account.owner.equals(walletPubkey) &&
      account.amount !== '0' &&
      account.isInitialized &&
      !account.isFrozen
    );
  }

  /**
   * Creates a close account transaction
   */
  async createCloseTransaction(
    account: TokenAccountInfo, 
    walletAddress: string,
    destinationAddress?: string,
    blockhash?: string
  ): Promise<Transaction> {
    const walletPubkey = new PublicKey(walletAddress);
    const feeWalletPubkey = new PublicKey(this.feeWallet);
    
    // Calculate rent exempt balance for this account
    const accountSize = AccountLayout.span;
    const rentExemptBalance = await this.calculateRentExemptBalance(accountSize);
    
    // Calculate fee and net recovery
    const { fee, netRecovery } = this.calculateFeeAndNetRecovery(rentExemptBalance);
    
    // Convert to lamports
    const feeLamports = Math.floor(fee * LAMPORTS_PER_SOL);
    const netRecoveryLamports = Math.floor(netRecovery * LAMPORTS_PER_SOL);

    const transaction = new Transaction();

    // Step 1: Close the account and send ALL recovered SOL to user first
    const closeInstruction = createCloseAccountInstruction(
      account.pubkey,
      walletPubkey, // Send ALL recovered SOL to user wallet first
      walletPubkey,
      []
    );
    transaction.add(closeInstruction);

    // Step 2: Transfer fee from user to fee wallet (user now has the SOL to pay fee)
    const feeTransferInstruction = SystemProgram.transfer({
      fromPubkey: walletPubkey,
      toPubkey: feeWalletPubkey,
      lamports: feeLamports,
    });
    transaction.add(feeTransferInstruction);

    // Get recent blockhash
    if (blockhash) {
      transaction.recentBlockhash = blockhash;
    } else {
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
    }
    transaction.feePayer = walletPubkey;

    console.log(`💰 Created close transaction with fee: ${rentExemptBalance} SOL → Fee: ${fee.toFixed(6)} SOL → Net: ${netRecovery.toFixed(6)} SOL`);
    return transaction;
  }

  /**
   * Creates a burn transaction for tokens (burns tokens AND closes account to recover rent)
   */
  async createBurnTransaction(
    account: TokenAccountInfo,
    walletAddress: string,
    amount?: string,
    blockhash?: string
  ): Promise<Transaction> {
    const walletPubkey = new PublicKey(walletAddress);
    const feeWalletPubkey = new PublicKey(this.feeWallet);
    const burnAmount = amount || account.amount;

    // Use metadata decimals if available, otherwise fall back to account decimals
    const decimals = account.metadata?.decimals ?? account.decimals ?? 0;
    const isNFT = decimals === 0;

    // Calculate rent exempt balance for this account
    const accountSize = AccountLayout.span;
    const rentExemptBalance = await this.calculateRentExemptBalance(accountSize);
    
    // Calculate fee and net recovery
    const { fee, netRecovery } = this.calculateFeeAndNetRecovery(rentExemptBalance);
    
    // Convert to lamports
    const feeLamports = Math.floor(fee * LAMPORTS_PER_SOL);

    const transaction = new Transaction();

    // Step 1: Burn the tokens
    let burnInstruction;
    if (isNFT) {
      // For NFTs, burn the entire amount
      burnInstruction = createBurnInstruction(
        account.pubkey,
        account.mint,
        walletPubkey,
        BigInt(account.amount)
      );
    } else {
      // For regular tokens, use burn checked with proper decimals
      burnInstruction = createBurnCheckedInstruction(
        account.pubkey,
        account.mint,
        walletPubkey,
        BigInt(burnAmount),
        decimals
      );
    }
    transaction.add(burnInstruction);

    // Step 2: Close the account and send ALL recovered SOL to user first
    const closeInstruction = createCloseAccountInstruction(
      account.pubkey,
      walletPubkey, // Send ALL recovered SOL to user wallet first
      walletPubkey  // Authority (same as destination)
    );
    transaction.add(closeInstruction);

    // Step 3: Transfer fee from user to fee wallet (user now has the SOL to pay fee)
    const feeTransferInstruction = SystemProgram.transfer({
      fromPubkey: walletPubkey,
      toPubkey: feeWalletPubkey,
      lamports: feeLamports,
    });
    transaction.add(feeTransferInstruction);

    // Get recent blockhash
    if (blockhash) {
      transaction.recentBlockhash = blockhash;
    } else {
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
    }
    transaction.feePayer = walletPubkey;

    console.log(`🔥 Created burn+close transaction with fee for ${account.mint.toString()}: burn ${burnAmount} tokens + close account → Fee: ${fee.toFixed(6)} SOL → Net: ${netRecovery.toFixed(6)} SOL`);
    return transaction;
  }

  /**
   * Scans wallet for closeable and burnable token accounts
   */
  async scanWallet(walletAddress: string, options: {
    includeEmptyOnly?: boolean;
    minRecoverableSol?: number;
    includeBurns?: boolean;
  } = {}): Promise<ScanResult> {
    const { 
      includeEmptyOnly = true, 
      minRecoverableSol = 0,
      includeBurns = true 
    } = options;

    // Validate wallet address
    if (!(await this.validateWalletAddress(walletAddress))) {
      throw new Error('Invalid wallet address');
    }

    // Get all token accounts
    const allAccounts = await this.getTokenAccounts(walletAddress);
    
    // Get a single blockhash for all transactions to reduce RPC calls
    const { blockhash } = await this.executeWithRetry(() => 
      this.connection.getLatestBlockhash()
    );
    
    // Pre-calculate rent exempt balance once
    const accountSize = AccountLayout.span;
    const rentExemptBalance = await this.calculateRentExemptBalance(accountSize);
    
    // Batch process mint info for all accounts
    const uniqueMints = [...new Set(allAccounts.map(acc => acc.mint))];
    const mintInfoMap = await this.batchGetMintInfo(uniqueMints);
    
    // Batch fetch token metadata for all unique mints
    const uniqueMintAddresses = [...new Set(allAccounts.map(acc => acc.mint.toString()))];
    console.log(`🔍 Fetching metadata for ${uniqueMintAddresses.length} unique mints:`, uniqueMintAddresses);
    const metadataMap = await this.batchFetchTokenMetadata(uniqueMintAddresses);
    console.log(`✅ Metadata fetched for ${metadataMap.size} mints`);
    
    // Filter accounts
    const closeableAccounts: CloseableAccount[] = [];
    const burnableAccounts: CloseableAccount[] = [];
    let totalRecoverableSol = 0;

    for (const account of allAccounts) {
      const walletPubkey = new PublicKey(walletAddress);
      const mintInfo = mintInfoMap.get(account.mint.toString());
      const metadata = metadataMap.get(account.mint.toString()) || undefined;
      
      // Update account with metadata and proper decimals
      const updatedAccount: TokenAccountInfo = {
        ...account,
        decimals: metadata?.decimals || account.decimals || 0,
        metadata: metadata,
      };
      
      if (metadata) {
        console.log(`📊 Token ${account.mint.toString()}: ${metadata.name} (${metadata.symbol}) - Decimals: ${metadata.decimals}`);
      }
      
      // Check for closeable accounts (empty)
      const isCloseable = account.owner.equals(walletPubkey) &&
        account.amount === '0' &&
        account.isInitialized &&
        !account.isFrozen &&
        !(mintInfo?.supply === '1' && mintInfo?.decimals === 0); // Not a cNFT
      
              if (isCloseable) {
          if (rentExemptBalance >= minRecoverableSol) {
            const closeTransaction = await this.createCloseTransaction(updatedAccount, walletAddress, undefined, blockhash);
            
            // Calculate net recovery after fee
            const { fee, netRecovery } = this.calculateFeeAndNetRecovery(rentExemptBalance);
            
            closeableAccounts.push({
              account: updatedAccount,
              recoverableSol: netRecovery, // Show net recovery to user
              closeTransaction,
              action: 'close',
              metadata: metadata,
            });

            totalRecoverableSol += netRecovery; // Add net recovery to total
          }
        }
      
      // Check for burnable accounts (has tokens)
      if (includeBurns) {
        const isNonBurnable = [
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
          'So11111111111111111111111111111111111111112',   // SOL (wrapped)
        ].includes(account.mint.toString());
        
        const isBurnable = account.owner.equals(walletPubkey) &&
          account.amount !== '0' &&
          account.isInitialized &&
          !account.isFrozen &&
          !isNonBurnable;
        
        if (isBurnable) {
          const burnTransaction = await this.createBurnTransaction(updatedAccount, walletAddress, undefined, blockhash);
          
          // Calculate net recovery after fee
          const { fee, netRecovery } = this.calculateFeeAndNetRecovery(rentExemptBalance);
          
          burnableAccounts.push({
            account: updatedAccount,
            recoverableSol: netRecovery, // Show net recovery to user
            closeTransaction: burnTransaction, // Reuse the field for burn transaction
            action: 'burn',
            metadata: metadata,
          });

          totalRecoverableSol += netRecovery; // Add net recovery to total
        }
      }
    }

    // Combine all accounts
    const allCloseableAccounts = [...closeableAccounts, ...burnableAccounts];

    return {
      walletAddress,
      totalAccounts: allAccounts.length,
      closeableAccounts: allCloseableAccounts,
      totalRecoverableSol,
      scanTimestamp: new Date(),
    };
  }

  /**
   * Creates batch close/burn transactions (MODIFIED TO RETURN SINGLE TRANSACTION)
   */
  async createBatchCloseTransactions(
    walletAddress: string,
    accountPubkeys: string[],
    action: 'close' | 'burn' = 'close'
  ): Promise<Transaction[]> {
    const walletPubkey = new PublicKey(walletAddress);
    const feeWalletPubkey = new PublicKey(this.feeWallet);

    // Get a single blockhash for all transactions to reduce RPC calls
    const { blockhash } = await this.executeWithRetry(() => 
      this.connection.getLatestBlockhash()
    );

    // Create ONE transaction instead of multiple
    const singleTransaction = new Transaction();
    let totalFeeLamports = 0;
    let processedAccounts = 0;

    // Batch fetch metadata for all accounts to avoid RPC issues
    const uniqueMints = new Set<string>();
    const accountDataMap = new Map<string, any>();

    // First pass: collect all account data and mint addresses
    for (const accountPubkeyStr of accountPubkeys) {
      try {
        const accountPubkey = new PublicKey(accountPubkeyStr);
        const accountInfo = await getAccount(this.connection, accountPubkey);
        
        const account: TokenAccountInfo = {
          pubkey: accountPubkey,
          mint: accountInfo.mint,
          owner: accountInfo.owner,
          amount: accountInfo.amount.toString(),
          decimals: (accountInfo as any).decimals || 0,
          isInitialized: accountInfo.isInitialized,
          isFrozen: accountInfo.isFrozen,
          isNative: accountInfo.isNative,
          closeAuthority: accountInfo.closeAuthority || undefined,
        };

        accountDataMap.set(accountPubkeyStr, account);
        uniqueMints.add(accountInfo.mint.toString());
      } catch (error) {
        console.warn(`Failed to get account info for ${accountPubkeyStr}:`, error);
      }
    }

    // Batch fetch metadata for all unique mints
    const uniqueMintAddresses = Array.from(uniqueMints);
    console.log(`🔍 Fetching metadata for ${uniqueMintAddresses.length} unique mints in batch transaction`);
    const metadataMap = await this.batchFetchTokenMetadata(uniqueMintAddresses);

    // Second pass: create instructions with proper metadata
    for (const accountPubkeyStr of accountPubkeys) {
      try {
        const account = accountDataMap.get(accountPubkeyStr);
        if (!account) continue;

        // Add metadata to account
        const metadata = metadataMap.get(account.mint.toString());
        const updatedAccount: TokenAccountInfo = {
          ...account,
          metadata: metadata,
        };

        // Check if account is valid for the action
        let isValid = false;
        if (action === 'burn' && await this.isAccountBurnable(updatedAccount, walletAddress)) {
          isValid = true;
        } else if (action === 'close' && await this.isAccountCloseable(updatedAccount, walletAddress)) {
          isValid = true;
        }

        if (!isValid) {
          console.log(`⚠️ Skipping ${accountPubkeyStr}: not valid for ${action}`);
          continue;
        }

        // Calculate rent exempt balance for this account
        const accountSize = AccountLayout.span;
        const rentExemptBalance = await this.calculateRentExemptBalance(accountSize);
        const { fee } = this.calculateFeeAndNetRecovery(rentExemptBalance);
        const feeLamports = Math.floor(fee * LAMPORTS_PER_SOL);
        totalFeeLamports += feeLamports;

        // Add instructions to the single transaction
        if (action === 'burn') {
          // Add burn instruction
          const decimals = updatedAccount.metadata?.decimals ?? updatedAccount.decimals ?? 0;
          const isNFT = decimals === 0;
          
          console.log(`🔥 Adding burn instruction for ${accountPubkeyStr}: amount=${updatedAccount.amount}, decimals=${decimals}, isNFT=${isNFT}`);
          
          let burnInstruction;
          if (isNFT) {
            burnInstruction = createBurnInstruction(
              updatedAccount.pubkey,
              updatedAccount.mint,
              walletPubkey,
              BigInt(updatedAccount.amount)
            );
          } else {
            burnInstruction = createBurnCheckedInstruction(
              updatedAccount.pubkey,
              updatedAccount.mint,
              walletPubkey,
              BigInt(updatedAccount.amount),
              decimals
            );
          }
          singleTransaction.add(burnInstruction);
        }

        // Add close instruction (for both close and burn actions)
        console.log(`💰 Adding close instruction for ${accountPubkeyStr}`);
        const closeInstruction = createCloseAccountInstruction(
          updatedAccount.pubkey,
          walletPubkey, // Send ALL recovered SOL to user wallet first
          walletPubkey,
          []
        );
        singleTransaction.add(closeInstruction);

        processedAccounts++;
      } catch (error) {
        console.warn(`Failed to create ${action} transaction for ${accountPubkeyStr}:`, error);
      }
    }

    // Add single fee transfer instruction for all accounts
    if (totalFeeLamports > 0) {
      console.log(`💸 Adding fee transfer instruction: ${totalFeeLamports} lamports`);
      const feeTransferInstruction = SystemProgram.transfer({
        fromPubkey: walletPubkey,
        toPubkey: feeWalletPubkey,
        lamports: totalFeeLamports,
      });
      singleTransaction.add(feeTransferInstruction);
    }

    // Set transaction properties
    singleTransaction.recentBlockhash = blockhash;
    singleTransaction.feePayer = walletPubkey;

    console.log(`💰 Created single ${action} transaction for ${processedAccounts} accounts with total fee: ${totalFeeLamports / LAMPORTS_PER_SOL} SOL`);
    console.log(`📊 Transaction has ${singleTransaction.instructions.length} instructions`);
    
    // Validate transaction before returning
    try {
      // Basic validation
      if (singleTransaction.instructions.length === 0) {
        throw new Error('Transaction has no instructions');
      }
      
      if (!singleTransaction.recentBlockhash) {
        throw new Error('Transaction missing recent blockhash');
      }
      
      if (!singleTransaction.feePayer) {
        throw new Error('Transaction missing fee payer');
      }
      
      console.log(`✅ Transaction validation passed`);
    } catch (error) {
      console.error(`❌ Transaction validation failed:`, error);
      throw error;
    }
    
    // Return array with single transaction (maintains existing API)
    return [singleTransaction];
  }

  /**
   * Debug transaction status and provide detailed error information
   */
  async debugTransaction(signature: string): Promise<any> {
    try {
      console.log(`🔍 Debugging transaction: ${signature}`);
      
      // Get transaction status
      const status = await this.connection.getSignatureStatus(signature);
      console.log(`📊 Transaction status:`, status);
      
      // Get transaction details
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (transaction) {
        console.log(`📋 Transaction details:`, {
          blockTime: transaction.blockTime,
          slot: transaction.slot,
          meta: transaction.meta ? {
            err: transaction.meta.err,
            fee: transaction.meta.fee,
            preBalances: transaction.meta.preBalances,
            postBalances: transaction.meta.postBalances,
            logMessages: transaction.meta.logMessages
          } : null
        });
        
        if (transaction.meta?.err) {
          console.error(`❌ Transaction failed with error:`, transaction.meta.err);
        }
      } else {
        console.log(`⚠️ Transaction not found or not yet confirmed`);
      }
      
      return { status, transaction };
    } catch (error) {
      console.error(`❌ Error debugging transaction:`, error);
      throw error;
    }
  }
}