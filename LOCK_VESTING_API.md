# SolSweep Token Lock & Vesting API

**Base URL:** `http://localhost:3000`

## 🔒 Token Lock & Vesting Features

SolSweep now supports advanced token management with lock and vesting capabilities. These features allow users to:

- **Lock tokens** for a specified duration
- **Create vesting schedules** with various types (linear, cliff, step)
- **Claim tokens** when conditions are met
- **Revoke locks/vestings** (if revocable)
- **Track all locks and vestings** for any wallet

## 🚀 Available Endpoints

### **1. Create Token Lock**
```
POST /lock-vesting/create-lock
```
**Request Body:**
```json
{
  "walletAddress": "YOUR_WALLET_ADDRESS",
  "tokenMint": "TOKEN_MINT_ADDRESS",
  "tokenAccount": "TOKEN_ACCOUNT_ADDRESS",
  "beneficiary": "BENEFICIARY_WALLET_ADDRESS",
  "amount": "1000000000",
  "unlockTime": "2024-12-31T23:59:59.000Z",
  "isRevocable": false
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "lockId": "uuid-string",
    "transaction": {
      "serialized": "base64_encoded_transaction",
      "signatures": ["signature1", "signature2"]
    },
    "message": "Token lock created successfully"
  }
}
```

### **2. Create Vesting Schedule**
```
POST /lock-vesting/create-vesting
```
**Request Body:**
```json
{
  "walletAddress": "YOUR_WALLET_ADDRESS",
  "tokenMint": "TOKEN_MINT_ADDRESS",
  "tokenAccount": "TOKEN_ACCOUNT_ADDRESS",
  "beneficiary": "BENEFICIARY_WALLET_ADDRESS",
  "totalAmount": "1000000000",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.000Z",
  "cliffTime": "2024-06-01T00:00:00.000Z",
  "vestingType": "linear",
  "isRevocable": true
}
```
**Vesting Types:**
- `linear`: Tokens vest linearly over time
- `cliff`: All tokens vest at cliff time
- `step`: Tokens vest in monthly steps

**Response:**
```json
{
  "success": true,
  "data": {
    "vestingId": "uuid-string",
    "transaction": {
      "serialized": "base64_encoded_transaction",
      "signatures": ["signature1", "signature2"]
    },
    "message": "Vesting schedule created successfully"
  }
}
```

### **3. Claim Tokens**
```
POST /lock-vesting/claim
```
**Request Body:**
```json
{
  "lockId": "lock-uuid-string",
  "vestingId": null,
  "beneficiaryAddress": "BENEFICIARY_WALLET_ADDRESS"
}
```
**OR**
```json
{
  "lockId": null,
  "vestingId": "vesting-uuid-string",
  "beneficiaryAddress": "BENEFICIARY_WALLET_ADDRESS"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "serialized": "base64_encoded_transaction",
      "signatures": ["signature1", "signature2"]
    },
    "message": "Successfully claimed 500000000 tokens"
  }
}
```

### **4. Revoke Lock/Vesting**
```
POST /lock-vesting/revoke
```
**Request Body:**
```json
{
  "lockId": "lock-uuid-string",
  "vestingId": null,
  "ownerAddress": "OWNER_WALLET_ADDRESS"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "serialized": "base64_encoded_transaction",
      "signatures": ["signature1", "signature2"]
    },
    "message": "Successfully revoked and returned 1000000000 tokens"
  }
}
```

### **5. List All Locks & Vestings**
```
GET /lock-vesting/list/{walletAddress}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "locks": [
      {
        "id": "lock-uuid",
        "tokenMint": "TOKEN_MINT_ADDRESS",
        "tokenAccount": "TOKEN_ACCOUNT_ADDRESS",
        "owner": "OWNER_ADDRESS",
        "beneficiary": "BENEFICIARY_ADDRESS",
        "totalAmount": "1000000000",
        "lockedAmount": "1000000000",
        "unlockTime": "2024-12-31T23:59:59.000Z",
        "isRevocable": false,
        "isRevoked": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "vestings": [
      {
        "id": "vesting-uuid",
        "tokenMint": "TOKEN_MINT_ADDRESS",
        "tokenAccount": "TOKEN_ACCOUNT_ADDRESS",
        "owner": "OWNER_ADDRESS",
        "beneficiary": "BENEFICIARY_ADDRESS",
        "totalAmount": "1000000000",
        "vestedAmount": "250000000",
        "startTime": "2024-01-01T00:00:00.000Z",
        "endTime": "2024-12-31T23:59:59.000Z",
        "cliffTime": "2024-06-01T00:00:00.000Z",
        "vestingType": "linear",
        "isRevocable": true,
        "isRevoked": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalLocks": 1,
    "totalVestings": 1
  }
}
```

