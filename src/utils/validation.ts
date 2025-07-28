import { PublicKey } from '@solana/web3.js';

/**
 * Validates a Solana wallet address
 */
export function isValidWalletAddress(address: string): boolean {
  try {
    const pubkey = new PublicKey(address);
    return PublicKey.isOnCurve(pubkey);
  } catch {
    return false;
  }
}

/**
 * Formats SOL amount from lamports
 */
export function formatSolAmount(lamports: number): number {
  return lamports / 1e9; // 1 SOL = 1e9 lamports
}

/**
 * Formats lamports from SOL amount
 */
export function formatLamports(sol: number): number {
  return Math.floor(sol * 1e9);
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(message: string, code?: string) {
  return {
    success: false as const,
    error: message,
    ...(code && { code }),
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T) {
  return {
    success: true as const,
    data,
  };
} 