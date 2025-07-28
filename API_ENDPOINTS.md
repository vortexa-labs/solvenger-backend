# SolSweep Backend API Endpoints

**Base URL:** `http://localhost:3000`

## 🚀 Available Endpoints

### **1. Wallet Connection**
```
POST /wallet/connect
```
**Request Body:**
```json
{
  "walletAddress": "YOUR_WALLET_ADDRESS"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "connected": true,
    "message": "Wallet connected successfully"
  }
}
```

### **2. Get Wallet Balance**
```
GET /wallet/balance/{walletAddress}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "balance": 1.5,
    "balanceLamports": 1500000000
  }
}
```

### **3. Scan for Empty Token Accounts**
```
GET /accounts/scan/{walletAddress}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "totalAccounts": 10,
    "closeableAccounts": [
      {
        "pubkey": "account_public_key",
        "mint": "token_mint_address",
        "owner": "wallet_owner",
        "amount": "0",
        "decimals": 6,
        "recoverableSol": 0.00203928,
        "isInitialized": true,
        "isFrozen": false
      }
    ],
    "totalRecoverableSol": 0.015,
    "scanTimestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### **4. Close Selected Empty Accounts**
```
POST /accounts/close
```
**Request Body:**
```json
{
  "walletAddress": "YOUR_WALLET_ADDRESS",
  "accountPubkeys": [
    "account_public_key_1",
    "account_public_key_2"
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "closedAccounts": ["account_public_key_1", "account_public_key_2"],
    "transactions": [
      {
        "serialized": "base64_encoded_transaction",
        "signatures": ["signature1", "signature2"]
      }
    ],
    "totalRecoverableSol": 0.00407856,
    "message": "Prepared 2 close transactions",
    "action": "close"
  }
}
```

### **5. Burn Selected Token Accounts**
```
POST /accounts/burn-tokens
```
**Request Body:**
```json
{
  "walletAddress": "YOUR_WALLET_ADDRESS",
  "accountPubkeys": [
    "token_account_1",
    "token_account_2"
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "burnedAccounts": ["token_account_1", "token_account_2"],
    "transactions": [
      {
        "serialized": "base64_encoded_transaction",
        "signatures": ["signature1", "signature2"]
      }
    ],
    "totalRecoverableSol": 0.00407856,
    "message": "Prepared 2 burn transactions",
    "action": "burn"
  }
}
```

### **6. Burn Selected NFT Accounts**
```
POST /accounts/burn-nfts
```
**Request Body:**
```json
{
  "walletAddress": "YOUR_WALLET_ADDRESS",
  "accountPubkeys": [
    "nft_account_1",
    "nft_account_2"
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "burnedNFTs": ["nft_account_1", "nft_account_2"],
    "transactions": [
      {
        "serialized": "base64_encoded_transaction",
        "signatures": ["signature1", "signature2"]
      }
    ],
    "totalRecoverableSol": 0.00407856,
    "message": "Prepared 2 NFT burn transactions",
    "action": "burn"
  }
}
```

### **7. Bulk Scan Multiple Wallets (Advanced)**
```
POST /accounts/bulk-scan
```
**Request Body:**
```json
{
  "privateKeys": [
    "[private_key_1]",
    "[private_key_2]",
    "[private_key_3]"
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "walletIndex": 0,
        "walletAddress": "wallet_address_1",
        "totalAccounts": 5,
        "rentAccounts": [...],
        "burnableTokenAccounts": [...],
        "burnableNFTAccounts": [...],
        "totalRecoverableSol": 0.010,
        "scanTimestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalWallets": 3,
    "totalAccounts": 15,
    "totalRecoverableSol": 0.030,
    "scanTimestamp": "2024-01-01T00:00:00.000Z",
    "feeInfo": {
      "feeRate": 0.10,
      "feeWallet": "DHFvuPUG3nDbdr2uHwVGuEqSjwdL4iC6ESAErYAwhV2K",
      "feePercentage": "10%"
    }
  }
}
```

### **8. Bulk Operations Across Multiple Wallets (Advanced)**
```
POST /accounts/bulk-operations
```
**Request Body:**
```json
{
  "operations": [
    {
      "privateKey": "[private_key_1]",
      "closeAccounts": ["account1", "account2"],
      "burnAccounts": ["token_account1", "nft_account1"]
    },
    {
      "privateKey": "[private_key_2]",
      "closeAccounts": ["account3"],
      "burnAccounts": ["token_account2", "nft_account2"]
    }
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "walletIndex": 0,
        "walletAddress": "wallet_address_1",
        "closeAccounts": ["account1", "account2"],
        "burnAccounts": ["token_account1", "nft_account1"],
        "totalTransactions": 4,
        "recoverableSol": 0.008
      }
    ],
    "transactions": [
      {
        "serialized": "base64_encoded_transaction",
        "signatures": ["signature1"],
        "action": "close",
        "walletAddress": "wallet_address_1"
      }
    ],
    "totalWallets": 2,
    "totalTransactions": 8,
    "totalRecoverableSol": 0.016,
    "message": "Prepared 8 transactions across 2 wallets",
    "feeInfo": {
      "feeRate": 0.10,
      "feeWallet": "DHFvuPUG3nDbdr2uHwVGuEqSjwdL4iC6ESAErYAwhV2K",
      "feePercentage": "10%"
    }
  }
}
```

### **9. Health Check**
```
GET /api/health
```
**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "service": "SolSweep Backend"
  }
}
```