### **6. Get Lock Details**
```
GET /lock-vesting/lock/{lockId}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lock-uuid",
    "tokenMint": "TOKEN_MINT_ADDRESS",
    "tokenAccount": "TOKEN_ACCOUNT_ADDRESS",
    "owner": "OWNER_ADDRESS",
    "beneficiary": "BENEFICIARY_ADDRESS",
    "totalAmount": "1000000000",
    "lockedAmount": "1000000000",
    "unlockTime": "2024-12-31T23:59:59.000Z",
    "isRevocable": false,
    "isRevoked": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### **7. Get Vesting Details**
```
GET /lock-vesting/vesting/{vestingId}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "vesting-uuid",
    "tokenMint": "TOKEN_MINT_ADDRESS",
    "tokenAccount": "TOKEN_ACCOUNT_ADDRESS",
    "owner": "OWNER_ADDRESS",
    "beneficiary": "BENEFICIARY_ADDRESS",
    "totalAmount": "1000000000",
    "vestedAmount": "250000000",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "cliffTime": "2024-06-01T00:00:00.000Z",
    "vestingType": "linear",
    "isRevocable": true,
    "isRevoked": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔧 Frontend Integration

### **API Functions for Frontend**
```javascript
const API_BASE_URL = 'http://localhost:3000';

const lockVestingApi = {
  // Create token lock
  async createLock(walletAddress, lockData) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/create-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, ...lockData })
    });
    return response.json();
  },

  // Create vesting schedule
  async createVesting(walletAddress, vestingData) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/create-vesting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, ...vestingData })
    });
    return response.json();
  },

  // Claim tokens
  async claimTokens(claimData) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimData)
    });
    return response.json();
  },

  // Revoke lock/vesting
  async revokeLockVesting(revokeData) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revokeData)
    });
    return response.json();
  },

  // Get all locks and vestings
  async getLocksAndVestings(walletAddress) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/list/${walletAddress}`);
    return response.json();
  },

  // Get lock details
  async getLockDetails(lockId) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/lock/${lockId}`);
    return response.json();
  },

  // Get vesting details
  async getVestingDetails(vestingId) {
    const response = await fetch(`${API_BASE_URL}/lock-vesting/vesting/${vestingId}`);
    return response.json();
  }
};
```

## 📊 Use Cases

### **Token Lock Use Cases:**
1. **Team Token Locks**: Lock team tokens for vesting periods
2. **Investor Protection**: Lock tokens to prevent immediate selling
3. **Escrow Services**: Hold tokens until conditions are met
4. **Staking Rewards**: Lock staking rewards for a period

### **Vesting Use Cases:**
1. **Employee Compensation**: Gradual token release to employees
2. **Investor Vesting**: Linear vesting for early investors
3. **Team Incentives**: Cliff vesting for team members
4. **Advisor Rewards**: Step vesting for advisors

## ⚠️ Important Notes

1. **Transaction Signing**: All transactions must be signed by the appropriate wallet
2. **Revocable vs Non-Revocable**: Choose carefully when creating locks/vestings
3. **Time Validation**: Claims are only allowed after unlock/vesting times
4. **Token Balance**: Ensure sufficient token balance before creating locks
5. **Gas Fees**: All operations require SOL for transaction fees

## 🔒 Security Features

- **Input Validation**: All inputs validated with Zod schemas
- **Ownership Verification**: Only owners can revoke, only beneficiaries can claim
- **Time-based Restrictions**: Claims only allowed after specified times
- **Transaction Safety**: All transactions are properly serialized for frontend signing
- **Error Handling**: Comprehensive error responses for all edge cases 