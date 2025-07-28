import { PublicKey, Transaction } from '@solana/web3.js';

export interface TokenMetadata {
  name?: string;
  symbol?: string;
  image?: string;
  description?: string;
  decimals?: number;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
    github?: string;
  };
}

export interface TokenAccountInfo {
  pubkey: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: string;
  decimals: number;
  isInitialized: boolean;
  isFrozen: boolean;
  isNative: boolean;
  rentExemptReserve?: string;
  closeAuthority?: PublicKey;
  metadata?: TokenMetadata; // Add metadata field
}

export interface CloseableAccount {
  account: TokenAccountInfo;
  recoverableSol: number;
  closeTransaction: Transaction;
  action: 'close' | 'burn';
  isNFT?: boolean;
  metadata?: TokenMetadata; // Add metadata field
}

export interface ScanResult {
  walletAddress: string;
  totalAccounts: number;
  closeableAccounts: CloseableAccount[];
  totalRecoverableSol: number;
  scanTimestamp: Date;
}

export interface ScanRequest {
  walletAddress: string;
  includeEmptyOnly?: boolean;
  minRecoverableSol?: number;
}

export interface CloseTransactionRequest {
  walletAddress: string;
  accountPubkeys: string[];
}

// Token Lock & Vesting Types
export interface TokenLock {
  id: string;
  tokenMint: string;
  tokenAccount: string;
  owner: string;
  beneficiary: string;
  totalAmount: string;
  lockedAmount: string;
  unlockTime: Date;
  isRevocable: boolean;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VestingSchedule {
  id: string;
  tokenMint: string;
  tokenAccount: string;
  owner: string;
  beneficiary: string;
  totalAmount: string;
  vestedAmount: string;
  startTime: Date;
  endTime: Date;
  cliffTime?: Date;
  vestingType: 'linear' | 'cliff' | 'step';
  isRevocable: boolean;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLockRequest {
  tokenMint: string;
  tokenAccount: string;
  beneficiary: string;
  amount: string;
  unlockTime: Date;
  isRevocable?: boolean;
}

export interface CreateVestingRequest {
  tokenMint: string;
  tokenAccount: string;
  beneficiary: string;
  totalAmount: string;
  startTime: Date;
  endTime: Date;
  cliffTime?: Date;
  vestingType: 'linear' | 'cliff' | 'step';
  isRevocable?: boolean;
}

export interface LockVestingResponse {
  success: boolean;
  data?: {
    lockId?: string;
    vestingId?: string;
    transaction: {
      serialized: string;
      signatures: string[];
    };
    message: string;
  };
  error?: string;
}

export interface LockVestingListResponse {
  success: boolean;
  data?: {
    locks: TokenLock[];
    vestings: VestingSchedule[];
    totalLocks: number;
    totalVestings: number;
  };
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
} 