## 🔧 Lovable Frontend Integration

### **API Configuration**
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

### **API Functions for Lovable**
```javascript
const api = {
  // Connect wallet
  async connectWallet(walletAddress) {
    const response = await fetch(`${API_BASE_URL}/wallet/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });
    return response.json();
  },

  // Get wallet balance
  async getWalletBalance(walletAddress) {
    const response = await fetch(`${API_BASE_URL}/wallet/balance/${walletAddress}`);
    return response.json();
  },

  // Scan accounts
  async scanAccounts(walletAddress) {
    const response = await fetch(`${API_BASE_URL}/accounts/scan/${walletAddress}`);
    return response.json();
  },

  // Close accounts
  async closeAccounts(walletAddress, accountPubkeys) {
    const response = await fetch(`${API_BASE_URL}/accounts/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, accountPubkeys })
    });
    return response.json();
  },

  // Burn tokens
  async burnTokens(walletAddress, accountPubkeys) {
    const response = await fetch(`${API_BASE_URL}/accounts/burn-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, accountPubkeys })
    });
    return response.json();
  },

  // Burn NFTs
  async burnNFTs(walletAddress, accountPubkeys) {
    const response = await fetch(`${API_BASE_URL}/accounts/burn-nfts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, accountPubkeys })
    });
    return response.json();
  },

  // Health check
  async checkHealth() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  }
};
```

### **Usage Examples**

#### **Connect Wallet**
```javascript
// In WalletConnection.tsx
const handleConnect = async (walletAddress) => {
  try {
    const result = await api.connectWallet(walletAddress);
    if (result.success) {
      console.log('Wallet connected:', result.data);
      // Update UI state
    } else {
      console.error('Connection failed:', result.error);
    }
  } catch (error) {
    console.error('Connection error:', error);
  }
};
```

#### **Scan Accounts**
```javascript
// In AccountScanner.tsx
const handleScan = async (walletAddress) => {
  try {
    const result = await api.scanAccounts(walletAddress);
    if (result.success) {
      console.log('Found accounts:', result.data.closeableAccounts.length);
      console.log('Total recoverable:', result.data.totalRecoverableSol, 'SOL');
      // Update UI with scan results
    } else {
      console.error('Scan failed:', result.error);
    }
  } catch (error) {
    console.error('Scan error:', error);
  }
};
```

#### **Close Accounts**
```javascript
// In AccountScanner.tsx
const handleClose = async (walletAddress, selectedAccounts) => {
  try {
    const accountPubkeys = selectedAccounts.map(acc => acc.pubkey);
    const result = await api.closeAccounts(walletAddress, accountPubkeys);
    
    if (result.success) {
      console.log('Close prepared:', result.data.message);
      // Handle transactions for wallet signing
      const transactions = result.data.transactions;
      // Send to wallet for signing
    } else {
      console.error('Close failed:', result.error);
    }
  } catch (error) {
    console.error('Close error:', error);
  }
};
```

#### **Burn Tokens**
```javascript
// In AccountScanner.tsx
const handleBurnTokens = async (walletAddress, selectedAccounts) => {
  try {
    const accountPubkeys = selectedAccounts.map(acc => acc.pubkey);
    const result = await api.burnTokens(walletAddress, accountPubkeys);
    
    if (result.success) {
      console.log('Token burn prepared:', result.data.message);
      // Handle transactions for wallet signing
      const transactions = result.data.transactions;
      // Send to wallet for signing
    } else {
      console.error('Token burn failed:', result.error);
    }
  } catch (error) {
    console.error('Token burn error:', error);
  }
};
```

#### **Burn NFTs**
```javascript
// In AccountScanner.tsx
const handleBurnNFTs = async (walletAddress, selectedAccounts) => {
  try {
    const accountPubkeys = selectedAccounts.map(acc => acc.pubkey);
    const result = await api.burnNFTs(walletAddress, accountPubkeys);
    
    if (result.success) {
      console.log('NFT burn prepared:', result.data.message);
      // Handle transactions for wallet signing
      const transactions = result.data.transactions;
      // Send to wallet for signing
    } else {
      console.error('NFT burn failed:', result.error);
    }
  } catch (error) {
    console.error('NFT burn error:', error);
  }
};
```

## 🚀 Backend Status

- **Status**: ✅ Running on port 3000
- **Environment**: Development
- **Solana RPC**: https://api.mainnet-beta.solana.com
- **CORS**: Enabled for localhost:3000 and localhost:3001

## 📝 Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message description"
}
```

Common error scenarios:
- Invalid wallet address
- Network/RPC connection issues
- Invalid request data
- Account not found or not closeable

## 🔄 Legacy Endpoints (Still Available)

For backward compatibility, these endpoints are still available:
- `POST /api/scan` - Original scan endpoint
- `POST /api/close-transactions` - Original transaction endpoint
- `GET /api/health` - Health check 