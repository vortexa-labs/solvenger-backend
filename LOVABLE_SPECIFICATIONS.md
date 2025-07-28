# Solvenger - Lovable Enhancement Specifications

##  **Project Overview**

### **Current State**
-  Working wallet connection
-  Basic empty account cleanup functionality  
-  Simple UI for claiming rent from empty accounts
-  Backend API with all features implemented

### **Enhancement Goal**
Enhance the existing UI to support ALL token management features while preserving current functionality and building a more robust, professional interface.

---

##  **Feature Requirements**

### **CORE FEATURES (Already Working - PRESERVE)**
-  Wallet connection
-  Scan for empty accounts
-  Claim rent from empty accounts
-  Basic transaction signing

### **NEW FEATURES TO ADD**
-  Burn worthless tokens for SOL recovery
-  Burn low-value NFTs for SOL recovery
-  Token lock creation and management
-  Vesting schedule creation and management
-  Claim tokens from locks/vestings
-  Revoke locks/vestings (if revocable)
-  Portfolio overview dashboard
-  Transaction history tracking
-  Advanced filtering and search
-  Safety warnings and confirmations

---

##  **UI Structure Requirements**

### **MAIN NAVIGATION STRUCTURE**
`
Navigation Bar:
 Dashboard (Portfolio Overview)
 Scanner (Wallet Analysis) 
 Locks (Token Lock Management)
 Vesting (Vesting Schedule Management)
 History (Transaction History)
 Settings (Wallet Management)
`

### **DASHBOARD COMPONENTS**
- **Portfolio Summary Cards**
  - Total SOL balance
  - Recoverable SOL amount
  - Locked SOL amount
  - Recent activity indicator

- **Quick Action Buttons**
  - "Scan Wallet" button
  - "Create Lock" button
  - "Create Vesting" button
  - "Cleanup" button

- **Recent Activity Feed**
  - Latest transactions
  - Recent scans
  - Lock/vesting activities

- **Wallet Connection Status**
  - Connected wallet address
  - Connection status indicator

### **SCANNER PAGE COMPONENTS**
- **Wallet Address Display**
  - Show connected wallet address
  - Scan button for new scan

- **Scan Results Summary Cards**
  - Empty accounts count and total recoverable SOL
  - Burnable tokens count and total recoverable SOL
  - NFT accounts count and total recoverable SOL
  - Combined total recovery potential

- **Tabbed Interface for Different Account Types**
  - Tab 1: "Claim Rent" (Empty Accounts)
  - Tab 2: "Burn Tokens" (Burnable Accounts)
  - Tab 3: "Burn NFTs" (NFT Accounts)
  - Tab 4: "All Operations" (Combined)

- **Account Selection Interface**
  - Checkbox selection for each account
  - Account details display (token name, balance, recoverable SOL)
  - Warning indicators for valuable tokens
  - Select all/clear all functionality

- **Filter and Search Options**
  - Filter by token type
  - Filter by recoverable SOL amount
  - Search by token name
  - Sort by various criteria

- **Transaction Generation and Preview**
  - "Generate Transactions" button
  - Transaction preview modal
  - Recovery amount calculation
  - Gas fee estimation

---

##  **Detailed Feature Specifications**

### **SCANNER PAGE - TAB STRUCTURE**

#### **TAB 1: "Claim Rent" (Empty Accounts)**
`
Components:
 Filter Options
    All accounts
    High value (>0.002 SOL)
    Low value (<0.002 SOL)
    Custom range
 Account List
    Checkbox selection
    Token name and account address
    Recoverable SOL amount
    Account status
 Action Buttons
    Select All
    Clear All
    Select High Value
    Generate Close Transactions
 Summary
     Selected accounts count
     Total recoverable SOL
     Estimated gas fees
`

#### **TAB 2: "Burn Tokens" (Burnable Accounts)**
`
Components:
 Filter Options
    All tokens
    Worthless tokens only
    Low value tokens
    Custom selection
 Token List
    Checkbox selection
    Token name and balance
    Recoverable SOL amount
    Warning indicators for valuable tokens
    Token account address
 Action Buttons
    Select All
    Clear All
    Select Worthless Only
    Generate Burn Transactions
 Safety Features
     Warning modal for valuable tokens
     Confirmation dialog
     Clear destruction warnings
`

#### **TAB 3: "Burn NFTs" (NFT Accounts)**
`
Components:
 Filter Options
    All NFTs
    Low value NFTs
    Custom selection
 NFT List
    Checkbox selection
    NFT name and metadata
    Recoverable SOL amount
    Warning indicators for valuable NFTs
    NFT account address
 Action Buttons
    Select All
    Clear All
    Select Low Value Only
    Generate NFT Burn Transactions
 Safety Features
     Warning modal for valuable NFTs
     Confirmation dialog
     Clear destruction warnings
`

