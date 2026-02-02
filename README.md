# ElectionDecentralizedMaster: Decentralized Voting System on Ethereum

## Introduction

ElectionDecentralizedMaster is a secure, tamper-proof decentralized voting system built on Ethereum. It leverages smart contracts to enable fair elections with multi-signature governance, supporting three voting mechanisms: First-Past-The-Post (FPTP) with quorum, Proportional Representation, and Instant Runoff (Ranked Choice Voting). The system ensures no single entity can manipulate the process by requiring consensus from multiple admins and registrars. The frontend is a simple, responsive dApp using HTML, CSS, and vanilla JavaScript with Web3.js for blockchain interaction.

This project is designed for educational purposes, small-scale elections (e.g., student councils, DAOs, or associations), and demonstrations of blockchain-based governance.

## Features

- **Multi-Party Governance**: 3 admins for closing elections (requires 2/3 consensus) and 3 registrars for voter verification (requires 2/3 per voter).
- **Voting Systems**:
  - FPTP_Quorum: Winner-takes-all with >50% voter turnout required.
  - Proportional: Percentage-based vote distribution.
  - Instant Runoff: Ranked preferences with iterative elimination.
- **Security**: Voter ID hashing for privacy, one-vote-per-ID, replay attack protection.
- **Frontend**: Wallet connection, voter registration, dynamic voting forms, results visualization (bar/pie charts), admin/registrar dashboard.
- **Responsive Design**: Mobile-first UI with dark mode support.
- **Local Testing**: Compatible with Ganache for free, gas-free demonstrations.

## Requirements

- **Blockchain Tools**:
  - Ganache (for local testing) or an Ethereum testnet account (e.g., Sepolia) with test ETH.
  - MetaMask wallet for interacting with the dApp.
- **Development**:
  - Node.js or a simple HTTP server (e.g., VS Code Live Server) to host the frontend locally.
  - Remix IDE for deploying the smart contract.
- **Browser**: Modern browser (Chrome/Firefox) with MetaMask extension.

## Deployment

### Step 1: Deploy the Smart Contract

1. Open Remix IDE (https://remix.ethereum.org/) and create a new file `ElectionDecentralizedMaster.sol`. Paste the contract code.
2. Compile the contract using Solidity version ^0.8.0.
3. For local testing (recommended for demos):
   - Start Ganache and note the RPC URL (http://127.0.0.1:7545) and chain ID (1337).
   - In Remix, set Environment to `Dev` > ` Dev - Ganache Provider` with endpoint http://127.0.0.1:7545.
4. For testnet (e.g., Sepolia):
   - Set Environment to "Injected Provider - MetaMask" and switch MetaMask to Sepolia.
5. Deploy the contract:
   - In Constructor parameters: Select VotingSystem (0 for FPTP_Quorum, 1 for Proportionnel, 2 for InstantRunoff), provide arrays of 3 admin addresses and 3 registrar addresses (use Ganache accounts for local).
   - Confirm the transaction in MetaMask.
6. Copy the deployed contract address (e.g., 0x73cEb6D13a39e1D2f5A4a70fF3898c6a025DC740) and ABI (from Remix compilation details, paste into `abi.json`).

### Step 2: Set Up the Frontend

1. Clone or download the project repository.
2. Update `script.js`:
   - Set `contractAddress` to the deployed address.
   - Set `chainId` to 1337 (for Ganache) or 11155111 (for Sepolia).
3. Open `index.html` in a browser or use a local server (e.g., `npx http-server` or VS Code Live Server).
4. For production-like demo, host on Vercel/Netlify (free), but ensure users connect to the correct chain.

## Usage Guide

### Step 1: Connect Wallet

1. Open the website in a browser with MetaMask.
2. Click "Connect Wallet" and approve the connection.
3. The dashboard will display your status (e.g., "Awaiting verification (0/2) - Not yet voted").

### Step 2: Register as a Voter

1. In the "Voter Registration" section, enter your ID Card Number (any unique string, e.g., "ID123").
2. Submit – this is off-chain; share the ID with registrars.
3. Registrars (using their accounts) will validate in the admin dashboard.
4. Status updates automatically (polls every 5 seconds) to "Registered" after 2/3 registrar approvals.

### Step 3: Cast a Vote

1. Once registered and election is open, go to "Cast Your Vote".
2. Enter your ID Card Number for verification.
3. For FPTP_Quorum: Select one candidate from the cards.
4. Submit Vote – confirm the transaction in MetaMask.

### Step 4: View Results

1. Once the election is closed (by admins), the "Election Results" section appears.
2. It shows the system type, winner (or quorum failure message), and a chart (bar for FPTP/Instant Runoff, pie for Proportional).

### Step 5: Admin/Registrar Actions (for Authorized Users)

1. If your address is an admin or registrar, the "Administration Panel" appears after connection.
2. **Registrar**: Enter Voter Address and ID Card Number, then "Validate Voter" (repeat with 2/3 registrars).
3. **Admin**: Click "Close Election" – requires 2/3 admins to propose and confirm.

## Troubleshooting

- **Connection Errors**: Ensure MetaMask is on the correct chain (Ganache: 1337). Check console for details.
- **Gas Errors**: Increase gas limit in Ganache settings (to 30,000,000) or add `{ gas: 5000000 }` in script.js for transactions.
- **BigInt Errors**: Ensure all BigInt values are converted to Number in script.js.
- **Polling Issues**: If status doesn't update, reload or check Ganache is running.

## Contributors

- Vinh-Trung THIEU
- BENTOUNES Yousr
