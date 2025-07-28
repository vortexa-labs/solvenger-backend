# SolSweep Backend

A Node.js/TypeScript backend service for SolSweep - a comprehensive Solana token management tool that helps users recover SOL from empty SPL token accounts and manage token locks and vesting schedules.

## Features

### 🔧 Core Features
- **Wallet Scanning**: Scan any Solana wallet for empty SPL token accounts
- **Rent Calculation**: Calculate recoverable SOL from rent-exempt balances
- **Transaction Preparation**: Generate closeAccount transactions for frontend signing
- **Batch Operations**: Support for closing multiple accounts at once
- **RESTful API**: Clean, documented API endpoints

### 🔒 Token Lock & Vesting Features
- **Token Locks**: Lock tokens for specified durations with beneficiary management
- **Vesting Schedules**: Create linear, cliff, and step vesting schedules
- **Claim Management**: Claim tokens when conditions are met
- **Revocation Support**: Revoke locks/vestings (if revocable)
- **Multi-wallet Support**: Track locks and vestings across multiple wallets

## API Endpoints

### Core Endpoints

#### POST /api/scan
Scan a wallet for closeable token accounts.

**Request Body:**
```json
{
  "walletAddress": "string",
  "includeEmptyOnly": true,
  "minRecoverableSol": 0
}
```

#### POST /api/close-transactions
Create close transactions for specified accounts.

**Request Body:**
```json
{
  "walletAddress": "string",
  "accountPubkeys": ["string"]
}
```

### Lock & Vesting Endpoints

#### POST /lock-vesting/create-lock
Create a new token lock.

**Request Body:**
```json
{
  "walletAddress": "string",
  "tokenMint": "string",
  "tokenAccount": "string",
  "beneficiary": "string",
  "amount": "string",
  "unlockTime": "2024-12-31T23:59:59.000Z",
  "isRevocable": false
}
```

#### POST /lock-vesting/create-vesting
Create a new vesting schedule.

**Request Body:**
```json
{
  "walletAddress": "string",
  "tokenMint": "string",
  "tokenAccount": "string",
  "beneficiary": "string",
  "totalAmount": "string",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.000Z",
  "cliffTime": "2024-06-01T00:00:00.000Z",
  "vestingType": "linear",
  "isRevocable": true
}
```

#### POST /lock-vesting/claim
Claim tokens from lock or vesting.

#### POST /lock-vesting/revoke
Revoke lock or vesting (if revocable).

#### GET /lock-vesting/list/{walletAddress}
Get all locks and vestings for a wallet.

### Health Check
#### GET /api/health
Health check endpoint.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file:
   ```bash
   cp env.example .env
   ```

4. Configure environment variables in `.env`:
   ```
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   PORT=3000
   NODE_ENV=development
   ```

## Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Environment Variables

- `SOLANA_RPC_URL`: Solana RPC endpoint (default: mainnet-beta)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## Architecture

### Services
- **SolanaService**: Handles all Solana blockchain interactions
  - Wallet validation
  - Token account scanning
  - Transaction creation
  - Rent calculation
- **LockVestingService**: Manages token locks and vesting schedules
  - Token lock creation and management
  - Vesting schedule creation and tracking
  - Claim and revocation logic
  - Time-based calculations

### Types
- **TokenAccountInfo**: Represents a token account with all relevant data
- **CloseableAccount**: Account that can be closed with recoverable SOL
- **ScanResult**: Complete scan results for a wallet
- **TokenLock**: Token lock with beneficiary and time constraints
- **VestingSchedule**: Vesting schedule with various vesting types

### Routes
- **scanRoutes**: API endpoints for scanning and transaction creation
- **lockVestingRoutes**: API endpoints for lock and vesting management

## Security

- Input validation using Zod schemas
- CORS configuration for frontend integration
- Helmet.js for security headers
- Error handling and logging
- Ownership verification for all operations
- Time-based restrictions for claims

## Dependencies

- **@solana/web3.js**: Solana blockchain interaction
- **@solana/spl-token**: SPL token program utilities
- **express**: Web framework
- **zod**: Schema validation
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **dotenv**: Environment variable management
- **uuid**: Unique identifier generation

## Documentation

- [API Endpoints](./API_ENDPOINTS.md): Complete API documentation
- [Lock & Vesting API](./LOCK_VESTING_API.md): Detailed lock and vesting features

## License

MIT 