#### **TAB 4: "All Operations" (Combined)**
`
Components:
 Summary Cards
    Empty accounts summary
    Burnable tokens summary
    NFT accounts summary
    Combined total
 Operation Types
    Close empty accounts
    Burn worthless tokens
    Burn low-value NFTs
    Combined operations
 Action Buttons
    Generate All Transactions
    Preview Combined Recovery
    Execute All Operations
 Summary
     Total accounts to process
     Total SOL recovery
     Estimated gas fees
     Net recovery amount
`

---

##  **API Integration Instructions**

### **EXISTING ENDPOINTS (Already Working - PRESERVE)**
`
- POST /wallet/connect
- GET /wallet/balance/{walletAddress}
- GET /accounts/scan/{walletAddress}
- POST /accounts/close
- GET /api/health
`

### **NEW ENDPOINTS TO ADD**
`
Scanner Enhancements:
- POST /accounts/burn-tokens
- POST /accounts/burn-nfts

Lock & Vesting Features:
- POST /lock-vesting/create-lock
- POST /lock-vesting/create-vesting
- POST /lock-vesting/claim
- POST /lock-vesting/revoke
- GET /lock-vesting/list/{walletAddress}
- GET /lock-vesting/lock/{lockId}
- GET /lock-vesting/vesting/{vestingId}
`

### **API INTEGRATION PATTERNS**
`javascript
// Example API integration pattern
const api = {
  // Existing patterns (preserve)
  async scanWallet(walletAddress) {
    const response = await fetch(/accounts/scan/);
    return response.json();
  },

  // New patterns (add)
  async burnTokens(walletAddress, accountPubkeys) {
    const response = await fetch('/accounts/burn-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, accountPubkeys })
    });
    return response.json();
  },

  async createLock(walletAddress, lockData) {
    const response = await fetch('/lock-vesting/create-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, ...lockData })
    });
    return response.json();
  }
};
`

---

##  **User Experience Flow**

### **COMPLETE USER JOURNEY**

#### **1. WALLET CONNECTION (existing - preserve)**
`
User Action: Connect wallet
UI Response: 
- Show connection status
- Display wallet address
- Load portfolio overview
- Enable all features
`

#### **2. DASHBOARD (enhance existing)**
`
User Action: View dashboard
UI Response:
- Display portfolio summary cards
- Show quick action buttons
- Display recent activity feed
- Show wallet connection status
`

#### **3. SCANNER (enhance existing)**
`
User Action: Click "Scan Wallet"
UI Response:
- Show loading state with progress
- Display scan results in tabbed interface
- Show summary cards with recovery potential
- Enable account selection and filtering
`

#### **4. ACCOUNT SELECTION (new)**
`
User Action: Select accounts to process
UI Response:
- Show checkboxes for each account
- Display account details and recoverable SOL
- Show warning indicators for valuable tokens
- Update selection summary
`

#### **5. TRANSACTION GENERATION (enhance existing)**
`
User Action: Click "Generate Transactions"
UI Response:
- Show transaction preview modal
- Display recovery amounts and gas fees
- Show safety warnings and confirmations
- Enable transaction signing
`

#### **6. TRANSACTION SIGNING (existing - preserve)**
`
User Action: Sign transactions in wallet
UI Response:
- Show transaction status
- Display progress indicators
- Show success/error messages
- Update portfolio overview
`

#### **7. RESULTS & HISTORY (new)**
`
User Action: View results
UI Response:
- Show recovery results
- Update portfolio overview
- Add to transaction history
- Display success confirmation
`

---

##  **Safety & UX Requirements**

### **SAFETY FEATURES**
- **Warning Modals**: For destructive actions (burning tokens)
- **Transaction Preview**: Show exact recovery before signing
- **Confirmation Dialogs**: For valuable tokens and NFTs
- **Clear Messaging**: Success/error states with helpful messages
- **Loading States**: For all operations with progress indicators

### **UX REQUIREMENTS**
- **Responsive Design**: Mobile-friendly with desktop optimization
- **Theme Support**: Dark/light theme with system preference detection
- **Smooth Animations**: Transitions and micro-interactions
- **Intuitive Navigation**: Clear visual hierarchy and breadcrumbs
- **Accessible Design**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Fast loading and smooth interactions

