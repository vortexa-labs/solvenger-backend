import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAccount, 
  getAssociatedTokenAddress,
  createTransferInstruction,
  createApproveInstruction,
  createRevokeInstruction,
  AccountLayout,
  getMint
} from '@solana/spl-token';
import { 
  TokenLock, 
  VestingSchedule, 
  CreateLockRequest, 
  CreateVestingRequest 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LockVestingService {
  private connection: Connection;
  private locks: Map<string, TokenLock> = new Map();
  private vestings: Map<string, VestingSchedule> = new Map();

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Creates a token lock transaction
   */
  async createTokenLock(
    ownerAddress: string,
    request: CreateLockRequest
  ): Promise<{ transaction: Transaction; lockId: string }> {
    const ownerPubkey = new PublicKey(ownerAddress);
    const beneficiaryPubkey = new PublicKey(request.beneficiary);
    const tokenMintPubkey = new PublicKey(request.tokenMint);
    const tokenAccountPubkey = new PublicKey(request.tokenAccount);

    // Validate token account ownership
    const tokenAccountInfo = await this.validateTokenAccountOwnership(
      tokenAccountPubkey,
      ownerPubkey,
      request.amount
    );

    // Create lock ID
    const lockId = uuidv4();

    // Create lock record
    const lock: TokenLock = {
      id: lockId,
      tokenMint: request.tokenMint,
      tokenAccount: request.tokenAccount,
      owner: ownerAddress,
      beneficiary: request.beneficiary,
      totalAmount: request.amount,
      lockedAmount: request.amount,
      unlockTime: request.unlockTime,
      isRevocable: request.isRevocable ?? false,
      isRevoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store lock record
    this.locks.set(lockId, lock);

    // Create transaction
    const transaction = new Transaction();

    // Add transfer instruction to lock tokens
    const transferInstruction = createTransferInstruction(
      tokenAccountPubkey,
      tokenAccountPubkey, // For now, we'll use the same account as lock
      ownerPubkey,
      BigInt(request.amount),
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerPubkey;

    return { transaction, lockId };
  }

  /**
   * Creates a vesting schedule transaction
   */
  async createVestingSchedule(
    ownerAddress: string,
    request: CreateVestingRequest
  ): Promise<{ transaction: Transaction; vestingId: string }> {
    const ownerPubkey = new PublicKey(ownerAddress);
    const beneficiaryPubkey = new PublicKey(request.beneficiary);
    const tokenMintPubkey = new PublicKey(request.tokenMint);
    const tokenAccountPubkey = new PublicKey(request.tokenAccount);

    // Validate token account ownership
    await this.validateTokenAccountOwnership(
      tokenAccountPubkey,
      ownerPubkey,
      request.totalAmount
    );

    // Create vesting ID
    const vestingId = uuidv4();

    // Create vesting record
    const vesting: VestingSchedule = {
      id: vestingId,
      tokenMint: request.tokenMint,
      tokenAccount: request.tokenAccount,
      owner: ownerAddress,
      beneficiary: request.beneficiary,
      totalAmount: request.totalAmount,
      vestedAmount: '0',
      startTime: request.startTime,
      endTime: request.endTime,
      cliffTime: request.cliffTime,
      vestingType: request.vestingType,
      isRevocable: request.isRevocable ?? false,
      isRevoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store vesting record
    this.vestings.set(vestingId, vesting);

    // Create transaction
    const transaction = new Transaction();

    // Add transfer instruction to lock tokens for vesting
    const transferInstruction = createTransferInstruction(
      tokenAccountPubkey,
      tokenAccountPubkey, // For now, we'll use the same account as vesting
      ownerPubkey,
      BigInt(request.totalAmount),
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerPubkey;

    return { transaction, vestingId };
  }

  /**
   * Claims tokens from a lock
   */
  async claimFromLock(
    lockId: string,
    beneficiaryAddress: string
  ): Promise<{ transaction: Transaction; amount: string }> {
    const lock = this.locks.get(lockId);
    if (!lock) {
      throw new Error('Lock not found');
    }

    if (lock.beneficiary !== beneficiaryAddress) {
      throw new Error('Only beneficiary can claim from lock');
    }

    if (new Date() < lock.unlockTime) {
      throw new Error('Lock has not reached unlock time');
    }

    if (lock.isRevoked) {
      throw new Error('Lock has been revoked');
    }

    const beneficiaryPubkey = new PublicKey(beneficiaryAddress);
    const tokenAccountPubkey = new PublicKey(lock.tokenAccount);

    // Create transaction
    const transaction = new Transaction();

    // Add transfer instruction to release tokens
    const transferInstruction = createTransferInstruction(
      tokenAccountPubkey,
      tokenAccountPubkey, // For now, we'll use the same account
      beneficiaryPubkey,
      BigInt(lock.lockedAmount),
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Update lock record
    lock.lockedAmount = '0';
    lock.updatedAt = new Date();
    this.locks.set(lockId, lock);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = beneficiaryPubkey;

    return { transaction, amount: lock.lockedAmount };
  }

  /**
   * Claims tokens from a vesting schedule
   */
  async claimFromVesting(
    vestingId: string,
    beneficiaryAddress: string
  ): Promise<{ transaction: Transaction; amount: string }> {
    const vesting = this.vestings.get(vestingId);
    if (!vesting) {
      throw new Error('Vesting schedule not found');
    }

    if (vesting.beneficiary !== beneficiaryAddress) {
      throw new Error('Only beneficiary can claim from vesting');
    }

    if (new Date() < vesting.startTime) {
      throw new Error('Vesting has not started yet');
    }

    if (vesting.isRevoked) {
      throw new Error('Vesting has been revoked');
    }

    // Calculate vested amount
    const vestedAmount = this.calculateVestedAmount(vesting);
    const claimableAmount = BigInt(vestedAmount) - BigInt(vesting.vestedAmount);

    if (claimableAmount <= 0) {
      throw new Error('No tokens available to claim');
    }

    const beneficiaryPubkey = new PublicKey(beneficiaryAddress);
    const tokenAccountPubkey = new PublicKey(vesting.tokenAccount);

    // Create transaction
    const transaction = new Transaction();

    // Add transfer instruction to release tokens
    const transferInstruction = createTransferInstruction(
      tokenAccountPubkey,
      tokenAccountPubkey, // For now, we'll use the same account
      beneficiaryPubkey,
      claimableAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Update vesting record
    vesting.vestedAmount = vestedAmount;
    vesting.updatedAt = new Date();
    this.vestings.set(vestingId, vesting);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = beneficiaryPubkey;

    return { transaction, amount: claimableAmount.toString() };
  }

  /**
   * Revokes a lock (only if revocable)
   */
  async revokeLock(
    lockId: string,
    ownerAddress: string
  ): Promise<{ transaction: Transaction; amount: string }> {
    const lock = this.locks.get(lockId);
    if (!lock) {
      throw new Error('Lock not found');
    }

    if (lock.owner !== ownerAddress) {
      throw new Error('Only owner can revoke lock');
    }

    if (!lock.isRevocable) {
      throw new Error('Lock is not revocable');
    }

    if (lock.isRevoked) {
      throw new Error('Lock is already revoked');
    }

    const ownerPubkey = new PublicKey(ownerAddress);
    const tokenAccountPubkey = new PublicKey(lock.tokenAccount);

    // Create transaction
    const transaction = new Transaction();

    // Add transfer instruction to return tokens to owner
    const transferInstruction = createTransferInstruction(
      tokenAccountPubkey,
      tokenAccountPubkey, // For now, we'll use the same account
      ownerPubkey,
      BigInt(lock.lockedAmount),
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Update lock record
    lock.isRevoked = true;
    lock.lockedAmount = '0';
    lock.updatedAt = new Date();
    this.locks.set(lockId, lock);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerPubkey;

    return { transaction, amount: lock.lockedAmount };
  }

  /**
   * Revokes a vesting schedule (only if revocable)
   */
  async revokeVesting(
    vestingId: string,
    ownerAddress: string
  ): Promise<{ transaction: Transaction; amount: string }> {
    const vesting = this.vestings.get(vestingId);
    if (!vesting) {
      throw new Error('Vesting schedule not found');
    }

    if (vesting.owner !== ownerAddress) {
      throw new Error('Only owner can revoke vesting');
    }

    if (!vesting.isRevocable) {
      throw new Error('Vesting is not revocable');
    }

    if (vesting.isRevoked) {
      throw new Error('Vesting is already revoked');
    }

    const ownerPubkey = new PublicKey(ownerAddress);
    const tokenAccountPubkey = new PublicKey(vesting.tokenAccount);

    // Calculate remaining amount
    const totalAmount = BigInt(vesting.totalAmount);
    const vestedAmount = BigInt(vesting.vestedAmount);
    const remainingAmount = totalAmount - vestedAmount;

    // Create transaction
    const transaction = new Transaction();

    // Add transfer instruction to return remaining tokens to owner
    const transferInstruction = createTransferInstruction(
      tokenAccountPubkey,
      tokenAccountPubkey, // For now, we'll use the same account
      ownerPubkey,
      remainingAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Update vesting record
    vesting.isRevoked = true;
    vesting.updatedAt = new Date();
    this.vestings.set(vestingId, vesting);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerPubkey;

    return { transaction, amount: remainingAmount.toString() };
  }

  /**
   * Gets all locks for a wallet
   */
  getLocksForWallet(walletAddress: string): TokenLock[] {
    return Array.from(this.locks.values()).filter(
      lock => lock.owner === walletAddress || lock.beneficiary === walletAddress
    );
  }

  /**
   * Gets all vesting schedules for a wallet
   */
  getVestingsForWallet(walletAddress: string): VestingSchedule[] {
    return Array.from(this.vestings.values()).filter(
      vesting => vesting.owner === walletAddress || vesting.beneficiary === walletAddress
    );
  }

  /**
   * Gets a specific lock by ID
   */
  getLockById(lockId: string): TokenLock | undefined {
    return this.locks.get(lockId);
  }

  /**
   * Gets a specific vesting by ID
   */
  getVestingById(vestingId: string): VestingSchedule | undefined {
    return this.vestings.get(vestingId);
  }

  /**
   * Validates token account ownership and balance
   */
  private async validateTokenAccountOwnership(
    tokenAccountPubkey: PublicKey,
    ownerPubkey: PublicKey,
    amount: string
  ): Promise<any> {
    try {
      const tokenAccountInfo = await getAccount(this.connection, tokenAccountPubkey);
      
      if (!tokenAccountInfo.owner.equals(ownerPubkey)) {
        throw new Error('Token account not owned by specified owner');
      }

      if (BigInt(tokenAccountInfo.amount) < BigInt(amount)) {
        throw new Error('Insufficient token balance');
      }

      return tokenAccountInfo;
    } catch (error) {
      throw new Error(`Failed to validate token account: ${error}`);
    }
  }

  /**
   * Calculates vested amount based on vesting schedule
   */
  private calculateVestedAmount(vesting: VestingSchedule): string {
    const now = new Date();
    const startTime = new Date(vesting.startTime);
    const endTime = new Date(vesting.endTime);
    const totalAmount = BigInt(vesting.totalAmount);

    if (now < startTime) {
      return '0';
    }

    if (now >= endTime) {
      return vesting.totalAmount;
    }

    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsedDuration = now.getTime() - startTime.getTime();
    const progress = elapsedDuration / totalDuration;

    // Handle cliff vesting
    if (vesting.cliffTime && now < new Date(vesting.cliffTime)) {
      return '0';
    }

    // Calculate vested amount based on vesting type
    let vestedRatio = 0;
    
    switch (vesting.vestingType) {
      case 'linear':
        vestedRatio = progress;
        break;
      case 'cliff':
        if (vesting.cliffTime) {
          const cliffTime = new Date(vesting.cliffTime);
          if (now >= cliffTime) {
            vestedRatio = 1; // 100% vested after cliff
          } else {
            vestedRatio = 0;
          }
        } else {
          vestedRatio = progress;
        }
        break;
      case 'step':
        // Step vesting with monthly releases
        const monthsElapsed = Math.floor(elapsedDuration / (30 * 24 * 60 * 60 * 1000));
        const totalMonths = Math.floor(totalDuration / (30 * 24 * 60 * 60 * 1000));
        vestedRatio = Math.min(monthsElapsed / totalMonths, 1);
        break;
    }

    const vestedAmount = (totalAmount * BigInt(Math.floor(vestedRatio * 1000000))) / BigInt(1000000);
    return vestedAmount.toString();
  }
} 