### **VISUAL DESIGN**
- **Color Scheme**: Dark theme with Solana purple accents
- **Typography**: Modern sans-serif with clear hierarchy
- **Components**: Custom cards, buttons, and modals
- **Icons**: Consistent iconography throughout
- **Spacing**: Proper whitespace and visual breathing room

---

##  **Technical Implementation Notes**

### **PRESERVE EXISTING FUNCTIONALITY**
- Keep current wallet connection logic
- Maintain existing API integration patterns
- Preserve current transaction signing flow
- Keep existing error handling

### **ENHANCE WITH NEW FEATURES**
- Add new API calls for additional features
- Implement proper error handling for new endpoints
- Add loading states for all operations
- Ensure mobile responsiveness
- Add proper TypeScript types for new features

### **PERFORMANCE CONSIDERATIONS**
- Optimize for large account lists
- Implement virtual scrolling for long lists
- Cache scan results appropriately
- Minimize API calls with smart caching

---

##  **Deliverable Instructions**

### **1. ENHANCE EXISTING PAGES**
`
Scanner Page:
- Add new tabs (Burn Tokens, Burn NFTs, All Operations)
- Enhance existing "Claim Rent" tab with better UI
- Add filtering and search capabilities
- Improve account selection interface
- Add transaction preview modals

Dashboard:
- Add portfolio summary cards
- Add quick action buttons
- Add recent activity feed
- Enhance wallet connection display
`

### **2. CREATE NEW PAGES**
`
Locks Page:
- Token lock creation wizard
- Lock management interface
- Claim interface for beneficiaries
- Revoke interface for owners

Vesting Page:
- Vesting schedule creation wizard
- Vesting management interface
- Claim interface for beneficiaries
- Revoke interface for owners

History Page:
- Transaction history table
- Filter and search capabilities
- Detailed transaction views
- Export functionality

Settings Page:
- Wallet management
- Preferences configuration
- Network selection
- Theme settings
`

### **3. ADD NEW COMPONENTS**
`
Account Selection Cards:
- Checkbox selection
- Account details display
- Warning indicators
- Action buttons

Transaction Preview Modals:
- Recovery amount display
- Gas fee estimation
- Safety warnings
- Confirmation dialogs

Portfolio Summary Cards:
- Balance displays
- Recovery potential
- Locked amounts
- Recent activity

Filter and Search Components:
- Token type filters
- Amount range filters
- Search functionality
- Sort options

Loading and Success States:
- Progress indicators
- Success messages
- Error handling
- Retry mechanisms
`

### **4. INTEGRATE NEW APIs**
`
Add API calls for:
- Burn operations (tokens and NFTs)
- Lock creation and management
- Vesting creation and management
- Claim and revocation operations
- Transaction history tracking
`

---

##  **Success Criteria**

### **FUNCTIONALITY**
-  All existing functionality continues to work
-  New features are properly integrated
-  API integration is complete and functional
-  Error handling is comprehensive
-  Performance is optimized

### **USER EXPERIENCE**
-  UI is intuitive and user-friendly
-  Mobile responsiveness is maintained
-  Accessibility standards are met
-  Safety features are properly implemented
-  Loading states and feedback are clear

### **TECHNICAL QUALITY**
-  Code is well-structured and maintainable
-  TypeScript types are properly defined
-  Error boundaries are implemented
-  Performance is optimized
-  Security best practices are followed

---

##  **Implementation Priority**

### **PHASE 1: Core Enhancements**
1. Enhance existing scanner page with new tabs
2. Add burn tokens and burn NFTs functionality
3. Improve account selection and filtering
4. Add transaction preview modals

### **PHASE 2: New Features**
1. Create locks management page
2. Create vesting management page
3. Add portfolio dashboard enhancements
4. Implement transaction history

### **PHASE 3: Polish & Optimization**
1. Add advanced filtering and search
2. Implement performance optimizations
3. Add accessibility improvements
4. Final UI/UX polish

---

##  **Support & Communication**

### **IMPORTANT NOTES**
- **Preserve existing functionality** - Don't break what's already working
- **Enhance, don't replace** - Build upon the current foundation
- **Maintain API patterns** - Use existing integration approaches
- **Focus on UX** - Make the interface intuitive and professional
- **Test thoroughly** - Ensure all features work correctly

### **QUESTIONS & CLARIFICATIONS**
If you need clarification on any aspect of this specification, please ask specific questions about:
- Current functionality that needs to be preserved
- New features that need to be implemented
- UI/UX requirements and design preferences
- API integration patterns and error handling
- Performance and accessibility requirements

This specification provides a comprehensive roadmap for enhancing Solvenger while maintaining its current functionality and building a more robust, professional interface.
